import { TrendingUp, ShoppingCart, Wallet, Car, Download, Trophy } from "lucide-react";
import { getSessionContext } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { getReporte, rangoMesActual } from "@/lib/data/reportes";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { formatARS, formatNumber, humanize } from "@/lib/format";

export const dynamic = "force-dynamic";

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Car;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-800">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="text-lg font-bold leading-tight">{value}</p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: { desde?: string; hasta?: string };
}) {
  const ctx = await getSessionContext();
  if (!can(ctx?.profile?.rol, "reportes.ver")) {
    return (
      <div>
        <PageHeader title="Reportes" description="Análisis comercial, de stock y rentabilidad." />
        <EmptyState title="Sin acceso" description="Tu rol no tiene permiso para ver reportes." />
      </div>
    );
  }

  const verMargenes = can(ctx?.profile?.rol, "margenes.ver");
  const def = rangoMesActual();
  const desde = searchParams.desde || def.desde;
  const hasta = searchParams.hasta || def.hasta;
  const r = await getReporte(desde, hasta);
  const ticketProm = r.ventas.cantidad > 0 ? r.ventas.monto / r.ventas.cantidad : 0;

  const qs = new URLSearchParams({ desde, hasta }).toString();

  return (
    <div>
      <PageHeader
        title="Reportes"
        description="Resultados del período: ventas, rentabilidad, ranking de vendedores y stock."
      />

      {/* Filtro de fechas */}
      <Card className="mb-4">
        <CardContent className="py-3">
          <form method="get" action="/reportes" className="flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="desde" className="mb-1 block text-xs font-medium text-muted-foreground">
                Desde
              </label>
              <input
                type="date"
                id="desde"
                name="desde"
                defaultValue={desde}
                className="h-9 rounded-md border border-input bg-white px-3 text-sm shadow-sm"
              />
            </div>
            <div>
              <label htmlFor="hasta" className="mb-1 block text-xs font-medium text-muted-foreground">
                Hasta
              </label>
              <input
                type="date"
                id="hasta"
                name="hasta"
                defaultValue={hasta}
                className="h-9 rounded-md border border-input bg-white px-3 text-sm shadow-sm"
              />
            </div>
            <Button type="submit" variant="outline" size="sm">
              Aplicar
            </Button>
            <div className="ml-auto flex flex-wrap gap-2">
              <a href={`/reportes/export?tipo=ventas&${qs}`}>
                <Button type="button" variant="outline" size="sm">
                  <Download className="h-4 w-4" /> Ventas
                </Button>
              </a>
              <a href="/reportes/export?tipo=stock">
                <Button type="button" variant="outline" size="sm">
                  <Download className="h-4 w-4" /> Stock
                </Button>
              </a>
              <a href="/reportes/export?tipo=clientes">
                <Button type="button" variant="outline" size="sm">
                  <Download className="h-4 w-4" /> Clientes
                </Button>
              </a>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi
          icon={ShoppingCart}
          label="Ventas del período"
          value={formatNumber(r.ventas.cantidad)}
          hint={`Ticket prom. ${formatARS(ticketProm)}`}
        />
        <Kpi icon={Wallet} label="Facturación" value={formatARS(r.ventas.monto)} />
        {verMargenes ? (
          <Kpi
            icon={TrendingUp}
            label="Margen neto"
            value={r.rentabilidad.margenNeto == null ? "No calculable" : formatARS(r.rentabilidad.margenNeto)}
            hint={r.rentabilidad.ventasSinCosto > 0
              ? `${formatNumber(r.rentabilidad.ventasSinCosto)} venta(s) sin costo cargado`
              : `Bruto ${formatARS(r.rentabilidad.margenBruto)} − gastos ${formatARS(r.rentabilidad.gastos)}`}
          />
        ) : (
          <Kpi icon={Car} label="Stock disponible" value={formatNumber(r.stock.disponibles)} />
        )}
        <Kpi
          icon={Car}
          label="Stock a precio de venta"
          value={formatARS(r.stock.valorInventario)}
          hint={`${formatNumber(r.stock.disponibles)} vendibles · no representa ganancia`}
        />
        {verMargenes && (
          <Kpi
            icon={Wallet}
            label="Capital invertido conocido"
            value={formatARS(r.stock.capitalInvertidoConocido)}
            hint={r.stock.unidadesSinCosto > 0
              ? `${formatNumber(r.stock.unidadesSinCosto)} unidad(es) sin costo`
              : "Costos completos del stock vendible"}
          />
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Ranking de vendedores */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-4 w-4 text-amber-500" /> Ranking de vendedores
            </CardTitle>
          </CardHeader>
          <CardContent>
            {r.ranking.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin ventas en el período.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                    <th className="py-2 pr-2 font-medium">Vendedor</th>
                    <th className="py-2 pr-2 text-right font-medium">Ventas</th>
                    <th className="py-2 pr-2 text-right font-medium">Facturación</th>
                    {verMargenes && <th className="py-2 text-right font-medium">Margen</th>}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {r.ranking.map((v, i) => (
                    <tr key={v.vendedor_id ?? `na-${i}`}>
                      <td className="py-2 pr-2">
                        {i === 0 && <span className="mr-1">🥇</span>}
                        {v.nombre}
                      </td>
                      <td className="py-2 pr-2 text-right">{formatNumber(v.cantidad)}</td>
                      <td className="py-2 pr-2 text-right">{formatARS(v.monto)}</td>
                      {verMargenes && (
                        <td className="py-2 text-right text-muted-foreground">
                          {v.margen == null ? `No calculable (${v.ventasSinCosto} sin costo)` : formatARS(v.margen)}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Formas de pago + Stock por estado */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Por forma de pago</CardTitle>
            </CardHeader>
            <CardContent>
              {r.porFormaPago.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin ventas en el período.</p>
              ) : (
                <ul className="space-y-1.5 text-sm">
                  {r.porFormaPago.map((f) => (
                    <li key={f.forma} className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Badge tone="info">{humanize(f.forma)}</Badge>
                        <span className="text-muted-foreground">{formatNumber(f.cantidad)}</span>
                      </span>
                      <span className="font-medium">{formatARS(f.monto)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Stock por estado</CardTitle>
            </CardHeader>
            <CardContent>
              {r.stock.porEstado.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin vehículos cargados.</p>
              ) : (
                <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                  {r.stock.porEstado.map((e) => (
                    <li key={e.estado} className="flex items-center justify-between">
                      <span className="text-muted-foreground">{humanize(e.estado)}</span>
                      <span className="font-medium">{formatNumber(e.cantidad)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
