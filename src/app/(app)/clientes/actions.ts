"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";

const emptyToUndef = <T extends z.ZodTypeAny>(s: T) =>
  z.union([s, z.literal("")]).transform((v) => (v === "" ? undefined : v));

const schema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  apellido: z.string().optional(),
  telefono: z.string().optional(),
  whatsapp: z.string().optional(),
  email: emptyToUndef(z.string().email("Email inválido")).optional(),
  dni_cuit: z.string().optional(),
  localidad: z.string().optional(),
  origen: z.enum(["whatsapp", "instagram", "facebook", "mercadolibre", "web", "referido", "presencial", "otro"]),
  estado: z.enum(["nuevo", "contactado", "interesado", "agendo_visita", "visito_agencia", "pidio_financiacion", "reservado", "vendido", "perdido"]),
  vendedor_id: emptyToUndef(z.string().uuid()).optional(),
  vehiculo_interes_id: emptyToUndef(z.string().uuid()).optional(),
  presupuesto_aprox: z.union([z.coerce.number(), z.literal("")]).transform((v) => (v === "" ? undefined : v)).optional(),
  proximo_seguimiento: emptyToUndef(z.string()).optional(),
  fecha_nacimiento: emptyToUndef(z.string()).optional(),
  observaciones: z.string().optional(),
});

export type FormState = { error?: string; fieldErrors?: Record<string, string> };

function parseForm(formData: FormData) {
  return schema.safeParse(Object.fromEntries(formData));
}

function fieldErrors(e: z.ZodError) {
  const fe: Record<string, string> = {};
  for (const i of e.issues) fe[String(i.path[0])] = i.message;
  return fe;
}

export async function crearCliente(_prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await getSessionContext();
  if (!ctx?.profile?.empresa_id) return { error: "Sesión inválida." };

  const parsed = parseForm(formData);
  if (!parsed.success) return { error: "Revisá los campos.", fieldErrors: fieldErrors(parsed.error) };

  const sb = createClient();
  const { data, error } = await sb
    .from("cliente")
    .insert({ ...parsed.data, empresa_id: ctx.profile.empresa_id })
    .select("id")
    .single<{ id: string }>();
  if (error) return { error: `No se pudo guardar: ${error.message}` };

  revalidatePath("/clientes");
  redirect(`/clientes/${data.id}`);
}

export async function actualizarCliente(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await getSessionContext();
  if (!ctx?.profile?.empresa_id) return { error: "Sesión inválida." };

  const parsed = parseForm(formData);
  if (!parsed.success) return { error: "Revisá los campos.", fieldErrors: fieldErrors(parsed.error) };

  const sb = createClient();
  const { error } = await sb.from("cliente").update(parsed.data).eq("id", id);
  if (error) return { error: `No se pudo actualizar: ${error.message}` };

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  redirect(`/clientes/${id}`);
}

// Registrar una consulta (relación cliente <-> auto).
export async function registrarConsulta(clienteId: string, formData: FormData): Promise<void> {
  const ctx = await getSessionContext();
  if (!ctx?.profile?.empresa_id) throw new Error("Sesión inválida.");
  const vehiculoId = String(formData.get("vehiculo_id") ?? "");
  if (!vehiculoId) return;

  const sb = createClient();
  const { error } = await sb.from("consulta").insert({
    cliente_id: clienteId,
    vehiculo_id: vehiculoId,
    empresa_id: ctx.profile.empresa_id,
    pendiente: true,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/clientes/${clienteId}`);
}

// Registrar un contacto ya realizado (queda en el historial cronológico).
export async function registrarContacto(clienteId: string, formData: FormData): Promise<void> {
  const ctx = await getSessionContext();
  if (!ctx?.profile?.empresa_id) throw new Error("Sesión inválida.");

  const motivo = String(formData.get("motivo") ?? "").trim();
  const notas = String(formData.get("notas") ?? "").trim();
  const fecha = String(formData.get("fecha") ?? "").trim() || new Date().toISOString().slice(0, 10);
  if (!motivo && !notas) return;

  const sb = createClient();
  const { error } = await sb.from("seguimiento").insert({
    cliente_id: clienteId,
    empresa_id: ctx.profile.empresa_id,
    vendedor_id: ctx.profile.id,
    fecha,
    motivo: motivo || "Contacto",
    notas: notas || null,
    estado: "realizado",
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/clientes/${clienteId}`);
}

// Agendar un seguimiento desde la ficha del cliente.
export async function agendarSeguimiento(clienteId: string, formData: FormData): Promise<void> {
  const ctx = await getSessionContext();
  if (!ctx?.profile?.empresa_id) throw new Error("Sesión inválida.");

  const fecha = String(formData.get("fecha") ?? "");
  const motivo = String(formData.get("motivo") ?? "");
  if (!fecha) return;

  const sb = createClient();
  const { error } = await sb.from("seguimiento").insert({
    cliente_id: clienteId,
    empresa_id: ctx.profile.empresa_id,
    vendedor_id: ctx.profile.id,
    fecha,
    motivo: motivo || null,
    estado: "pendiente",
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/clientes/${clienteId}`);
  revalidatePath("/seguimientos");
}
