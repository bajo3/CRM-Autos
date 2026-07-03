"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { generarPdf, type TipoDocumento, type DatosDocumento, type EmpresaDoc } from "@/lib/pdf/documento";
import { rel, type Rel } from "@/lib/rel";

type VentaDoc = {
  id: string; fecha_venta: string; precio_final: number | null; sena: number | null;
  saldo: number | null; forma_pago: string; observaciones: string | null;
  cliente_id: string | null; vehiculo_id: string | null;
  cliente: Rel<{ nombre: string; apellido: string | null; dni_cuit: string | null; localidad: string | null; telefono: string | null }>;
  vehiculo: Rel<{ marca: string; modelo: string; anio: number | null; patente: string | null; chasis: string | null; motor: string | null; color: string | null; kilometros: number | null }>;
};

/** Descarga el logo de la empresa (si tiene) para embeberlo en el PDF. */
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

/** Inserta el documento (numerado por trigger), genera el PDF y lo sube al Storage. */
async function crearDocumento(args: {
  tipo: TipoDocumento;
  datosBase: Omit<DatosDocumento, "numero" | "fecha">;
  cliente_id?: string | null;
  vehiculo_id?: string | null;
  venta_id?: string | null;
}): Promise<string> {
  const ctx = await getSessionContext();
  if (!ctx?.profile?.empresa_id) throw new Error("Sesión inválida.");
  if (!can(ctx.profile.rol, "documentos.generar")) throw new Error("Sin permiso para generar documentos.");

  const sb = createClient();

  const { data: doc, error } = await sb
    .from("documento_comercial")
    .insert({
      empresa_id: ctx.profile.empresa_id,
      tipo: args.tipo,
      cliente_id: args.cliente_id ?? null,
      vehiculo_id: args.vehiculo_id ?? null,
      venta_id: args.venta_id ?? null,
      datos: JSON.parse(JSON.stringify(args.datosBase)),
      created_by: ctx.profile.id,
    })
    .select("id,numero,fecha_emision")
    .single<{ id: string; numero: string; fecha_emision: string }>();
  if (error || !doc) throw new Error(`No se pudo crear el documento: ${error?.message}`);

  const empresa: EmpresaDoc = {
    nombre: ctx.empresa?.nombre ?? "Agencia",
    cuit: ctx.empresa?.cuit, telefono: ctx.empresa?.telefono, email: ctx.empresa?.email,
    direccion: ctx.empresa?.direccion, localidad: ctx.empresa?.localidad, provincia: ctx.empresa?.provincia,
    color_primario: ctx.empresa?.color_primario,
  };
  const logo = await cargarLogo(ctx.empresa?.logo_url);

  const datos: DatosDocumento = { ...args.datosBase, numero: doc.numero, fecha: doc.fecha_emision };
  const bytes = await generarPdf(args.tipo, datos, empresa, logo);

  const path = `${ctx.profile.empresa_id}/${doc.id}.pdf`;
  const { error: upErr } = await sb.storage
    .from("documentos")
    .upload(path, new Blob([bytes as unknown as BlobPart], { type: "application/pdf" }), { contentType: "application/pdf", upsert: true });
  if (upErr) throw new Error(`No se pudo guardar el PDF: ${upErr.message}`);

  await sb.from("documento_comercial").update({ pdf_url: path }).eq("id", doc.id);

  revalidatePath("/documentos");
  return doc.id;
}

/** Genera recibo de seña, recibo de pago o boleto a partir de una venta. */
export async function generarDocumentoVenta(ventaId: string, tipo: TipoDocumento): Promise<void> {
  const sb = createClient();
  const { data: v } = await sb
    .from("venta")
    .select("id,fecha_venta,precio_final,sena,saldo,forma_pago,observaciones,cliente_id,vehiculo_id,cliente:cliente_id(nombre,apellido,dni_cuit,localidad,telefono),vehiculo:vehiculo_id(marca,modelo,anio,patente,chasis,motor,color,kilometros)")
    .eq("id", ventaId)
    .maybeSingle<VentaDoc>();
  if (!v) throw new Error("Venta no encontrada.");

  const cli = rel(v.cliente);
  const veh = rel(v.vehiculo);
  const datosBase: Omit<DatosDocumento, "numero" | "fecha"> = {
    cliente: cli ? { nombre: `${cli.nombre} ${cli.apellido ?? ""}`.trim(), dni_cuit: cli.dni_cuit, localidad: cli.localidad, telefono: cli.telefono } : null,
    vehiculo: veh ?? null,
    precio_total: v.precio_final,
    sena: v.sena,
    saldo: v.saldo,
    forma_pago: v.forma_pago,
    observaciones: v.observaciones,
  };

  const id = await crearDocumento({
    tipo, datosBase, cliente_id: v.cliente_id, vehiculo_id: v.vehiculo_id, venta_id: v.id,
  });
  redirect(`/documentos/${id}/abrir`);
}

type ReservaDoc = {
  id: string; monto_sena: number; medio_pago: string | null; observaciones: string | null;
  cliente_id: string | null; vehiculo_id: string | null;
  cliente: Rel<{ nombre: string; apellido: string | null; dni_cuit: string | null; localidad: string | null; telefono: string | null }>;
  vehiculo: Rel<{ marca: string; modelo: string; anio: number | null; patente: string | null; chasis: string | null; motor: string | null; color: string | null; kilometros: number | null; precio_venta: number | null }>;
};

/** Genera el recibo de seña de una reserva (todavía sin venta cerrada). */
export async function generarReciboReserva(reservaId: string): Promise<void> {
  const sb = createClient();
  const { data: r } = await sb
    .from("reserva")
    .select("id,monto_sena,medio_pago,observaciones,cliente_id,vehiculo_id,cliente:cliente_id(nombre,apellido,dni_cuit,localidad,telefono),vehiculo:vehiculo_id(marca,modelo,anio,patente,chasis,motor,color,kilometros,precio_venta)")
    .eq("id", reservaId)
    .maybeSingle<ReservaDoc>();
  if (!r) throw new Error("Reserva no encontrada.");

  const cli = rel(r.cliente);
  const veh = rel(r.vehiculo);
  const precioTotal = veh?.precio_venta ?? null;
  const datosBase: Omit<DatosDocumento, "numero" | "fecha"> = {
    cliente: cli ? { nombre: `${cli.nombre} ${cli.apellido ?? ""}`.trim(), dni_cuit: cli.dni_cuit, localidad: cli.localidad, telefono: cli.telefono } : null,
    vehiculo: veh ?? null,
    precio_total: precioTotal,
    sena: r.monto_sena,
    saldo: precioTotal != null ? precioTotal - r.monto_sena : null,
    forma_pago: r.medio_pago,
    observaciones: r.observaciones,
  };

  const id = await crearDocumento({
    tipo: "recibo_sena", datosBase, cliente_id: r.cliente_id, vehiculo_id: r.vehiculo_id,
  });
  redirect(`/documentos/${id}/abrir`);
}

// ---------- Presupuesto (datos manuales) ----------
const emptyToUndef = <T extends z.ZodTypeAny>(s: T) =>
  z.union([s, z.literal("")]).transform((val) => (val === "" ? undefined : val));

const presupuestoSchema = z.object({
  cliente_id: emptyToUndef(z.string().uuid()).optional(),
  vehiculo_id: emptyToUndef(z.string().uuid()).optional(),
  precio: z.coerce.number().min(0),
  forma_pago: z.string().optional(),
  financiacion: z.string().optional(),
  permuta: z.string().optional(),
  validez: emptyToUndef(z.string()).optional(),
  observaciones: z.string().optional(),
});

export async function generarPresupuesto(formData: FormData): Promise<void> {
  const parsed = presupuestoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("Revisá los datos del presupuesto.");
  const d = parsed.data;

  const sb = createClient();
  let cliente = null as DatosDocumento["cliente"];
  let vehiculo = null as DatosDocumento["vehiculo"];

  if (d.cliente_id) {
    const { data } = await sb.from("cliente").select("nombre,apellido,dni_cuit,localidad,telefono").eq("id", d.cliente_id)
      .maybeSingle<{ nombre: string; apellido: string | null; dni_cuit: string | null; localidad: string | null; telefono: string | null }>();
    if (data) cliente = { nombre: `${data.nombre} ${data.apellido ?? ""}`.trim(), dni_cuit: data.dni_cuit, localidad: data.localidad, telefono: data.telefono };
  }
  if (d.vehiculo_id) {
    const { data } = await sb.from("vehiculo").select("marca,modelo,anio,patente,chasis,motor,color,kilometros").eq("id", d.vehiculo_id)
      .maybeSingle<NonNullable<DatosDocumento["vehiculo"]>>();
    if (data) vehiculo = data;
  }

  const datosBase: Omit<DatosDocumento, "numero" | "fecha"> = {
    cliente, vehiculo,
    precio_total: d.precio,
    forma_pago: d.forma_pago || null,
    financiacion: d.financiacion || null,
    permuta: d.permuta || null,
    validez: d.validez || null,
    observaciones: d.observaciones || null,
  };

  const id = await crearDocumento({
    tipo: "presupuesto", datosBase, cliente_id: d.cliente_id, vehiculo_id: d.vehiculo_id,
  });
  redirect(`/documentos/${id}/abrir`);
}

// ---------- Documentos de cliente: ficha_cliente, datero ----------
type ClienteDoc = {
  id: string; nombre: string; apellido: string | null; dni_cuit: string | null; localidad: string | null;
  telefono: string | null; email: string | null; estado: string | null; origen: string | null;
  presupuesto_aprox: number | null; observaciones: string | null;
  vendedor: Rel<{ nombre: string; apellido: string }>;
  vehiculo: Rel<{ id: string; marca: string; modelo: string; anio: number | null; patente: string | null }>;
};

export async function generarDocumentoCliente(clienteId: string, tipo: TipoDocumento): Promise<void> {
  const sb = createClient();
  const { data: c } = await sb
    .from("cliente")
    .select("id,nombre,apellido,dni_cuit,localidad,telefono,email,estado,origen,presupuesto_aprox,observaciones,vendedor:vendedor_id(nombre,apellido),vehiculo:vehiculo_interes_id(id,marca,modelo,anio,patente)")
    .eq("id", clienteId)
    .maybeSingle<ClienteDoc>();
  if (!c) throw new Error("Cliente no encontrado.");

  const vend = rel(c.vendedor);
  const veh = rel(c.vehiculo);
  const datosBase: Omit<DatosDocumento, "numero" | "fecha"> = {
    cliente: {
      nombre: `${c.nombre} ${c.apellido ?? ""}`.trim(), dni_cuit: c.dni_cuit, localidad: c.localidad,
      telefono: c.telefono, email: c.email, estado: c.estado, origen: c.origen,
      vendedor: vend ? `${vend.nombre} ${vend.apellido}`.trim() : null, presupuesto: c.presupuesto_aprox,
    },
    vehiculo: veh ?? null,
    permuta: null,
    observaciones: c.observaciones,
  };

  const id = await crearDocumento({ tipo, datosBase, cliente_id: c.id, vehiculo_id: veh?.id ?? null });
  redirect(`/documentos/${id}/abrir`);
}

// ---------- Documentos de vehículo: ficha_vehiculo ----------
type VehiculoDoc = {
  marca: string; modelo: string; version: string | null; anio: number | null; patente: string | null;
  chasis: string | null; motor: string | null; color: string | null; kilometros: number | null;
  combustible: string | null; transmision: string | null; precio_venta: number | null; estado: string | null;
  ubicacion: string | null; fecha_ingreso: string | null; observaciones: string | null;
};

export async function generarDocumentoVehiculo(vehiculoId: string, tipo: TipoDocumento): Promise<void> {
  const sb = createClient();
  const { data: v } = await sb
    .from("vehiculo")
    .select("marca,modelo,version,anio,patente,chasis,motor,color,kilometros,combustible,transmision,precio_venta,estado,ubicacion,fecha_ingreso,observaciones")
    .eq("id", vehiculoId)
    .maybeSingle<VehiculoDoc>();
  if (!v) throw new Error("Vehículo no encontrado.");

  const datosBase: Omit<DatosDocumento, "numero" | "fecha"> = {
    vehiculo: {
      marca: v.marca, modelo: v.modelo, version: v.version, anio: v.anio, patente: v.patente,
      chasis: v.chasis, motor: v.motor, color: v.color, kilometros: v.kilometros,
      combustible: v.combustible, transmision: v.transmision, precio: v.precio_venta, estado: v.estado,
      ubicacion: v.ubicacion, fecha_ingreso: v.fecha_ingreso,
    },
    observaciones: v.observaciones,
  };

  const id = await crearDocumento({ tipo, datosBase, vehiculo_id: vehiculoId });
  redirect(`/documentos/${id}/abrir`);
}

// ---------- Autorización de test drive (datos del conductor) ----------
const testDriveSchema = z.object({
  cliente_id: emptyToUndef(z.string().uuid()).optional(),
  vehiculo_id: emptyToUndef(z.string().uuid()).optional(),
  conductor_nombre: z.string().min(1),
  conductor_dni: z.string().optional(),
  conductor_licencia: z.string().optional(),
  fecha: emptyToUndef(z.string()).optional(),
  observaciones: z.string().optional(),
});

export async function generarAutorizacionTestDrive(formData: FormData): Promise<void> {
  const parsed = testDriveSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("Cargá al menos el nombre del conductor.");
  const d = parsed.data;

  const sb = createClient();
  let vehiculo = null as DatosDocumento["vehiculo"];
  if (d.vehiculo_id) {
    const { data } = await sb.from("vehiculo").select("marca,modelo,anio,patente").eq("id", d.vehiculo_id)
      .maybeSingle<{ marca: string; modelo: string; anio: number | null; patente: string | null }>();
    if (data) vehiculo = data;
  }

  const datosBase: Omit<DatosDocumento, "numero" | "fecha"> = {
    vehiculo,
    autorizado: { nombre: d.conductor_nombre, dni: d.conductor_dni || null, licencia: d.conductor_licencia || null },
    fecha_evento: d.fecha || null,
    observaciones: d.observaciones || null,
  };

  const id = await crearDocumento({
    tipo: "autorizacion_test_drive", datosBase, cliente_id: d.cliente_id, vehiculo_id: d.vehiculo_id,
  });
  redirect(`/documentos/${id}/abrir`);
}
