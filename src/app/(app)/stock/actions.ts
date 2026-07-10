"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { registrarCambio } from "@/lib/data/historial";
import { calcularVtv, type VtvCalendario } from "@/lib/data/vtv";
import { ESTADOS_OPERATIVOS } from "@/lib/data/vehiculo-estado";

const optionalNumber = z
  .union([z.coerce.number(), z.literal("")])
  .transform((v) => (v === "" ? undefined : v))
  .optional();

const schema = z.object({
  marca: z.string().min(1, "La marca es obligatoria"),
  modelo: z.string().min(1, "El modelo es obligatorio"),
  version: z.string().optional(),
  anio: optionalNumber,
  kilometros: optionalNumber,
  patente: z.string().optional(),
  color: z.string().optional(),
  combustible: z.enum(["nafta", "diesel", "gnc", "hibrido", "electrico"]).optional().or(z.literal("").transform(() => undefined)),
  transmision: z.enum(["manual", "automatica"]).optional().or(z.literal("").transform(() => undefined)),
  precio_venta: optionalNumber,
  precio_costo: optionalNumber,
  estado: z.enum(ESTADOS_OPERATIVOS),
  titularidad: z.enum(["propio", "consignado", "tercero"]),
  ubicacion: z.string().optional(),
  observaciones: z.string().optional(),
});

export type FormState = { error?: string; fieldErrors?: Record<string, string> };

function parse(formData: FormData) {
  return schema.safeParse(Object.fromEntries(formData));
}

function buildFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) fieldErrors[String(issue.path[0])] = issue.message;
  return fieldErrors;
}

export async function crearAuto(_prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await getSessionContext();
  if (!ctx?.profile?.empresa_id) return { error: "Sesión inválida." };
  if (!can(ctx.profile.rol, "stock.crear")) return { error: "No tenés permiso para crear autos." };

  const parsed = parse(formData);
  if (!parsed.success) return { error: "Revisá los campos marcados.", fieldErrors: buildFieldErrors(parsed.error) };

  const sb = createClient();
  const { data, error } = await sb
    .from("vehiculo")
    .insert({ ...parsed.data, empresa_id: ctx.profile.empresa_id })
    .select("id")
    .single<{ id: string }>();

  if (error) return { error: `No se pudo guardar: ${error.message}` };

  // VTV preguntada en el alta: "sí" calcula el estado real desde la fecha
  // cargada; "no"/"no sé" queda pendiente de control (no se adivina fecha).
  const vtvTiene = String(formData.get("vtv_tiene") ?? "");
  if (vtvTiene === "si" || vtvTiene === "no" || vtvTiene === "no_se") {
    const fechaManual = vtvTiene === "si" ? String(formData.get("vtv_fecha_vencimiento") ?? "").trim() || null : null;
    const calendario = (ctx.empresa?.vtv_calendario ?? null) as VtvCalendario | null;
    const calc = vtvTiene === "si"
      ? calcularVtv(parsed.data.patente ?? null, calendario, fechaManual)
      : { ultimo_digito: null, mes_sugerido: null, fecha_vencimiento: null, estado: "pendiente" as const };

    await sb.from("vtv").insert({
      empresa_id: ctx.profile.empresa_id,
      vehiculo_id: data.id,
      patente: parsed.data.patente ?? null,
      ultimo_digito: calc.ultimo_digito,
      jurisdiccion: ctx.empresa?.provincia || "Buenos Aires",
      mes_sugerido: calc.mes_sugerido,
      fecha_vencimiento: calc.fecha_vencimiento,
      estado: calc.estado,
    });
  }

  revalidatePath("/stock");
  revalidatePath("/vtv");
  redirect(`/stock/${data.id}`);
}

export async function actualizarAuto(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await getSessionContext();
  if (!ctx?.profile?.empresa_id) return { error: "Sesión inválida." };
  if (!can(ctx.profile.rol, "stock.editar")) return { error: "No tenés permiso para editar autos." };

  const parsed = parse(formData);
  if (!parsed.success) return { error: "Revisá los campos marcados.", fieldErrors: buildFieldErrors(parsed.error) };

  const sb = createClient();

  // Estado previo para auditar cambios clave (precio / estado).
  const { data: antes } = await sb
    .from("vehiculo")
    .select("precio_venta,estado")
    .eq("id", id)
    .maybeSingle<{ precio_venta: number | null; estado: string }>();

  const { error } = await sb.from("vehiculo").update(parsed.data).eq("id", id);
  if (error) return { error: `No se pudo actualizar: ${error.message}` };

  if (antes) {
    const nuevoPrecio = parsed.data.precio_venta;
    if (nuevoPrecio != null && Number(nuevoPrecio) !== Number(antes.precio_venta ?? 0)) {
      await registrarCambio({
        accion: "cambio_precio",
        entidad: "vehiculo",
        entidad_id: id,
        valor_anterior: { precio_venta: antes.precio_venta },
        valor_nuevo: { precio_venta: nuevoPrecio },
        ctxEmpresaId: ctx.profile.empresa_id,
        ctxUsuarioId: ctx.profile.id,
      });
    }
    if (parsed.data.estado && parsed.data.estado !== antes.estado) {
      await registrarCambio({
        accion: "cambio_estado",
        entidad: "vehiculo",
        entidad_id: id,
        valor_anterior: { estado: antes.estado },
        valor_nuevo: { estado: parsed.data.estado },
        ctxEmpresaId: ctx.profile.empresa_id,
        ctxUsuarioId: ctx.profile.id,
      });
    }
  }

  revalidatePath("/stock");
  revalidatePath(`/stock/${id}`);
  redirect(`/stock/${id}`);
}

export async function eliminarAuto(id: string): Promise<void> {
  const ctx = await getSessionContext();
  if (!can(ctx?.profile?.rol, "stock.eliminar")) throw new Error("Sin permiso para eliminar.");

  const sb = createClient();
  const { data: antes } = await sb
    .from("vehiculo")
    .select("marca,modelo,patente")
    .eq("id", id)
    .maybeSingle<{ marca: string; modelo: string; patente: string | null }>();

  const { error } = await sb.from("vehiculo").delete().eq("id", id);
  if (error) throw new Error(error.message);

  await registrarCambio({
    accion: "baja_vehiculo",
    entidad: "vehiculo",
    entidad_id: id,
    valor_anterior: antes ?? null,
    ctxEmpresaId: ctx?.profile?.empresa_id,
    ctxUsuarioId: ctx?.profile?.id,
  });

  revalidatePath("/stock");
  redirect("/stock");
}
