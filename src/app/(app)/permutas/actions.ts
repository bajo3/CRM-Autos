"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";

const uuid = z.union([z.string().uuid(), z.literal("")]).transform((v) => (v === "" ? undefined : v)).optional();
const text = z.union([z.string(), z.literal("")]).transform((v) => (v === "" ? undefined : v)).optional();
const num = z.union([z.coerce.number(), z.literal("")]).transform((v) => (v === "" ? undefined : v)).optional();

const schema = z.object({
  cliente_id: uuid,
  marca: text,
  modelo: text,
  anio: num,
  kilometros: num,
  patente: text,
  estado_general: text,
  valor_pretendido: num,
  observaciones: text,
});

export type FormState = { error?: string };

export async function crearPermuta(_prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await getSessionContext();
  if (!ctx?.profile?.empresa_id) return { error: "Sesión inválida." };

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Revisá los campos." };
  const d = parsed.data;

  const sb = createClient();
  const { error } = await sb.from("permuta").insert({
    empresa_id: ctx.profile.empresa_id,
    cliente_id: d.cliente_id,
    marca: d.marca,
    modelo: d.modelo,
    anio: d.anio,
    kilometros: d.kilometros,
    patente: d.patente,
    estado_general: d.estado_general,
    valor_pretendido: d.valor_pretendido,
    observaciones: d.observaciones,
    estado: "pendiente",
  });
  if (error) return { error: `No se pudo guardar: ${error.message}` };

  revalidatePath("/permutas");
  redirect("/permutas");
}

type EstadoTasacion = "pendiente" | "tasado" | "aceptado" | "rechazado" | "en_negociacion";

/** Registra el valor tasado y recalcula la diferencia contra lo pretendido. */
export async function tasarPermuta(id: string, formData: FormData): Promise<void> {
  const valorTasado = Number(formData.get("valor_tasado") ?? 0);
  if (!Number.isFinite(valorTasado) || valorTasado < 0) throw new Error("Valor tasado inválido.");

  const sb = createClient();
  const { data: p } = await sb.from("permuta").select("valor_pretendido").eq("id", id).maybeSingle<{ valor_pretendido: number | null }>();
  const diferencia = p?.valor_pretendido != null ? p.valor_pretendido - valorTasado : null;

  const { error } = await sb.from("permuta").update({
    valor_tasado: valorTasado,
    diferencia,
    estado: "tasado",
  }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/permutas");
}

export async function cambiarEstadoPermuta(id: string, estado: EstadoTasacion): Promise<void> {
  const sb = createClient();
  const { error } = await sb.from("permuta").update({ estado }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/permutas");
}

type PermutaVehiculo = {
  marca: string | null; modelo: string | null; anio: number | null;
  kilometros: number | null; patente: string | null; valor_tasado: number | null;
};

/** Ingresa el vehículo tomado en parte de pago al stock, en estado "en preparación". */
export async function ingresarPermutaAStock(id: string): Promise<void> {
  const ctx = await getSessionContext();
  if (!ctx?.profile?.empresa_id) throw new Error("Sesión inválida.");
  if (!can(ctx.profile.rol, "stock.crear")) throw new Error("Sin permiso para cargar stock.");

  const sb = createClient();
  const { data: p } = await sb.from("permuta").select("marca,modelo,anio,kilometros,patente,valor_tasado").eq("id", id).maybeSingle<PermutaVehiculo>();
  if (!p) throw new Error("Permuta no encontrada.");
  if (!p.marca || !p.modelo) throw new Error("La permuta no tiene marca/modelo cargados.");

  const { error } = await sb.from("vehiculo").insert({
    empresa_id: ctx.profile.empresa_id,
    marca: p.marca,
    modelo: p.modelo,
    anio: p.anio,
    kilometros: p.kilometros,
    patente: p.patente,
    precio_costo: p.valor_tasado,
    estado: "en_preparacion",
    titularidad: "propio",
  });
  if (error) throw new Error(`No se pudo cargar el vehículo: ${error.message}`);

  revalidatePath("/permutas");
  revalidatePath("/stock");
}
