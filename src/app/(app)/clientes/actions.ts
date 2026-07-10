"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { cancelarProgramadosDeCliente } from "@/lib/whatsapp/eventos";
import { businessDateISO } from "@/lib/date";
import { telefonoClienteValido } from "@/lib/whatsapp/telefono";

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
}).superRefine((data, ctx) => {
  if (!data.telefono?.trim() && !data.whatsapp?.trim() && !data.email?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["telefono"], message: "Cargá teléfono, WhatsApp o email para poder contactar al lead" });
  }
  for (const field of ["telefono", "whatsapp"] as const) {
    const value = data[field]?.trim();
    if (value && !telefonoClienteValido(value)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: "Ingresá un teléfono válido" });
    }
  }
});

export type FormState = { error?: string; fieldErrors?: Record<string, string> };
export type ClienteRapidoState = { error?: string; id?: string; label?: string };

function parseForm(formData: FormData) {
  return schema.safeParse(Object.fromEntries(formData));
}

function fieldErrors(e: z.ZodError) {
  const fe: Record<string, string> = {};
  for (const i of e.issues) fe[String(i.path[0])] = i.message;
  return fe;
}

async function buscarDuplicado(
  sb: ReturnType<typeof createClient>,
  empresaId: string,
  data: { email?: string; dni_cuit?: string; telefono?: string; whatsapp?: string },
  excluirId?: string,
) {
  const consultas = [];
  const base = () => {
    let query = sb.from("cliente").select("id,nombre,apellido").eq("empresa_id", empresaId);
    if (excluirId) query = query.neq("id", excluirId);
    return query;
  };
  if (data.email) consultas.push(base().eq("email", data.email).limit(1).maybeSingle<{ id: string; nombre: string; apellido: string | null }>());
  if (data.dni_cuit) consultas.push(base().eq("dni_cuit", data.dni_cuit).limit(1).maybeSingle<{ id: string; nombre: string; apellido: string | null }>());
  for (const value of new Set([data.telefono, data.whatsapp].filter(Boolean) as string[])) {
    consultas.push(base().or(`telefono.eq.${value},whatsapp.eq.${value}`).limit(1).maybeSingle<{ id: string; nombre: string; apellido: string | null }>());
  }
  if (consultas.length === 0) return null;
  const resultados = await Promise.all(consultas);
  return resultados.find((resultado) => resultado.data)?.data ?? null;
}

const clienteRapidoSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio"),
  apellido: z.string().trim().optional(),
  telefono: z.string().trim().optional(),
  whatsapp: z.string().trim().optional(),
  email: emptyToUndef(z.string().email("Email inválido")).optional(),
}).superRefine((data, ctx) => {
  if (!data.telefono && !data.whatsapp && !data.email) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Cargá teléfono, WhatsApp o email" });
  }
  for (const field of ["telefono", "whatsapp"] as const) {
    if (data[field] && !telefonoClienteValido(data[field]!)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: "Teléfono inválido" });
    }
  }
});

export async function crearClienteRapidoPresupuesto(
  _prev: ClienteRapidoState,
  formData: FormData,
): Promise<ClienteRapidoState> {
  const ctx = await getSessionContext();
  if (!ctx?.profile?.empresa_id) return { error: "Sesión inválida." };
  const parsed = clienteRapidoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisá los datos." };

  const sb = createClient();
  const duplicado = await buscarDuplicado(sb, ctx.profile.empresa_id, parsed.data);
  if (duplicado) {
    return { id: duplicado.id, label: `${duplicado.nombre} ${duplicado.apellido ?? ""}`.trim() };
  }

  const { data, error } = await sb.from("cliente").insert({
    empresa_id: ctx.profile.empresa_id,
    vendedor_id: ctx.profile.id,
    nombre: parsed.data.nombre,
    apellido: parsed.data.apellido || null,
    telefono: parsed.data.telefono || null,
    whatsapp: parsed.data.whatsapp || null,
    email: parsed.data.email || null,
    origen: "presencial",
    estado: "nuevo",
  }).select("id").single<{ id: string }>();
  if (error || !data) return { error: error?.message ?? "No se pudo crear el cliente." };
  revalidatePath("/clientes");
  return { id: data.id, label: `${parsed.data.nombre} ${parsed.data.apellido ?? ""}`.trim() };
}

export async function crearCliente(_prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await getSessionContext();
  if (!ctx?.profile?.empresa_id) return { error: "Sesión inválida." };

  const parsed = parseForm(formData);
  if (!parsed.success) return { error: "Revisá los campos.", fieldErrors: fieldErrors(parsed.error) };

  const sb = createClient();
  const duplicado = await buscarDuplicado(sb, ctx.profile.empresa_id, parsed.data);
  if (duplicado) {
    return { error: `Ya existe un cliente con esos datos: ${duplicado.nombre} ${duplicado.apellido ?? ""}`.trim() };
  }
  const { data, error } = await sb
    .from("cliente")
    .insert({ ...parsed.data, empresa_id: ctx.profile.empresa_id })
    .select("id")
    .single<{ id: string }>();
  if (error) return { error: `No se pudo guardar: ${error.message}` };

  revalidatePath("/clientes");
  redirect(`/clientes/${data.id}`);
}

const ESTADOS_FINALES = ["vendido", "reservado", "perdido"];

export async function actualizarCliente(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await getSessionContext();
  if (!ctx?.profile?.empresa_id) return { error: "Sesión inválida." };

  const parsed = parseForm(formData);
  if (!parsed.success) return { error: "Revisá los campos.", fieldErrors: fieldErrors(parsed.error) };

  const sb = createClient();
  const duplicado = await buscarDuplicado(sb, ctx.profile.empresa_id, parsed.data, id);
  if (duplicado) {
    return { error: `Ya existe otro cliente con esos datos: ${duplicado.nombre} ${duplicado.apellido ?? ""}`.trim() };
  }
  const { error } = await sb.from("cliente").update(parsed.data).eq("id", id);
  if (error) return { error: `No se pudo actualizar: ${error.message}` };

  if (ESTADOS_FINALES.includes(parsed.data.estado)) {
    await cancelarProgramadosDeCliente(sb, { empresaId: ctx.profile.empresa_id, clienteId: id });
  }

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
  const fecha = String(formData.get("fecha") ?? "").trim() || businessDateISO();
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
