import { createClient } from "@/lib/supabase/server";
import { rel, type Rel } from "@/lib/rel";
import { businessDateISO, currentMonthRangeISO, diffDaysISO } from "@/lib/date";
import { estaDisponible, estaEnVenta, estadoOperativo } from "@/lib/data/vehiculo-estado";
import { etiquetaMotivoPerdida, motivoPerdidaDe } from "@/lib/data/motivo-perdida";

type VentaRep = {
  id: string;
  fecha_venta: string;
  precio_final: number | null;
  forma_pago: string;
  vendedor_id: string | null;
  vehiculo_id: string | null;
  vehiculo: Rel<{ precio_costo: number | null; marca: string; modelo: string }>;
  vendedor: Rel<{ nombre: string; apellido: string }>;
};
type StockRep = { estado: string; precio_venta: number | null; precio_costo: number | null };
type GastoRep = { vehiculo_id: string; monto: number | null };
type ClienteEmbudo = { id: string; estado: string; vendedor_id: string | null; created_at: string };
type ActividadVendedor = { vendedor_id: string | null; created_at: string; estado: string };
type SeguimientoEmbudo = { vendedor_id: string | null; fecha: string; estado: string };
type ProfileEmbudo = { id: string; nombre: string; apellido: string; activo: boolean };
type PerdidaEmbudo = { observaciones: string | null };

export type RankingVendedor = {
  vendedor_id: string | null;
  nombre: string;
  cantidad: number;
  monto: number;
  margen: number | null;
  ventasSinCosto: number;
};
export type Reporte = {
  desde: string;
  hasta: string;
  ventas: { cantidad: number; monto: number };
  rentabilidad: { margenBruto: number | null; gastos: number; margenNeto: number | null; ventasSinCosto: number };
  porFormaPago: { forma: string; cantidad: number; monto: number }[];
  ranking: RankingVendedor[];
  embudo: {
    leads: number;
    contactados: number;
    seguimientosRealizados: number;
    testDrives: number;
    presupuestos: number;
    reservas: number;
    ventas: number;
    perdidos: number;
    motivosPerdida: { motivo: string; cantidad: number }[];
    porVendedor: {
      vendedorId: string;
      nombre: string;
      leads: number;
      contactados: number;
      presupuestos: number;
      presupuestosEnviados: number;
      presupuestosAceptados: number;
      seguimientosRealizados: number;
      ventas: number;
      pendientesVencidos: number;
      ultimaActividad: string | null;
      diasSinActividad: number | null;
    }[];
  };
  stock: {
    porEstado: { estado: string; cantidad: number }[];
    disponibles: number;
    valorInventario: number;
    capitalInvertidoConocido: number;
    unidadesSinCosto: number;
  };
};

/** Primer y último día del mes actual en ISO (yyyy-mm-dd). */
export function rangoMesActual(): { desde: string; hasta: string } {
  return currentMonthRangeISO();
}

/** Agrega las métricas del período. Todo pasa por RLS → solo la empresa actual. */
export async function getReporte(desde: string, hasta: string): Promise<Reporte> {
  const sb = createClient();
  const desdeTs = `${desde}T00:00:00`;
  const hastaTs = `${hasta}T23:59:59.999`;

  const [
    { data: ventas }, { data: stock }, { data: clientesEmbudo }, { data: presupuestosEmbudo },
    { data: seguimientosEmbudo }, { data: testDrivesEmbudo }, { data: reservasEmbudo },
    { data: perfiles }, { data: seguimientosVencidos }, { data: perdidasEmbudo },
  ] = await Promise.all([
    sb
      .from("venta")
      .select(
        "id,fecha_venta,precio_final,forma_pago,vendedor_id,vehiculo_id," +
          "vehiculo:vehiculo_id(precio_costo,marca,modelo)," +
          "vendedor:vendedor_id(nombre,apellido)",
      )
      .gte("fecha_venta", desde)
      .lte("fecha_venta", hasta)
      .order("fecha_venta", { ascending: false })
      .returns<VentaRep[]>(),
    sb.from("vehiculo").select("estado,precio_venta,precio_costo").returns<StockRep[]>(),
    sb.from("cliente").select("id,estado,vendedor_id,created_at")
      .gte("created_at", desdeTs).lte("created_at", hastaTs).returns<ClienteEmbudo[]>(),
    sb.from("presupuesto").select("vendedor_id,created_at,estado")
      .gte("created_at", desdeTs).lte("created_at", hastaTs).returns<ActividadVendedor[]>(),
    sb.from("seguimiento").select("vendedor_id,fecha,estado")
      .gte("fecha", desde).lte("fecha", hasta).returns<SeguimientoEmbudo[]>(),
    sb.from("test_drive").select("id", { count: "exact" }).gte("fecha", desde).lte("fecha", hasta),
    sb.from("reserva").select("id", { count: "exact" }).gte("fecha_reserva", desde).lte("fecha_reserva", hasta),
    sb.from("profile").select("id,nombre,apellido,activo").eq("activo", true).returns<ProfileEmbudo[]>(),
    sb.from("seguimiento").select("vendedor_id,fecha,estado").eq("estado", "vencido").returns<SeguimientoEmbudo[]>(),
    sb.from("cliente").select("observaciones").eq("estado", "perdido")
      .gte("updated_at", desdeTs).lte("updated_at", hastaTs).returns<PerdidaEmbudo[]>(),
  ]);

  const filas = ventas ?? [];

  // Gastos de los vehículos vendidos en el período (para el margen neto).
  const ventaVehIds = filas.map((v) => v.vehiculo_id).filter((id): id is string => Boolean(id));
  let gastos = 0;
  if (ventaVehIds.length > 0) {
    const { data: g } = await sb
      .from("gasto_vehiculo")
      .select("vehiculo_id,monto")
      .in("vehiculo_id", ventaVehIds)
      .returns<GastoRep[]>();
    gastos = (g ?? []).reduce((s, r) => s + (r.monto ?? 0), 0);
  }

  // Totales y agregaciones.
  let monto = 0;
  let margenBruto = 0;
  let ventasSinCosto = 0;
  const porForma = new Map<string, { cantidad: number; monto: number }>();
  const porVend = new Map<string, RankingVendedor>();

  for (const v of filas) {
    const precio = v.precio_final ?? 0;
    monto += precio;
    const veh = rel(v.vehiculo);
    const costo = veh?.precio_costo;
    const margen = costo == null ? null : precio - costo;
    if (margen == null) ventasSinCosto += 1;
    else margenBruto += margen;

    const f = porForma.get(v.forma_pago) ?? { cantidad: 0, monto: 0 };
    f.cantidad += 1;
    f.monto += precio;
    porForma.set(v.forma_pago, f);

    const key = v.vendedor_id ?? "—";
    const vend = rel(v.vendedor);
    const nombre = vend ? `${vend.nombre} ${vend.apellido}`.trim() || "Sin nombre" : "Sin asignar";
    const r = porVend.get(key) ?? {
      vendedor_id: v.vendedor_id,
      nombre,
      cantidad: 0,
      monto: 0,
      margen: 0,
      ventasSinCosto: 0,
    };
    r.cantidad += 1;
    r.monto += precio;
    if (margen == null) {
      r.margen = null;
      r.ventasSinCosto += 1;
    } else if (r.margen != null) {
      r.margen += margen;
    }
    porVend.set(key, r);
  }

  // Stock por estado + valor de inventario.
  const stockRows = stock ?? [];
  const estadoMap = new Map<string, number>();
  let disponibles = 0;
  let valorInventario = 0;
  let capitalInvertidoConocido = 0;
  let unidadesSinCosto = 0;
  for (const s of stockRows) {
    const estado = estadoOperativo(s.estado);
    estadoMap.set(estado, (estadoMap.get(estado) ?? 0) + 1);
    if (estaDisponible(s.estado)) disponibles += 1;
    if (estaEnVenta(s.estado)) {
      valorInventario += s.precio_venta ?? 0;
      if (s.precio_costo == null) unidadesSinCosto += 1;
      else capitalInvertidoConocido += s.precio_costo;
    }
  }

  const margenBrutoFinal = ventasSinCosto > 0 ? null : margenBruto;
  const leads = clientesEmbudo ?? [];
  const presupuestosPeriodo = presupuestosEmbudo ?? [];
  const seguimientosPeriodo = seguimientosEmbudo ?? [];
  const ventasActividad = filas.map((venta) => ({ vendedor_id: venta.vendedor_id, created_at: `${venta.fecha_venta}T12:00:00` }));
  const vendedores = (perfiles ?? []).map((perfil) => {
    const leadsVendedor = leads.filter((lead) => lead.vendedor_id === perfil.id);
    const presupuestosVendedor = presupuestosPeriodo.filter((item) => item.vendedor_id === perfil.id);
    const seguimientosVendedor = seguimientosPeriodo.filter((item) => item.vendedor_id === perfil.id);
    const ventasVendedor = filas.filter((venta) => venta.vendedor_id === perfil.id);
    const actividad = [
      ...leadsVendedor.map((item) => item.created_at),
      ...presupuestosVendedor.map((item) => item.created_at),
      ...seguimientosVendedor.filter((item) => item.estado === "realizado").map((item) => `${item.fecha}T12:00:00`),
      ...ventasActividad.filter((item) => item.vendedor_id === perfil.id).map((item) => item.created_at),
    ].sort().at(-1) ?? null;

    return {
      vendedorId: perfil.id,
      nombre: `${perfil.nombre} ${perfil.apellido}`.trim() || "Sin nombre",
      leads: leadsVendedor.length,
      contactados: leadsVendedor.filter((lead) => lead.estado !== "nuevo").length,
      presupuestos: presupuestosVendedor.length,
      presupuestosEnviados: presupuestosVendedor.filter((item) => item.estado === "enviado" || item.estado === "aceptado").length,
      presupuestosAceptados: presupuestosVendedor.filter((item) => item.estado === "aceptado").length,
      seguimientosRealizados: seguimientosVendedor.filter((item) => item.estado === "realizado").length,
      ventas: ventasVendedor.length,
      pendientesVencidos: (seguimientosVencidos ?? []).filter((item) => item.vendedor_id === perfil.id).length,
      ultimaActividad: actividad,
      diasSinActividad: actividad ? Math.max(0, diffDaysISO(actividad.slice(0, 10), businessDateISO())) : null,
    };
  }).filter((vendedor) =>
    vendedor.leads + vendedor.presupuestos + vendedor.seguimientosRealizados + vendedor.ventas + vendedor.pendientesVencidos > 0,
  ).sort((a, b) => b.ventas - a.ventas || b.presupuestos - a.presupuestos || b.leads - a.leads);
  const motivos = new Map<string, number>();
  for (const perdida of perdidasEmbudo ?? []) {
    const codigo = motivoPerdidaDe(perdida.observaciones) ?? "sin_especificar";
    const etiqueta = codigo === "sin_especificar" ? "Sin especificar" : etiquetaMotivoPerdida(codigo);
    motivos.set(etiqueta, (motivos.get(etiqueta) ?? 0) + 1);
  }

  return {
    desde,
    hasta,
    ventas: { cantidad: filas.length, monto },
    rentabilidad: {
      margenBruto: margenBrutoFinal,
      gastos,
      margenNeto: margenBrutoFinal == null ? null : margenBrutoFinal - gastos,
      ventasSinCosto,
    },
    porFormaPago: [...porForma.entries()]
      .map(([forma, x]) => ({ forma, ...x }))
      .sort((a, b) => b.monto - a.monto),
    ranking: [...porVend.values()].sort((a, b) => b.monto - a.monto),
    embudo: {
      leads: leads.length,
      contactados: leads.filter((lead) => lead.estado !== "nuevo").length,
      seguimientosRealizados: seguimientosPeriodo.filter((item) => item.estado === "realizado").length,
      testDrives: testDrivesEmbudo?.length ?? 0,
      presupuestos: presupuestosPeriodo.length,
      reservas: reservasEmbudo?.length ?? 0,
      ventas: filas.length,
      perdidos: perdidasEmbudo?.length ?? 0,
      motivosPerdida: [...motivos.entries()].map(([motivo, cantidad]) => ({ motivo, cantidad })).sort((a, b) => b.cantidad - a.cantidad),
      porVendedor: vendedores,
    },
    stock: {
      porEstado: [...estadoMap.entries()]
        .map(([estado, cantidad]) => ({ estado, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad),
      disponibles,
      valorInventario,
      capitalInvertidoConocido,
      unidadesSinCosto,
    },
  };
}
