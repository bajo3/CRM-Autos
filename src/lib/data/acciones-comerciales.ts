import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { rel, type Rel } from "@/lib/rel";
import { formatARS, formatDate } from "@/lib/format";
import { mensajePostventa } from "@/lib/data/whatsapp";

export type Urgencia = "vencido" | "hoy" | "oportunidad";
export type TipoAccion = "seguimiento" | "presupuesto" | "credito" | "reserva" | "encargo" | "postventa" | "test_drive";

export type AccionItem = {
  key: string;
  refId: string;
  tipo: TipoAccion;
  urgencia: Urgencia;
  cliente: string;
  telefono: string | null;
  detalle: string;
  fecha: string | null;
  href: string;
  whatsappMsg: string | null;
};

const ORDEN_URGENCIA: Record<Urgencia, number> = { vencido: 0, hoy: 1, oportunidad: 2 };

const todayISO = () => new Date().toISOString().slice(0, 10);
const inDaysISO = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

type SeguimientoRow = {
  id: string; fecha: string; motivo: string | null; estado: string;
  cliente: Rel<{ nombre: string; apellido: string | null; telefono: string | null; whatsapp: string | null }>;
};
type PresupuestoRow = {
  id: string; validez: string | null; precio: number | null; estado: string;
  cliente: Rel<{ nombre: string; apellido: string | null; telefono: string | null; whatsapp: string | null }>;
  vehiculo: Rel<{ marca: string; modelo: string }>;
};
type CreditoRow = {
  id: string; cuota_actual: number; cantidad_cuotas: number; estado: string;
  venta: Rel<{
    cliente: Rel<{ nombre: string; apellido: string | null; telefono: string | null; whatsapp: string | null }>;
    vehiculo: Rel<{ marca: string; modelo: string }>;
  }>;
};
type ReservaRow = {
  id: string; vencimiento: string | null; monto_sena: number; estado: string;
  cliente: Rel<{ nombre: string; apellido: string | null; telefono: string | null; whatsapp: string | null }>;
  vehiculo: Rel<{ marca: string; modelo: string }>;
};
type EncargoRow = {
  id: string; marca_buscada: string | null; modelo_buscado: string | null; urgencia: string; estado: string;
  cliente: Rel<{ nombre: string; apellido: string | null; telefono: string | null; whatsapp: string | null }>;
};
type PostventaRow = {
  id: string; fecha_alerta: string; realizada: boolean;
  cliente: Rel<{ nombre: string; apellido: string | null; telefono: string | null; whatsapp: string | null }>;
};
type TestDriveRow = {
  id: string; fecha: string | null; hora: string | null; conductor_nombre: string | null; telefono: string | null;
  cliente: Rel<{ nombre: string; apellido: string | null; telefono: string | null; whatsapp: string | null }>;
  vehiculo: Rel<{ marca: string; modelo: string }>;
};

function nombreCompleto(c: { nombre: string; apellido: string | null } | null): string {
  if (!c) return "Cliente sin nombre";
  return `${c.nombre} ${c.apellido ?? ""}`.trim();
}

function tel(c: { telefono: string | null; whatsapp: string | null } | null): string | null {
  return c?.whatsapp || c?.telefono || null;
}

/**
 * Lista unificada y accionable de "a quién contactar hoy": seguimientos
 * vencidos/de hoy, presupuestos por vencer, créditos por terminar,
 * reservas por vencer y encargos urgentes. Deriva todo de tablas
 * existentes (sin migración), ordenada por urgencia.
 */
export async function getAccionesComerciales(): Promise<AccionItem[]> {
  const sb = createClient();
  const ctx = await getSessionContext();
  const empresaNombre = ctx?.empresa?.nombre ?? "nuestra agencia";
  const today = todayISO();
  const in3days = inDaysISO(3);

  const [segRes, presRes, credRes, resRes, encRes, postRes, tdRes] = await Promise.all([
    sb.from("seguimiento")
      .select("id,fecha,motivo,estado,cliente:cliente_id(nombre,apellido,telefono,whatsapp)")
      .in("estado", ["pendiente", "vencido"]).lte("fecha", today)
      .order("fecha").returns<SeguimientoRow[]>(),
    sb.from("presupuesto")
      .select("id,validez,precio,estado,cliente:cliente_id(nombre,apellido,telefono,whatsapp),vehiculo:vehiculo_id(marca,modelo)")
      .eq("estado", "enviado").not("validez", "is", null).lte("validez", in3days)
      .order("validez").returns<PresupuestoRow[]>(),
    sb.from("credito")
      .select("id,cuota_actual,cantidad_cuotas,estado,venta:venta_id(cliente:cliente_id(nombre,apellido,telefono,whatsapp),vehiculo:vehiculo_id(marca,modelo))")
      .in("estado", ["activo", "por_terminar"])
      .returns<CreditoRow[]>(),
    sb.from("reserva")
      .select("id,vencimiento,monto_sena,estado,cliente:cliente_id(nombre,apellido,telefono,whatsapp),vehiculo:vehiculo_id(marca,modelo)")
      .in("estado", ["activa", "vencida"])
      .order("vencimiento").returns<ReservaRow[]>(),
    sb.from("encargo")
      .select("id,marca_buscada,modelo_buscado,urgencia,estado,cliente:cliente_id(nombre,apellido,telefono,whatsapp)")
      .in("estado", ["buscando", "unidad_encontrada", "ofrecido"]).eq("urgencia", "alta")
      .returns<EncargoRow[]>(),
    sb.from("postventa")
      .select("id,fecha_alerta,realizada,cliente:cliente_id(nombre,apellido,telefono,whatsapp)")
      .eq("realizada", false).lte("fecha_alerta", in3days)
      .order("fecha_alerta").returns<PostventaRow[]>(),
    sb.from("test_drive")
      .select("id,fecha,hora,conductor_nombre,telefono,cliente:cliente_id(nombre,apellido,telefono,whatsapp),vehiculo:vehiculo_id(marca,modelo)")
      .eq("estado", "agendado").not("fecha", "is", null).lte("fecha", in3days)
      .order("fecha").returns<TestDriveRow[]>(),
  ]);

  const items: AccionItem[] = [];

  for (const s of segRes.data ?? []) {
    const c = rel(s.cliente);
    const urgencia: Urgencia = s.estado === "vencido" || s.fecha < today ? "vencido" : "hoy";
    items.push({
      key: `seguimiento-${s.id}`, refId: s.id, tipo: "seguimiento", urgencia,
      cliente: nombreCompleto(c), telefono: tel(c),
      detalle: s.motivo ? `Seguimiento: ${s.motivo}` : "Seguimiento pendiente",
      fecha: s.fecha, href: "/seguimientos",
      whatsappMsg: `¡Hola${c ? ` ${c.nombre}` : ""}! ¿Pudiste ver la info que te pasé? Cualquier duda quedo a disposición.`,
    });
  }

  for (const p of presRes.data ?? []) {
    const c = rel(p.cliente);
    const veh = rel(p.vehiculo);
    const urgencia: Urgencia = (p.validez as string) < today ? "vencido" : (p.validez === today ? "hoy" : "oportunidad");
    items.push({
      key: `presupuesto-${p.id}`, refId: p.id, tipo: "presupuesto", urgencia,
      cliente: nombreCompleto(c), telefono: tel(c),
      detalle: `Presupuesto ${veh ? `${veh.marca} ${veh.modelo} ` : ""}${p.precio ? `· ${formatARS(p.precio)} ` : ""}vence ${formatDate(p.validez)}`,
      fecha: p.validez, href: `/presupuestos/${p.id}`,
      whatsappMsg: `¡Hola${c ? ` ${c.nombre}` : ""}! Te escribo por el presupuesto${veh ? ` del ${veh.marca} ${veh.modelo}` : ""} que te envié — está por vencer. ¿Seguimos adelante?`,
    });
  }

  for (const cr of credRes.data ?? []) {
    const venta = rel(cr.venta);
    const c = venta ? rel(venta.cliente) : null;
    const veh = venta ? rel(venta.vehiculo) : null;
    const enAlerta = cr.estado === "por_terminar" || cr.cuota_actual >= cr.cantidad_cuotas - 1;
    if (!enAlerta) continue;
    items.push({
      key: `credito-${cr.id}`, refId: cr.id, tipo: "credito", urgencia: "oportunidad",
      cliente: nombreCompleto(c), telefono: tel(c),
      detalle: `Crédito ${veh ? `${veh.marca} ${veh.modelo} ` : ""}· cuota ${cr.cuota_actual}/${cr.cantidad_cuotas}`,
      fecha: null, href: `/creditos/${cr.id}`,
      whatsappMsg: `¡Hola${c ? ` ${c.nombre}` : ""}! Te escribo porque tu crédito está llegando a la última cuota. ¡Cualquier consulta, avisame!`,
    });
  }

  for (const r of resRes.data ?? []) {
    const c = rel(r.cliente);
    const veh = rel(r.vehiculo);
    const urgencia: Urgencia =
      r.estado === "vencida" || (r.vencimiento != null && r.vencimiento < today) ? "vencido"
        : r.vencimiento === today ? "hoy" : "oportunidad";
    items.push({
      key: `reserva-${r.id}`, refId: r.id, tipo: "reserva", urgencia,
      cliente: nombreCompleto(c), telefono: tel(c),
      detalle: `Reserva ${veh ? `${veh.marca} ${veh.modelo} ` : ""}· seña ${formatARS(r.monto_sena)}${r.vencimiento ? ` · vence ${formatDate(r.vencimiento)}` : ""}`,
      fecha: r.vencimiento, href: "/reservas",
      whatsappMsg: `¡Hola${c ? ` ${c.nombre}` : ""}! Te escribo por la reserva${veh ? ` del ${veh.marca} ${veh.modelo}` : ""} — quería coordinar los próximos pasos.`,
    });
  }

  for (const e of encRes.data ?? []) {
    const c = rel(e.cliente);
    items.push({
      key: `encargo-${e.id}`, refId: e.id, tipo: "encargo", urgencia: "oportunidad",
      cliente: nombreCompleto(c), telefono: tel(c),
      detalle: `Encargo urgente: ${e.marca_buscada ?? ""} ${e.modelo_buscado ?? ""}`.trim(),
      fecha: null, href: "/encargos",
      whatsappMsg: `¡Hola${c ? ` ${c.nombre}` : ""}! Te cuento que seguimos buscando la unidad que me pediste, cualquier novedad te aviso.`,
    });
  }

  for (const p of postRes.data ?? []) {
    const c = rel(p.cliente);
    const urgencia: Urgencia = p.fecha_alerta < today ? "vencido" : p.fecha_alerta === today ? "hoy" : "oportunidad";
    items.push({
      key: `postventa-${p.id}`, refId: p.id, tipo: "postventa", urgencia,
      cliente: nombreCompleto(c), telefono: tel(c),
      detalle: `Postventa: recontacto (${formatDate(p.fecha_alerta)})`,
      fecha: p.fecha_alerta, href: "/postventa",
      whatsappMsg: mensajePostventa(empresaNombre, c?.nombre),
    });
  }

  for (const t of tdRes.data ?? []) {
    const c = rel(t.cliente);
    const veh = rel(t.vehiculo);
    const urgencia: Urgencia = (t.fecha as string) < today ? "vencido" : t.fecha === today ? "hoy" : "oportunidad";
    const nombreConductor = t.conductor_nombre ?? (c ? nombreCompleto(c) : null);
    items.push({
      key: `test_drive-${t.id}`, refId: t.id, tipo: "test_drive", urgencia,
      cliente: nombreConductor ?? "Conductor sin nombre", telefono: t.telefono || tel(c),
      detalle: `Test drive ${veh ? `${veh.marca} ${veh.modelo} ` : ""}${t.hora ? `· ${t.hora.slice(0, 5)} ` : ""}· ${formatDate(t.fecha)}`,
      fecha: t.fecha, href: "/test-drive",
      whatsappMsg: `¡Hola${nombreConductor ? ` ${nombreConductor}` : ""}! Te confirmo el test drive${veh ? ` del ${veh.marca} ${veh.modelo}` : ""} para el ${formatDate(t.fecha)}.`,
    });
  }

  return items.sort((a, b) => {
    const u = ORDEN_URGENCIA[a.urgencia] - ORDEN_URGENCIA[b.urgencia];
    if (u !== 0) return u;
    if (a.fecha && b.fecha) return a.fecha.localeCompare(b.fecha);
    return 0;
  });
}
