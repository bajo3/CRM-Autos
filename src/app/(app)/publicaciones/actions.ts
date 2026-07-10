"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database.types";
import { getSessionContext } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { businessDateISO } from "@/lib/date";
import { estadoOperativo } from "@/lib/data/vehiculo-estado";
import { urlAutorizacion } from "@/lib/mercadolibre/oauth";
import { tokenValido, obtenerCuenta } from "@/lib/mercadolibre/cuenta";
import { mlGet, mlSend } from "@/lib/mercadolibre/client";
import {
  construirItem,
  predecirCategoria,
  tituloItem,
  estadoDesdeML,
  type VehiculoML,
} from "@/lib/mercadolibre/item";

async function ctxConPermiso() {
  const ctx = await getSessionContext();
  if (!ctx?.profile?.empresa_id) throw new Error("Sesión inválida.");
  if (!can(ctx.profile.rol, "mercadolibre.publicar")) {
    throw new Error("Sin permiso para gestionar publicaciones.");
  }
  return ctx;
}

function slugify(s: string): string {
  const from = "áàäâãéèëêíìïîóòöôõúùüûñç";
  const to = "aaaaaeeeeiiiiooooouuuunc";
  let r = s.toLowerCase();
  for (let i = 0; i < from.length; i++) r = r.split(from[i]).join(to[i]);
  return r.replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// ---------- Conexión OAuth ----------

export async function conectarMercadoLibre(): Promise<void> {
  const ctx = await ctxConPermiso();
  const url = urlAutorizacion(ctx.profile!.empresa_id!);
  redirect(url);
}

export async function desconectarMercadoLibre(): Promise<void> {
  const ctx = await ctxConPermiso();
  const sb = createClient();
  await sb.from("ml_cuenta").delete().eq("empresa_id", ctx.profile!.empresa_id!);
  revalidatePath("/publicaciones");
}

// ---------- Canales internos (web / redes) ----------

export async function togglePublicarWeb(vehiculoId: string, publicar: boolean): Promise<void> {
  const ctx = await ctxConPermiso();
  const sb = createClient();

  const patch: Database["public"]["Tables"]["vehiculo"]["Update"] = {
    publicado_web: publicar,
  };
  const { data: v } = await sb
    .from("vehiculo")
    .select("marca,modelo,anio,slug_publico,estado")
    .eq("id", vehiculoId)
    .maybeSingle<{ marca: string; modelo: string; anio: number | null; slug_publico: string | null; estado: string }>();
  if (v) {
    patch.estado = estadoOperativo(v.estado) as Database["public"]["Enums"]["estado_vehiculo"];
    if (publicar && !v.slug_publico) {
      patch.slug_publico = `${slugify(`${v.marca}-${v.modelo}-${v.anio ?? ""}`)}-${vehiculoId.slice(0, 6)}`;
    }
  }

  await sb.from("vehiculo").update(patch).eq("id", vehiculoId);
  revalidatePath("/publicaciones");
  if (ctx.empresa?.slug) revalidatePath(`/p/${ctx.empresa.slug}`);
}

export async function togglePublicarRedes(vehiculoId: string, publicar: boolean): Promise<void> {
  await ctxConPermiso();
  const sb = createClient();
  await sb.from("vehiculo").update({ publicado_redes: publicar }).eq("id", vehiculoId);
  revalidatePath("/publicaciones");
}

// ---------- MercadoLibre (API real) ----------

const ML_FIELDS =
  "id,marca,modelo,version,anio,kilometros,precio_venta,combustible,transmision,color";

/** Guarda/actualiza la fila de publicacion del canal ML y los flags del vehículo. */
async function guardarPubML(
  sb: ReturnType<typeof createClient>,
  empresaId: string,
  vehiculoId: string,
  campos: {
    estado: "borrador" | "publicado" | "pausado" | "vendido";
    ml_item_id?: string | null;
    permalink?: string | null;
    titulo?: string | null;
    precio?: number | null;
    mensaje?: string | null;
  },
) {
  await sb.from("publicacion").upsert(
    {
      empresa_id: empresaId,
      vehiculo_id: vehiculoId,
      canal: "mercadolibre",
      estado: campos.estado,
      ml_item_id: campos.ml_item_id ?? null,
      permalink: campos.permalink ?? null,
      link: campos.permalink ?? null,
      titulo: campos.titulo ?? null,
      precio: campos.precio ?? null,
      mensaje: campos.mensaje ?? null,
      fecha_update: businessDateISO(),
    },
    { onConflict: "vehiculo_id,canal" },
  );
  await sb
    .from("vehiculo")
    .update({
      publicado_ml: campos.estado === "publicado",
      ml_link: campos.permalink ?? null,
      ml_estado: campos.estado,
    })
    .eq("id", vehiculoId);
}

export async function publicarEnML(vehiculoId: string): Promise<void> {
  const ctx = await ctxConPermiso();
  const empresaId = ctx.profile!.empresa_id!;
  const sb = createClient();

  const token = await tokenValido(empresaId);
  if (!token) throw new Error("Conectá tu cuenta de MercadoLibre antes de publicar.");

  const { data: v } = await sb
    .from("vehiculo")
    .select(ML_FIELDS)
    .eq("id", vehiculoId)
    .maybeSingle<VehiculoML & { id: string }>();
  if (!v) throw new Error("Vehículo no encontrado.");

  const { data: fotos } = await sb
    .from("foto_vehiculo")
    .select("url,es_principal")
    .eq("vehiculo_id", vehiculoId)
    .order("es_principal", { ascending: false })
    .returns<{ url: string; es_principal: boolean }[]>();
  const urls = (fotos ?? []).map((f) => f.url);

  const titulo = tituloItem(v);
  try {
    const categoryId = await predecirCategoria(titulo, token);
    const item = construirItem({ categoryId, titulo, v, fotos: urls });
    const creado = await mlSend<{ id: string; permalink: string; price: number }>(
      "POST",
      "/items",
      token,
      item,
    );
    await guardarPubML(sb, empresaId, vehiculoId, {
      estado: "publicado",
      ml_item_id: creado.id,
      permalink: creado.permalink,
      titulo,
      precio: creado.price ?? v.precio_venta,
      mensaje: null,
    });
  } catch (e) {
    // Guardamos el error de ML como borrador para que el usuario lo vea y lo iteremos.
    const msg = e instanceof Error ? e.message : "Error al publicar en MercadoLibre.";
    await guardarPubML(sb, empresaId, vehiculoId, {
      estado: "borrador",
      titulo,
      precio: v.precio_venta,
      mensaje: msg.slice(0, 500),
    });
  }

  revalidatePath("/publicaciones");
}

async function cambiarEstadoML(
  vehiculoId: string,
  status: "active" | "paused" | "closed",
): Promise<void> {
  const ctx = await ctxConPermiso();
  const empresaId = ctx.profile!.empresa_id!;
  const sb = createClient();

  const token = await tokenValido(empresaId);
  if (!token) throw new Error("Conectá tu cuenta de MercadoLibre.");

  const { data: pub } = await sb
    .from("publicacion")
    .select("ml_item_id,titulo,precio")
    .eq("vehiculo_id", vehiculoId)
    .eq("canal", "mercadolibre")
    .maybeSingle<{ ml_item_id: string | null; titulo: string | null; precio: number | null }>();
  if (!pub?.ml_item_id) throw new Error("Esta unidad no tiene una publicación de ML asociada.");

  try {
    const upd = await mlSend<{ permalink: string; status: string }>(
      "PUT",
      `/items/${pub.ml_item_id}`,
      token,
      { status },
    );
    await guardarPubML(sb, empresaId, vehiculoId, {
      estado: estadoDesdeML(upd.status ?? status),
      ml_item_id: pub.ml_item_id,
      permalink: upd.permalink,
      titulo: pub.titulo,
      precio: pub.precio,
      mensaje: null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al actualizar en MercadoLibre.";
    await sb
      .from("publicacion")
      .update({ mensaje: msg.slice(0, 500) })
      .eq("vehiculo_id", vehiculoId)
      .eq("canal", "mercadolibre");
  }
  revalidatePath("/publicaciones");
}

export async function pausarEnML(vehiculoId: string): Promise<void> {
  await cambiarEstadoML(vehiculoId, "paused");
}
export async function activarEnML(vehiculoId: string): Promise<void> {
  await cambiarEstadoML(vehiculoId, "active");
}
export async function finalizarEnML(vehiculoId: string): Promise<void> {
  await cambiarEstadoML(vehiculoId, "closed");
}

/** Refresca el estado de las publicaciones ML conocidas consultando la API. */
export async function sincronizarML(): Promise<void> {
  const ctx = await ctxConPermiso();
  const empresaId = ctx.profile!.empresa_id!;
  const sb = createClient();

  const cuenta = await obtenerCuenta(empresaId);
  if (!cuenta) throw new Error("Conectá tu cuenta de MercadoLibre.");
  const token = await tokenValido(empresaId);
  if (!token) throw new Error("No se pudo obtener un token válido de MercadoLibre.");

  const { data: pubs } = await sb
    .from("publicacion")
    .select("vehiculo_id,ml_item_id")
    .eq("canal", "mercadolibre")
    .not("ml_item_id", "is", null)
    .returns<{ vehiculo_id: string; ml_item_id: string }[]>();

  for (const p of pubs ?? []) {
    try {
      const it = await mlGet<{ status: string; permalink: string; price: number; title: string }>(
        `/items/${p.ml_item_id}?attributes=status,permalink,price,title`,
        token,
      );
      await guardarPubML(sb, empresaId, p.vehiculo_id, {
        estado: estadoDesdeML(it.status),
        ml_item_id: p.ml_item_id,
        permalink: it.permalink,
        titulo: it.title,
        precio: it.price,
        mensaje: null,
      });
    } catch {
      // si un ítem falla seguimos con el resto
    }
  }
  revalidatePath("/publicaciones");
}
