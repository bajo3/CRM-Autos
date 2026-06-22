import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate, daysUntil } from "@/lib/format";
import { rel, type Rel } from "@/lib/rel";
import { vtvSeveridad, vtvSeveridadLabel, vtvSeveridadTone } from "@/lib/data/vtv";

export const dynamic = "force-dynamic";

const MESES = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

type Row = {
  id: string; patente: string | null; ultimo_digito: string | null;
  jurisdiccion: string | null; mes_sugerido: number | null;
  fecha_vencimiento: string | null; estado: string;
  vehiculo: Rel<{ marca: string; modelo: string }>;
};

export default async function VtvPage() {
  const sb = createClient();
  const ctx = await getSessionContext();
  const { data } = await sb
    .from("vtv")
    .select("id,patente,ultimo_digito,jurisdiccion,mes_sugerido,fecha_vencimiento,estado,vehiculo:vehiculo_id(marca,modelo)")
    .order("fecha_vencimiento", { ascending: true })
    .returns<Row[]>();

  return (
    <div>
      <PageHeader
        title="VTV por patente"
        description={`Vencimientos según el último dígito de la patente. Jurisdicción configurable por empresa (actual: ${ctx?.empresa?.provincia ?? "Buenos Aires"}).`}
      />
      {!data || data.length === 0 ? (
        <EmptyState title="No hay VTV registradas" description="Cargá la VTV de cada unidad para recibir alertas 60/30/7 días antes del vencimiento." />
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <THead><TR><TH>Vehículo</TH><TH>Patente</TH><TH>Últ. dígito</TH><TH>Mes sugerido</TH><TH>Vencimiento</TH><TH>Faltan</TH><TH>Alerta</TH></TR></THead>
            <TBody>
              {data.map((v) => {
                const veh = rel(v.vehiculo);
                const d = daysUntil(v.fecha_vencimiento);
                const sev = vtvSeveridad(d);
                return (
                  <TR key={v.id}>
                    <TD className="font-medium">{veh?.marca} {veh?.modelo}</TD>
                    <TD className="font-mono text-xs">{v.patente}</TD>
                    <TD>{v.ultimo_digito ?? "—"}</TD>
                    <TD>{v.mes_sugerido ? MESES[v.mes_sugerido] : "—"}</TD>
                    <TD>{formatDate(v.fecha_vencimiento)}</TD>
                    <TD>{d == null ? "—" : d < 0 ? `Vencida hace ${-d}d` : `${d} días`}</TD>
                    <TD><Badge tone={vtvSeveridadTone(sev)}>{vtvSeveridadLabel(sev)}</Badge></TD>
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
