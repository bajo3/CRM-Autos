"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";

const uuid = z.union([z.string().uuid(), z.literal("")]).transform((v) => (v === "" ? undefined : v)).optional();

const schema = z.object({
  cliente_id: uuid,
  vehiculo_id: uuid,
  monto_sena: z.coerce.number().min(0),
  fecha_reserva: z.string().min(1, "Fecha obligatoria"),
  vencimiento: z.union([z.string(), z.literal("")]).transform((v) => (v === "" ? undefined : v)).optional(),
  medio_pago: z.enum(["efectivo", "transferencia", "credito", "mixto", "permuta"]).optional().or(z.literal("").transform(() => undefined)),
  observaciones: z.string().optional(),
});

export type FormState = { error?: string };

export async function crearReserva(_prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await getSessionContext();
  if (!ctx?.profile?.empresa_id) return { error: "Sesión inválida." };

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Revisá los campos." };
  const d = parsed.data;

  const sb = createClient();
  const { error } = await sb.from("reserva").insert({
    empresa_id: ctx.profile.empresa_id,
    cliente_id: d.cliente_id,
    vehiculo_id: d.vehiculo_id,
    monto_sena: d.monto_sena,
    fecha_reserva: d.fecha_reserva,
    vencimiento: d.vencimiento,
    medio_pago: d.medio_pago,
    estado: "activa",
    observaciones: d.observaciones,
  });
  if (error) return { error: `No se pudo guardar: ${error.message}` };

  // Marcar el vehículo como reservado
  if (d.vehiculo_id) {
    await sb.from("vehiculo").update({ estado: "reservado" }).eq("id", d.vehiculo_id);
  }

  revalidatePath("/reservas");
  revalidatePath("/stock");
  redirect("/reservas");
}

/**
 * Cancela una reserva (el cliente se bajó del trato) y libera el
 * vehículo a "disponible" si seguía marcado como reservado por esta
 * reserva.
 */
export async function cancelarReserva(id: string): Promise<void> {
  const sb = createClient();
  const { data: r } = await sb.from("reserva").select("vehiculo_id, estado").eq("id", id).maybeSingle<{ vehiculo_id: string | null; estado: string }>();
  if (!r) throw new Error("Reserva no encontrada.");
  if (r.estado !== "activa") throw new Error("Solo se pueden cancelar reservas activas.");

  const { error } = await sb.from("reserva").update({ estado: "caida" }).eq("id", id);
  if (error) throw new Error(error.message);

  if (r.vehiculo_id) {
    await sb.from("vehiculo").update({ estado: "disponible" }).eq("id", r.vehiculo_id).eq("estado", "reservado");
  }

  revalidatePath("/reservas");
  revalidatePath("/stock");
}
