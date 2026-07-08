import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { Badge, toneForEstado } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate, humanize } from "@/lib/format";
import { rel, type Rel } from "@/lib/rel";
import { RegistrarPagoButton } from "@/components/creditos/registrar-pago";

export const dynamic = "force-dynamic";

type Row = {
  id: string; cantidad_cuotas: number; cuota_actual: number;
  fecha_inicio: string; fecha_fin_estimada: string | null; estado: string;
  venta: Rel<{
    cliente: Rel<{ nombre: string; apellido: string }>;
    vehiculo: Rel<{ marca: string; modelo: string }>;
  }>;
};

export default async function CreditosPage() {
  const sb = createClient();

  const [ctx, { data }, { data: pagos }] = await Promise.all([
    getSessionContext(),
    sb
      .from("credito")
      .select("id,cantidad_cuotas,cuota_actual,fecha_inicio,fecha_fin_estimada,estado,venta:venta_id(cliente:cliente_id(nombre,apellido),vehiculo:vehiculo_id(marca,modelo))")
      .order("fecha_fin_estimada", { ascending: true })
      .returns<Row[]>(),
    // Fecha del último pago por crédito (una sola consulta, sin N+1).
    sb
      .from("pago_cuota")
      .select("credito_id, fecha_pago")
      .order("fecha_pago", { ascending: false })
      .returns<{ credito_id: string; fecha_pago: string }[]>(),
  ]);
  const puedeCobrar = can(ctx?.profile?.rol, "creditos.cobrar");
  const ultimoPago = new Map<string, string>();
  for (const p of pagos ?? []) {
    if (!ultimoPago.has(p.credito_id)) ultimoPago.set(p.credito_id, p.fecha_pago);
  }

  return (
    <div>
      <PageHeader
        title="Créditos y cuotas"
        description="Seguimiento de financiaciones. Alerta comercial en la anteúltima cuota para recontactar."
      />
      {!data || data.length === 0 ? (
        <EmptyState title="No hay créditos activos" description="Las ventas con financiación generan acá el seguimiento de cuotas." />
      ) : (
        <div className="rounded-xl border border-border/70 bg-card shadow-elevate">
          <Table>
            <THead><TR><TH>Cliente</TH><TH>Vehículo</TH><TH>Cuota</TH><TH>Último pago</TH><TH>Fin estimado</TH><TH>Estado</TH>{puedeCobrar && <TH>Acciones</TH>}</TR></THead>
            <TBody>
              {data.map((cr) => {
                const venta = rel(cr.venta);
                const c = venta ? rel(venta.cliente) : null;
                const veh = venta ? rel(venta.vehiculo) : null;
                const enAlerta = cr.estado === "por_terminar" || cr.cuota_actual >= cr.cantidad_cuotas - 1;
                return (
                  <TR key={cr.id}>
                    <TD className="font-medium">
                      <Link href={`/creditos/${cr.id}`} className="text-brand-800 hover:underline">
                        {c?.nombre} {c?.apellido}
                      </Link>
                    </TD>
                    <TD>{veh?.marca} {veh?.modelo}</TD>
                    <TD>{cr.cuota_actual}/{cr.cantidad_cuotas} {enAlerta ? "🔔" : ""}</TD>
                    <TD>{formatDate(ultimoPago.get(cr.id) ?? null)}</TD>
                    <TD>{formatDate(cr.fecha_fin_estimada)}</TD>
                    <TD><Badge tone={toneForEstado(cr.estado)}>{humanize(cr.estado)}</Badge></TD>
                    {puedeCobrar && (
                      <TD>
                        {cr.estado !== "finalizado" && cr.estado !== "cancelado" && cr.cuota_actual < cr.cantidad_cuotas ? (
                          <RegistrarPagoButton
                            creditoId={cr.id}
                            proximaCuota={cr.cuota_actual + 1}
                            totalCuotas={cr.cantidad_cuotas}
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TD>
                    )}
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </div>
      )}
    </div>
  );
}
