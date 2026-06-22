"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { calcularVtv, type VtvCalendario } from "@/lib/data/vtv";

// ---------- Gastos ----------
const gastoSchema = z.object({
  tipo: z.enum([
    "lavado", "detailing", "mecanica", "cubiertas", "bateria", "gestoria",
    "verificacion_policial", "vtv", "publicidad", "traslado", "reparaciones", "otros",
  ]),
  concepto: z.string().optional(),
  monto: z.coerce.number().min(0),
  responsable: z.string().optional(),
});

export async function agregarGasto(vehiculoId: string, formData: FormData): Promise<void> {
  const ctx = await getSessionContext();
  if (!ctx?.profile?.empresa_id) throw new Error("Sesión inválida.");
  if (!can(ctx.profile.rol, "stock.editar")) throw new Error("Sin permiso.");

  const parsed = gastoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("Datos de gasto inválidos.");

  const sb = createClient();
  const { error } = await sb.from("gasto_vehiculo").insert({
    ...parsed.data,
    vehiculo_id: vehiculoId,
    empresa_id: ctx.profile.empresa_id,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/stock/${vehiculoId}`);
}

export async function eliminarGasto(vehiculoId: string, gastoId: string): Promise<void> {
  const sb = createClient();
  const { error } = await sb.from("gasto_vehiculo").delete().eq("id", gastoId);
  if (error) throw new Error(error.message);
  revalidatePath(`/stock/${vehiculoId}`);
}

// ---------- Fotos (la subida al Storage ocurre en el cliente) ----------
export async function registrarFoto(
  vehiculoId: string,
  url: string,
  esPrincipal: boolean,
): Promise<void> {
  const ctx = await getSessionContext();
  if (!ctx?.profile?.empresa_id) throw new Error("Sesión inválida.");

  const sb = createClient();
  const { error } = await sb.from("foto_vehiculo").insert({
    vehiculo_id: vehiculoId,
    empresa_id: ctx.profile.empresa_id,
    url,
    es_principal: esPrincipal,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/stock/${vehiculoId}`);
}

export async function eliminarFoto(vehiculoId: string, fotoId: string, path: string): Promise<void> {
  const sb = createClient();
  await sb.storage.from("vehiculos").remove([path]);
  const { error } = await sb.from("foto_vehiculo").delete().eq("id", fotoId);
  if (error) throw new Error(error.message);
  revalidatePath(`/stock/${vehiculoId}`);
}

export async function marcarPrincipal(vehiculoId: string, fotoId: string): Promise<void> {
  const sb = createClient();
  await sb.from("foto_vehiculo").update({ es_principal: false }).eq("vehiculo_id", vehiculoId);
  const { error } = await sb.from("foto_vehiculo").update({ es_principal: true }).eq("id", fotoId);
  if (error) throw new Error(error.message);
  revalidatePath(`/stock/${vehiculoId}`);
}

// ---------- VTV ----------
// Carga la VTV del vehículo calculando mes sugerido y vencimiento desde la
// patente + calendario de la empresa. Si se carga una fecha a mano, manda.
export async function crearVtv(vehiculoId: string, formData: FormData): Promise<void> {
  const ctx = await getSessionContext();
  if (!ctx?.profile?.empresa_id) throw new Error("Sesión inválida.");
  if (!can(ctx.profile.rol, "stock.editar")) throw new Error("Sin permiso.");

  const patente = String(formData.get("patente") ?? "").trim() || null;
  const fechaManual = String(formData.get("fecha_vencimiento") ?? "").trim() || null;
  const jurisdiccion = String(formData.get("jurisdiccion") ?? "").trim() || ctx.empresa?.provincia || "Buenos Aires";

  const calendario = (ctx.empresa?.vtv_calendario ?? null) as VtvCalendario | null;
  const calc = calcularVtv(patente, calendario, fechaManual);

  if (!calc.fecha_vencimiento) {
    throw new Error("Cargá una patente con dígito o un vencimiento manual.");
  }

  const sb = createClient();
  const { error } = await sb.from("vtv").insert({
    empresa_id: ctx.profile.empresa_id,
    vehiculo_id: vehiculoId,
    patente,
    ultimo_digito: calc.ultimo_digito,
    jurisdiccion,
    mes_sugerido: calc.mes_sugerido,
    fecha_vencimiento: calc.fecha_vencimiento,
    estado: calc.estado,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/stock/${vehiculoId}`);
  revalidatePath("/vtv");
}

// ---------- Documentación del vehículo ----------
export async function guardarEstadoDocumental(
  vehiculoId: string,
  estado: "completo" | "incompleto" | "pendiente" | "observado",
): Promise<void> {
  const ctx = await getSessionContext();
  if (!can(ctx?.profile?.rol, "stock.editar")) throw new Error("Sin permiso.");

  const sb = createClient();
  const { error } = await sb.from("vehiculo").update({ estado_documental: estado }).eq("id", vehiculoId);
  if (error) throw new Error(error.message);
  revalidatePath(`/stock/${vehiculoId}`);
}
