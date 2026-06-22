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
  const ctx = await getSessionContext();
  const puedeCobrar = can(ctx?.profile?.rol, "creditos.cobrar");
  const { data } = await sb
    .from("credito")
    .select("id,cantidad_cuotas,cuota_actual,fecha_inicio,fecha_fin_estimada,estado,venta:venta_id(cliente:cliente_id(nombre,apellido),vehiculo:vehiculo_id(marca,modelo))")
    .order("fecha_fin_estimada", { ascending: true })
    .returns<Row[]>();

  return (
    <div>
      <PageHeader
        title="Créditos y cuotas"
        description="Seguimiento de financiaciones. Alerta comercial en la anteúltima cuota para recontactar."
      />
      {!data || data.length === 0 ? (
        <EmptyState title="No hay créditos activos" description="Las ventas con financiación generan acá el seguimiento de cuotas." />
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <THead><TR><TH>Cliente</TH><TH>Vehículo</TH><TH>Cuota</TH><TH>Inicio</TH><TH>Fin estimado</TH><TH>Estado</TH>{puedeCobrar && <TH>Acciones</TH>}</TR></THead>
            <TBody>
              {data.map((cr) => {
                const venta = rel(cr.venta);
                const c = venta ? rel(venta.cliente) : null;
                const veh = venta ? rel(venta.vehiculo) : null;
                const enAlerta = cr.estado === "por_terminar" || cr.cuota_actual >= cr.cantidad_cuotas - 1;
                return (
                  <TR key={cr.id}>
                    <TD className="font-medium">{c?.nombre} {c?.apellido}</TD>
                    <TD>{veh?.marca} {veh?.modelo}</TD>
                    <TD>{cr.cuota_actual}/{cr.cantidad_cuotas} {enAlerta ? "🔔" : ""}</TD>
                    <TD>{formatDate(cr.fecha_inicio)}</TD>
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
