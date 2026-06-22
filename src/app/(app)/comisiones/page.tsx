import { Trash2 } from "lucide-react";
import { getSessionContext } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { rel, type Rel } from "@/lib/rel";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatARS, formatDate, formatNumber } from "@/lib/format";
import { crearComision, marcarPagada, marcarPendiente, eliminarComision } from "./actions";

export const dynamic = "force-dynamic";

type VentaRow = {
  id: string;
  fecha_venta: string;
  precio_final: number | null;
  vendedor_id: string | null;
  vehiculo: Rel<{ marca: string; modelo: string; anio: number | null }>;
  vendedor: Rel<{ nombre: string; apellido: string }>;
};
type ComisionRow = {
  id: string;
  venta_id: string | null;
  tipo: string;
  valor: number | null;
  comision_calculada: number | null;
  estado: string;
  vendedor_id: string | null;
};

export default async function ComisionesPage() {
  const ctx = await getSessionContext();
  if (!can(ctx?.profile?.rol, "reportes.ver")) {
    return (
      <div>
        <PageHeader title="Comisiones" description="Liquidación de comisiones por vendedor." />
        <EmptyState title="Sin acceso" description="Tu rol no tiene permiso para ver comisiones." />
      </div>
    );
  }
  const puedeEditar = can(ctx?.profile?.rol, "margenes.ver");

  const sb = createClient();
  const [{ data: ventas }, { data: comisiones }] = await Promise.all([
    sb
      .from("venta")
      .select(
        "id,fecha_venta,precio_final,vendedor_id," +
          "vehiculo:vehiculo_id(marca,modelo,anio),vendedor:vendedor_id(nombre,apellido)",
      )
      .order("fecha_venta", { ascending: false })
      .limit(200)
      .returns<VentaRow[]>(),
    sb
      .from("comision")
      .select("id,venta_id,tipo,valor,comision_calculada,estado,vendedor_id")
      .returns<ComisionRow[]>(),
  ]);

  const comPorVenta = new Map<string, ComisionRow>();
  for (const c of comisiones ?? []) if (c.venta_id) comPorVenta.set(c.venta_id, c);

  // Totales.
  let totalPendiente = 0;
  let totalPagada = 0;
  const porVend = new Map<string, { nombre: string; pendiente: number; pagada: number }>();
  const nombreVend = new Map<string, string>();
  for (const v of ventas ?? []) {
    const vend = rel(v.vendedor);
    if (v.vendedor_id && vend) {
      nombreVend.set(v.vendedor_id, `${vend.nombre} ${vend.apellido}`.trim());
    }
  }
  for (const c of comisiones ?? []) {
    const monto = c.comision_calculada ?? 0;
    if (c.estado === "pagada") totalPagada += monto;
    else if (c.estado === "pendiente") totalPendiente += monto;
    const key = c.vendedor_id ?? "—";
    const r = porVend.get(key) ?? {
      nombre: c.vendedor_id ? nombreVend.get(c.vendedor_id) ?? "Vendedor" : "Sin asignar",
      pendiente: 0,
      pagada: 0,
    };
    if (c.estado === "pagada") r.pagada += monto;
    else if (c.estado === "pendiente") r.pendiente += monto;
    porVend.set(key, r);
  }

  return (
    <div>
      <PageHeader
        title="Comisiones"
        description="Calculá la comisión de cada venta (fija o por porcentaje) y llevá el estado de pago."
      />

      {/* Resumen */}
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="py-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Pendiente de pago</p>
            <p className="text-xl font-bold text-amber-700">{formatARS(totalPendiente)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Pagado</p>
            <p className="text-xl font-bold text-green-700">{formatARS(totalPagada)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Ventas listadas</p>
            <p className="text-xl font-bold">{formatNumber(ventas?.length ?? 0)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Totales por vendedor */}
      {porVend.size > 0 && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">Por vendedor</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5 text-sm">
              {[...porVend.values()]
                .sort((a, b) => b.pendiente + b.pagada - (a.pendiente + a.pagada))
                .map((v) => (
                  <li key={v.nombre} className="flex items-center justify-between">
                    <span className="font-medium">{v.nombre}</span>
                    <span className="flex gap-3">
                      <span className="text-amber-700">Pend. {formatARS(v.pendiente)}</span>
                      <span className="text-green-700">Pag. {formatARS(v.pagada)}</span>
                    </span>
                  </li>
                ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Tabla de ventas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ventas</CardTitle>
        </CardHeader>
        <CardContent>
          {!ventas || ventas.length === 0 ? (
            <EmptyState title="Sin ventas" description="Cuando registres ventas vas a poder calcular sus comisiones." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Venta</th>
                    <th className="py-2 pr-3 font-medium">Precio</th>
                    <th className="py-2 pr-3 font-medium">Comisión</th>
                    <th className="py-2 pr-3 font-medium">Estado / acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {ventas.map((v) => {
                    const veh = rel(v.vehiculo);
                    const vend = rel(v.vendedor);
                    const c = comPorVenta.get(v.id);
                    return (
                      <tr key={v.id} className="align-top">
                        <td className="py-3 pr-3">
                          <div className="font-medium">
                            {veh ? `${veh.marca} ${veh.modelo} ${veh.anio ?? ""}`.trim() : "Vehículo —"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDate(v.fecha_venta)}
                            {vend ? ` · ${vend.nombre} ${vend.apellido}` : " · sin vendedor"}
                          </div>
                        </td>
                        <td className="py-3 pr-3">{formatARS(v.precio_final)}</td>
                        <td className="py-3 pr-3">
                          {c ? (
                            <div>
                              <span className="font-medium">{formatARS(c.comision_calculada)}</span>
                              <div className="text-xs text-muted-foreground">
                                {c.tipo === "porcentaje" ? `${c.valor ?? 0}%` : "monto fijo"}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-3 pr-3">
                          {c ? (
                            <div className="flex flex-col items-start gap-1.5">
                              <Badge tone={c.estado === "pagada" ? "ok" : c.estado === "cancelada" ? "danger" : "warn"}>
                                {c.estado}
                              </Badge>
                              {puedeEditar && (
                                <div className="flex items-center gap-3">
                                  {c.estado === "pagada" ? (
                                    <form action={marcarPendiente.bind(null, c.id)}>
                                      <button type="submit" className="text-xs text-amber-700 hover:underline">
                                        Marcar pendiente
                                      </button>
                                    </form>
                                  ) : (
                                    <form action={marcarPagada.bind(null, c.id)}>
                                      <button type="submit" className="text-xs text-green-700 hover:underline">
                                        Marcar pagada
                                      </button>
                                    </form>
                                  )}
                                  <form action={eliminarComision.bind(null, c.id)}>
                                    <button type="submit" className="text-muted-foreground hover:text-danger" title="Eliminar comisión">
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </form>
                                </div>
                              )}
                            </div>
                          ) : puedeEditar ? (
                            <form action={crearComision.bind(null, v.id)} className="flex flex-wrap items-center gap-1.5">
                              <select name="tipo" defaultValue="porcentaje" className="h-8 rounded border border-input bg-white px-2 text-xs">
                                <option value="porcentaje">%</option>
                                <option value="fija">$ fijo</option>
                              </select>
                              <input
                                name="valor"
                                type="number"
                                step="0.01"
                                min="0"
                                defaultValue="3"
                                className="h-8 w-20 rounded border border-input bg-white px-2 text-xs"
                              />
                              <Button type="submit" variant="outline" size="sm">
                                Calcular
                              </Button>
                            </form>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
