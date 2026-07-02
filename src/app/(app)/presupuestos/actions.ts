"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { generarPdf, type DatosDocumento, type EmpresaDoc } from "@/lib/pdf/documento";
import { rel, type Rel } from "@/lib/rel";
import { calcularSaldo, ESTADO_VALUES, type FormaPago, type EstadoPresupuesto } from "./lib";

export type FormState = { error?: string };

const num = z
  .union([z.coerce.number(), z.literal("")])
  .transform((v) => (v === "" || Number.isNaN(v as number) ? null : (v as number)))
  .nullable()
  .optional();
const text = z
  .union([z.string(), z.literal("")])
  .transform((v) => (v ? String(v).trim() : null))
  .nullable()
  .optional();

const schema = z.object({
  cliente_id: z.string().uuid().or(z.literal("")).transform((v) => v || null),
  vehiculo_id: z.string().uuid().or(z.literal("")).transform((v) => v || null),
  precio: z.coerce.number().min(0, "El precio no puede ser negativo"),
  anticipo: num,
  bonificacion: num,
  gastos: num,
  cantidad_cuotas: num,
  valor_cuota: num,
  forma_pago: z.enum(["efectivo", "transferencia", "credito", "mixto", "permuta", ""]).transform((v) => (v ? (v as FormaPago) : null)),
  financiacion: text,
  permuta: text,
  validez: text,
  observaciones: text,
});

/** Crea un presupuesto en estado borrador y abre su ficha. */
export async function crearPresupuesto(_prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await getSessionContext();
  if (!ctx?.profile?.empresa_id) return { error: "Sesión inválida." };
  if (!can(ctx.profile.rol, "documentos.generar")) return { error: "No tenés permiso para crear presupuestos." };

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisá los datos." };
  const d = parsed.data;

  const sb = createClient();
  const { data: nuevo, error } = await sb
    .from("presupuesto")
    .insert({
      empresa_id: ctx.profile.empresa_id,
      vendedor_id: ctx.profile.id,
      cliente_id: d.cliente_id,
      vehiculo_id: d.vehiculo_id,
      precio: d.precio,
      anticipo: d.anticipo,
      bonificacion: d.bonificacion,
      gastos: d.gastos,
      cantidad_cuotas: d.cantidad_cuotas,
      valor_cuota: d.valor_cuota,
      forma_pago: d.forma_pago,
      financiacion: d.financiacion,
      permuta: d.permuta,
      validez: d.validez,
      observaciones: d.observaciones,
    })
    .select("id")
    .single<{ id: string }>();
  if (error || !nuevo) return { error: `No se pudo crear el presupuesto: ${error?.message}` };

  revalidatePath("/presupuestos");
  redirect(`/presupuestos/${nuevo.id}`);
}

type PresupuestoFull = {
  id: string; empresa_id: string; precio: number | null; anticipo: number | null;
  bonificacion: number | null; gastos: number | null; cantidad_cuotas: number | null;
  valor_cuota: number | null; forma_pago: FormaPago | null; financiacion: string | null;
  permuta: string | null; validez: string | null; observaciones: string | null;
  cliente: Rel<{ nombre: string; apellido: string | null; dni_cuit: string | null; localidad: string | null; telefono: string | null }>;
  vehiculo: Rel<{ marca: string; modelo: string; anio: number | null; patente: string | null; kilometros: number | null; color: string | null }>;
};

const SELECT_FULL =
  "id,empresa_id,precio,anticipo,bonificacion,gastos,cantidad_cuotas,valor_cuota,forma_pago,financiacion,permuta,validez,observaciones," +
  "cliente:cliente_id(nombre,apellido,dni_cuit,localidad,telefono),vehiculo:vehiculo_id(marca,modelo,anio,patente,kilometros,color)";

async function cargarLogo(url: string | null | undefined): Promise<Uint8Array | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer());
  } catch {
    return null;
  }
}

/** Genera (o regenera) el PDF del presupuesto y lo guarda en Storage. */
export async function generarPdfPresupuesto(id: string): Promise<void> {
  const ctx = await getSessionContext();
  if (!ctx?.profile?.empresa_id) throw new Error("Sesión inválida.");
  if (!can(ctx.profile.rol, "documentos.generar")) throw new Error("Sin permiso para generar el PDF.");

  const sb = createClient();
  const { data: p } = await sb.from("presupuesto").select(SELECT_FULL).eq("id", id).maybeSingle<PresupuestoFull>();
  if (!p) throw new Error("Presupuesto no encontrado.");

  const cli = rel(p.cliente);
  const veh = rel(p.vehiculo);
  const datos: DatosDocumento = {
    numero: id.slice(0, 8).toUpperCase(),
    fecha: new Date().toISOString().slice(0, 10),
    cliente: cli ? { nombre: `${cli.nombre} ${cli.apellido ?? ""}`.trim(), dni_cuit: cli.dni_cuit, localidad: cli.localidad, telefono: cli.telefono } : null,
    vehiculo: veh ?? null,
    precio_total: p.precio,
    anticipo: p.anticipo,
    bonificacion: p.bonificacion,
    gastos: p.gastos,
    cantidad_cuotas: p.cantidad_cuotas,
    valor_cuota: p.valor_cuota,
    saldo: p.precio != null ? calcularSaldo(p.precio, p.anticipo, p.bonificacion) : null,
    forma_pago: p.forma_pago,
    financiacion: p.financiacion,
    permuta: p.permuta,
    validez: p.validez,
    observaciones: p.observaciones,
  };

  const empresa: EmpresaDoc = {
    nombre: ctx.empresa?.nombre ?? "Agencia",
    cuit: ctx.empresa?.cuit, telefono: ctx.empresa?.telefono, email: ctx.empresa?.email,
    direccion: ctx.empresa?.direccion, localidad: ctx.empresa?.localidad, provincia: ctx.empresa?.provincia,
  };
  const logo = await cargarLogo(ctx.empresa?.logo_url);
  const bytes = await generarPdf("presupuesto", datos, empresa, logo);

  const path = `${p.empresa_id}/presupuesto-${id}.pdf`;
  const { error: upErr } = await sb.storage
    .from("documentos")
    .upload(path, new Blob([bytes as unknown as BlobPart], { type: "application/pdf" }), { contentType: "application/pdf", upsert: true });
  if (upErr) throw new Error(`No se pudo guardar el PDF: ${upErr.message}`);

  await sb.from("presupuesto").update({ pdf_url: path, updated_at: new Date().toISOString() }).eq("id", id);
  revalidatePath(`/presupuestos/${id}`);
  revalidatePath("/presupuestos");
  redirect(`/presupuestos/${id}/abrir`);
}

/** Cambia el estado comercial del presupuesto. */
export async function cambiarEstadoPresupuesto(id: string, estado: string): Promise<void> {
  const ctx = await getSessionContext();
  if (!ctx?.profile?.empresa_id) throw new Error("Sesión inválida.");
  if (!can(ctx.profile.rol, "documentos.generar")) throw new Error("Sin permiso.");
  if (!ESTADO_VALUES.includes(estado as EstadoPresupuesto)) throw new Error("Estado inválido.");

  const sb = createClient();
  const { error } = await sb
    .from("presupuesto")
    .update({ estado: estado as EstadoPresupuesto, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/presupuestos/${id}`);
  revalidatePath("/presupuestos");
}

/** Duplica un presupuesto como nuevo borrador y abre su ficha. */
export async function duplicarPresupuesto(id: string): Promise<void> {
  const ctx = await getSessionContext();
  if (!ctx?.profile?.empresa_id) throw new Error("Sesión inválida.");
  if (!can(ctx.profile.rol, "documentos.generar")) throw new Error("Sin permiso.");

  const sb = createClient();
  const { data: orig } = await sb
    .from("presupuesto")
    .select("cliente_id,vehiculo_id,precio,anticipo,bonificacion,gastos,cantidad_cuotas,valor_cuota,forma_pago,financiacion,permuta,validez,observaciones")
    .eq("id", id)
    .maybeSingle();
  if (!orig) throw new Error("Presupuesto no encontrado.");

  const { data: nuevo, error } = await sb
    .from("presupuesto")
    .insert({ ...orig, empresa_id: ctx.profile.empresa_id, vendedor_id: ctx.profile.id, estado: "borrador", pdf_url: null })
    .select("id")
    .single<{ id: string }>();
  if (error || !nuevo) throw new Error(`No se pudo duplicar: ${error?.message}`);

  revalidatePath("/presupuestos");
  redirect(`/presupuestos/${nuevo.id}`);
}
