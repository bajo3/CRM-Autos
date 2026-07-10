import { createClient } from "@/lib/supabase/server";
import { rel, type Rel } from "@/lib/rel";
import { currentMonthRangeISO } from "@/lib/date";
import { estaDisponible, estaEnVenta, estadoOperativo } from "@/lib/data/vehiculo-estado";

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

  const [{ data: ventas }, { data: stock }] = await Promise.all([
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
