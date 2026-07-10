import { createClient } from "@/lib/supabase/server";
import type { Rel } from "@/lib/rel";
import { estadoPorVencimiento } from "@/lib/data/vtv";
import { businessDateISO } from "@/lib/date";
import { ESTADOS_DISPONIBLES_DB } from "@/lib/data/vehiculo-estado";

type VtvRow = {
  id: string; vehiculo_id: string | null; patente: string | null; estado: string; fecha_vencimiento: string | null;
  vehiculo: Rel<{ marca: string; modelo: string }>;
};

/** Métricas y alertas del dashboard. Todo pasa por RLS → solo la empresa actual. */
export async function getDashboardData() {
  const sb = createClient();
  const today = businessDateISO();

  const [
    leadsNuevos, seguimientosHoy, seguimientosVencidos,
    vtvTodas, creditosPorTerminar, postventaPendiente,
    encargosActivos, autosDisponibles, autosReservados, autosVendidos,
    docPendiente, autosSinPublicar, autosControlVtv,
  ] = await Promise.all([
    sb.from("cliente").select("*", { count: "exact", head: true }).eq("estado", "nuevo"),
    sb.from("seguimiento").select("*", { count: "exact", head: true }).eq("fecha", today).eq("estado", "pendiente"),
    sb.from("seguimiento").select("*", { count: "exact", head: true }).eq("estado", "vencido"),
    // El estado de la VTV se deriva de fecha_vencimiento en cada render (no se
    // recalcula solo con el tiempo si se confía en la columna estática).
    sb.from("vtv")
      .select("id,vehiculo_id,patente,estado,fecha_vencimiento,vehiculo:vehiculo_id(marca,modelo)")
      .order("fecha_vencimiento").returns<VtvRow[]>(),
    sb.from("credito").select("*", { count: "exact", head: true }).eq("estado", "por_terminar"),
    sb.from("postventa").select("*", { count: "exact", head: true }).eq("realizada", false).lte("fecha_alerta", today),
    sb.from("encargo").select("*", { count: "exact", head: true }).in("estado", ["buscando", "unidad_encontrada", "ofrecido"]),
    sb.from("vehiculo").select("*", { count: "exact", head: true }).in("estado", [...ESTADOS_DISPONIBLES_DB] as never[]),
    sb.from("vehiculo").select("*", { count: "exact", head: true }).eq("estado", "reservado"),
    sb.from("vehiculo").select("*", { count: "exact", head: true }).eq("estado", "vendido"),
    sb.from("vehiculo").select("*", { count: "exact", head: true }).in("estado_documental", ["pendiente", "incompleto", "observado"]),
    sb.from("vehiculo").select("*", { count: "exact", head: true }).eq("publicado_web", false).eq("publicado_ml", false).neq("estado", "vendido"),
    sb.from("vehiculo").select("*", { count: "exact", head: true }).neq("estado", "vendido"),
  ]);

  const vtvConEstadoReal = (vtvTodas.data ?? []).map((v) => ({ ...v, estado: estadoPorVencimiento(v.fecha_vencimiento) }));
  const vtvAlertas = vtvConEstadoReal.filter((v) => v.estado === "por_vencer" || v.estado === "vencida");
  const vehiculosConVtv = new Set(vtvConEstadoReal.map((v) => v.vehiculo_id).filter(Boolean)).size;

  return {
    stats: {
      leadsNuevos: leadsNuevos.count ?? 0,
      seguimientosHoy: seguimientosHoy.count ?? 0,
      seguimientosVencidos: seguimientosVencidos.count ?? 0,
      vtvPorVencer: vtvConEstadoReal.filter((v) => v.estado === "por_vencer").length,
      vtvVencidas: vtvConEstadoReal.filter((v) => v.estado === "vencida").length,
      vtvSinCargar: Math.max(0, (autosControlVtv.count ?? 0) - vehiculosConVtv),
      creditosPorTerminar: creditosPorTerminar.count ?? 0,
      postventaPendiente: postventaPendiente.count ?? 0,
      encargosActivos: encargosActivos.count ?? 0,
      autosDisponibles: autosDisponibles.count ?? 0,
      autosReservados: autosReservados.count ?? 0,
      autosVendidos: autosVendidos.count ?? 0,
      docPendiente: docPendiente.count ?? 0,
      autosSinPublicar: autosSinPublicar.count ?? 0,
    },
    vtvAlertas,
  };
}
