"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";

const uuid = z.union([z.string().uuid(), z.literal("")]).transform((v) => (v === "" ? undefined : v)).optional();
const text = z.union([z.string(), z.literal("")]).transform((v) => (v === "" ? undefined : v)).optional();

const schema = z.object({
  cliente_id: uuid,
  vehiculo_id: uuid,
  fecha: z.string().min(1, "Fecha obligatoria"),
  hora: text,
  conductor_nombre: z.string().min(1, "El nombre del conductor es obligatorio"),
  dni: text,
  licencia: text,
  telefono: text,
  obs_previas: text,
});

export type FormState = { error?: string };

export async function crearTestDrive(_prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await getSessionContext();
  if (!ctx?.profile?.empresa_id) return { error: "Sesión inválida." };

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisá los campos." };
  const d = parsed.data;

  const sb = createClient();
  const { error } = await sb.from("test_drive").insert({
    empresa_id: ctx.profile.empresa_id,
    cliente_id: d.cliente_id,
    vehiculo_id: d.vehiculo_id,
    fecha: d.fecha,
    hora: d.hora,
    conductor_nombre: d.conductor_nombre,
    dni: d.dni,
    licencia: d.licencia,
    telefono: d.telefono,
    obs_previas: d.obs_previas,
    estado: "agendado",
  });
  if (error) return { error: `No se pudo agendar: ${error.message}` };

  revalidatePath("/test-drive");
  redirect("/test-drive");
}

type EstadoTestDrive = "agendado" | "realizado" | "cancelado" | "no_asistio";

/** Cambia el estado de un test drive agendado (realizado / cancelado / no asistió). */
export async function cambiarEstadoTestDrive(id: string, estado: EstadoTestDrive): Promise<void> {
  const sb = createClient();
  const { error } = await sb.from("test_drive").update({ estado }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/test-drive");
  revalidatePath("/");
}
