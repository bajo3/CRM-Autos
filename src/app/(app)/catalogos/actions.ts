"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { generarCatalogoPdf, type VehiculoCat, type EmpresaCat } from "@/lib/pdf/catalogo";

type VehRow = {
  id: string; marca: string; modelo: string; version: string | null; anio: number | null;
  kilometros: number | null; combustible: string | null; transmision: string | null;
  color: string | null; precio_venta: number | null;
};

async function fetchBytes(url: string | null | undefined): Promise<Uint8Array | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer());
  } catch {
    return null;
  }
}

export async function generarCatalogo(formData: FormData): Promise<void> {
  const ctx = await getSessionContext();
  if (!ctx?.profile?.empresa_id) throw new Error("Sesión inválida.");
  if (!can(ctx.profile.rol, "catalogo.generar")) throw new Error("Sin permiso para generar catálogos.");

  const nombre = String(formData.get("nombre") ?? "").trim() || "Catálogo de stock";
  const ids = formData.getAll("vehiculo_ids").map(String).filter(Boolean);
  if (ids.length === 0) throw new Error("Elegí al menos un vehículo.");

  const sb = createClient();

  const { data: vehiculos } = await sb
    .from("vehiculo")
    .select("id,marca,modelo,version,anio,kilometros,combustible,transmision,color,precio_venta")
    .in("id", ids)
    .order("created_at", { ascending: false })
    .returns<VehRow[]>();
  if (!vehiculos || vehiculos.length === 0) throw new Error("No se encontraron los vehículos.");

  // Foto principal (o la primera) de cada unidad.
  const { data: fotos } = await sb
    .from("foto_vehiculo")
    .select("vehiculo_id,url,es_principal")
    .in("vehiculo_id", ids)
    .order("es_principal", { ascending: false })
    .returns<{ vehiculo_id: string; url: string; es_principal: boolean }[]>();
  const fotoPorVeh = new Map<string, string>();
  for (const f of fotos ?? []) if (!fotoPorVeh.has(f.vehiculo_id)) fotoPorVeh.set(f.vehiculo_id, f.url);

  const items: VehiculoCat[] = await Promise.all(
    vehiculos.map(async (v) => ({
      marca: v.marca, modelo: v.modelo, version: v.version, anio: v.anio,
      kilometros: v.kilometros, combustible: v.combustible, transmision: v.transmision,
      color: v.color, precio_venta: v.precio_venta,
      fotoBytes: await fetchBytes(fotoPorVeh.get(v.id)),
    })),
  );

  const empresa: EmpresaCat = {
    nombre: ctx.empresa?.nombre ?? "Agencia",
    telefono: ctx.empresa?.telefono, email: ctx.empresa?.email,
    direccion: ctx.empresa?.direccion, localidad: ctx.empresa?.localidad, provincia: ctx.empresa?.provincia,
    color_primario: ctx.empresa?.color_primario,
  };

  // Registro primero (para nombrar el archivo con su id).
  const { data: cat, error } = await sb
    .from("catalogo_pdf")
    .insert({
      empresa_id: ctx.profile.empresa_id,
      nombre,
      filtros: {},
      vehiculo_ids: ids,
      created_by: ctx.profile.id,
    })
    .select("id")
    .single<{ id: string }>();
  if (error || !cat) throw new Error(`No se pudo crear el catálogo: ${error?.message}`);

  const bytes = await generarCatalogoPdf(empresa, items, {
    titulo: `${nombre} · ${items.length} unidad(es)`,
    fecha: new Date().toISOString().slice(0, 10),
  });

  const path = `${ctx.profile.empresa_id}/${cat.id}.pdf`;
  const { error: upErr } = await sb.storage
    .from("catalogos")
    .upload(path, new Blob([bytes as unknown as BlobPart], { type: "application/pdf" }), {
      contentType: "application/pdf", upsert: true,
    });
  if (upErr) throw new Error(`No se pudo guardar el PDF: ${upErr.message}`);

  const { data: pub } = sb.storage.from("catalogos").getPublicUrl(path);
  await sb.from("catalogo_pdf").update({ pdf_url: pub.publicUrl }).eq("id", cat.id);

  revalidatePath("/catalogos");
  redirect("/catalogos");
}

export async function eliminarCatalogo(id: string): Promise<void> {
  const ctx = await getSessionContext();
  if (!ctx?.profile?.empresa_id) throw new Error("Sesión inválida.");
  if (!can(ctx.profile.rol, "catalogo.generar")) throw new Error("Sin permiso.");

  const sb = createClient();
  await sb.storage.from("catalogos").remove([`${ctx.profile.empresa_id}/${id}.pdf`]);
  const { error } = await sb.from("catalogo_pdf").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/catalogos");
}
