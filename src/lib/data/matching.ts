import { createClient } from "@/lib/supabase/server";
import { rel, type Rel } from "@/lib/rel";
import { ESTADOS_DISPONIBLES_DB } from "@/lib/data/vehiculo-estado";

type Vehiculo = {
  marca: string; modelo: string; anio: number | null;
  kilometros: number | null; precio_venta: number | null;
};

type EncargoRow = {
  id: string; marca_buscada: string | null; modelo_buscado: string | null;
  anio_min: number | null; anio_max: number | null; km_max: number | null;
  presupuesto_max: number | null; urgencia: string; estado: string;
  cliente: Rel<{ nombre: string; apellido: string; telefono: string | null }>;
};

const includesCI = (haystack: string, needle: string) =>
  haystack.toLowerCase().includes(needle.toLowerCase());

function esCompatible(
  e: { marca_buscada: string | null; modelo_buscado: string | null; anio_min: number | null; anio_max: number | null; km_max: number | null; presupuesto_max: number | null },
  vehiculo: Vehiculo,
): boolean {
  if (e.marca_buscada && !includesCI(vehiculo.marca, e.marca_buscada)) return false;
  if (e.modelo_buscado && !includesCI(vehiculo.modelo, e.modelo_buscado)) return false;
  if (e.anio_min != null && vehiculo.anio != null && vehiculo.anio < e.anio_min) return false;
  if (e.anio_max != null && vehiculo.anio != null && vehiculo.anio > e.anio_max) return false;
  if (e.km_max != null && vehiculo.kilometros != null && vehiculo.kilometros > e.km_max) return false;
  if (e.presupuesto_max != null && vehiculo.precio_venta != null && vehiculo.precio_venta > e.presupuesto_max) return false;
  return true;
}

/**
 * Encargos activos compatibles con un vehículo dado.
 * Filtra en JS: cada criterio del encargo solo restringe si está definido.
 */
export async function matchEncargosParaVehiculo(vehiculoId: string, vehiculo: Vehiculo) {
  const sb = createClient();
  const { data } = await sb
    .from("encargo")
    .select("id,marca_buscada,modelo_buscado,anio_min,anio_max,km_max,presupuesto_max,urgencia,estado,cliente:cliente_id(nombre,apellido,telefono)")
    .in("estado", ["buscando", "unidad_encontrada", "ofrecido"])
    .returns<EncargoRow[]>();

  return (data ?? []).filter((e) => esCompatible(e, vehiculo)).map((e) => ({ ...e, clienteData: rel(e.cliente) }));
}

export type VehiculoStockRow = {
  id: string; marca: string; modelo: string; anio: number | null;
  kilometros: number | null; precio_venta: number | null; patente: string | null;
};

/**
 * Para cada encargo activo, las unidades del stock disponible que coinciden.
 * Una sola consulta de stock disponible; el cruce se calcula en JS (sin N+1).
 */
export async function matchStockParaEncargos(
  encargos: { id: string; marca_buscada: string | null; modelo_buscado: string | null; anio_min: number | null; anio_max: number | null; km_max: number | null; presupuesto_max: number | null }[],
): Promise<Map<string, VehiculoStockRow[]>> {
  const sb = createClient();
  const { data: stock } = await sb
    .from("vehiculo")
    .select("id,marca,modelo,anio,kilometros,precio_venta,patente")
    .in("estado", [...ESTADOS_DISPONIBLES_DB] as never[])
    .returns<VehiculoStockRow[]>();

  const resultado = new Map<string, VehiculoStockRow[]>();
  for (const e of encargos) {
    const coincidencias = (stock ?? []).filter((v) => esCompatible(e, v));
    if (coincidencias.length > 0) resultado.set(e.id, coincidencias);
  }
  return resultado;
}
