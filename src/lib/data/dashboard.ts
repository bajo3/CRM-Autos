import { createClient } from "@/lib/supabase/server";
import type { Rel } from "@/lib/rel";

type ReservaRow = {
  id: string; vencimiento: string | null; monto_sena: number | null;
  cliente: Rel<{ nombre: string; apellido: string }>;
  vehiculo: Rel<{ marca: string; modelo: string }>;
};
type VtvRow = {
  id: string; patente: string | null; estado: string; fecha_vencimiento: string | null;
  vehiculo: Rel<{ marca: string; modelo: string }>;
};
type SegRow = {
  id: string; motivo: string | null; estado: string;
  cliente: Rel<{ nombre: string; apellido: string }>;
};

const todayISO = () => new Date().toISOString().slice(0, 10);
const inDaysISO = (n: number) =>
  new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

/** Métricas y alertas del dashboard. Todo pasa por RLS → solo la empresa actual. */
export async function getDashboardData() {
  const sb = createClient();
  const today = todayISO();
  const in2days = inDaysISO(2);

  const [
    leadsNuevos, seguimientosHoy, seguimientosVencidos,
    vtvPorVencer, vtvVencidas, creditosPorTerminar, postventaPendiente,
    encargosActivos, autosDisponibles, autosReservados, autosVendidos,
    docPendiente, autosSinPublicar,
  ] = await Promise.all([
    sb.from("cliente").select("*", { count: "exact", head: true }).eq("estado", "nuevo"),
    sb.from("seguimiento").select("*", { count: "exact", head: true }).eq("fecha", today).eq("estado", "pendiente"),
    sb.from("seguimiento").select("*", { count: "exact", head: true }).eq("estado", "vencido"),
    sb.from("vtv").select("*", { count: "exact", head: true }).eq("estado", "por_vencer"),
    sb.from("vtv").select("*", { count: "exact", head: true }).eq("estado", "vencida"),
    sb.from("credito").select("*", { count: "exact", head: true }).eq("estado", "por_terminar"),
    sb.from("postventa").select("*", { count: "exact", head: true }).eq("realizada", false).lte("fecha_alerta", today),
    sb.from("encargo").select("*", { count: "exact", head: true }).in("estado", ["buscando", "unidad_encontrada", "ofrecido"]),
    sb.from("vehiculo").select("*", { count: "exact", head: true }).eq("estado", "disponible"),
    sb.from("vehiculo").select("*", { count: "exact", head: true }).eq("estado", "reservado"),
    sb.from("vehiculo").select("*", { count: "exact", head: true }).eq("estado", "vendido"),
    sb.from("vehiculo").select("*", { count: "exact", head: true }).in("estado_documental", ["pendiente", "incompleto", "observado"]),
    sb.from("vehiculo").select("*", { count: "exact", head: true }).eq("publicado_web", false).eq("publicado_ml", false).neq("estado", "vendido"),
  ]);

  const [reservasPorVencer, vtvAlertas, seguimientosHoyList] = await Promise.all([
    sb.from("reserva")
      .select("id,vencimiento,monto_sena,cliente:cliente_id(nombre,apellido),vehiculo:vehiculo_id(marca,modelo)")
      .eq("estado", "activa").lte("vencimiento", in2days).order("vencimiento").returns<ReservaRow[]>(),
    sb.from("vtv")
      .select("id,patente,estado,fecha_vencimiento,vehiculo:vehiculo_id(marca,modelo)")
      .in("estado", ["por_vencer", "vencida"]).order("fecha_vencimiento").returns<VtvRow[]>(),
    sb.from("seguimiento")
      .select("id,motivo,estado,cliente:cliente_id(nombre,apellido)")
      .in("estado", ["pendiente", "vencido"]).lte("fecha", today).order("fecha").limit(8).returns<SegRow[]>(),
  ]);

  return {
    stats: {
      leadsNuevos: leadsNuevos.count ?? 0,
      seguimientosHoy: seguimientosHoy.count ?? 0,
      seguimientosVencidos: seguimientosVencidos.count ?? 0,
      vtvPorVencer: vtvPorVencer.count ?? 0,
      vtvVencidas: vtvVencidas.count ?? 0,
      creditosPorTerminar: creditosPorTerminar.count ?? 0,
      postventaPendiente: postventaPendiente.count ?? 0,
      encargosActivos: encargosActivos.count ?? 0,
      autosDisponibles: autosDisponibles.count ?? 0,
      autosReservados: autosReservados.count ?? 0,
      autosVendidos: autosVendidos.count ?? 0,
      docPendiente: docPendiente.count ?? 0,
      autosSinPublicar: autosSinPublicar.count ?? 0,
      reservasPorVencer: reservasPorVencer.data?.length ?? 0,
    },
    reservasPorVencer: reservasPorVencer.data ?? [],
    vtvAlertas: vtvAlertas.data ?? [],
    seguimientosHoyList: seguimientosHoyList.data ?? [],
  };
}
