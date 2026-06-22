import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate, daysUntil } from "@/lib/format";
import { rel, type Rel } from "@/lib/rel";

export const dynamic = "force-dynamic";

type Row = {
  id: string; fecha_alerta: string; realizada: boolean; notas: string | null;
  cliente: Rel<{ nombre: string; apellido: string }>;
};

export default async function PostventaPage() {
  const sb = createClient();
  const { data } = await sb
    .from("postventa")
    .select("id,fecha_alerta,realizada,notas,cliente:cliente_id(nombre,apellido)")
    .order("fecha_alerta", { ascending: true })
    .returns<Row[]>();

  return (
    <div>
      <PageHeader
        title="Postventa"
        description="Recontacto a 6 meses de ventas en efectivo: experiencia, referidos y nueva operación."
      />
      {!data || data.length === 0 ? (
        <EmptyState title="No hay alertas de postventa" description="Las ventas en efectivo generan una alerta automática a los 6 meses." />
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <THead><TR><TH>Cliente</TH><TH>Alerta</TH><TH>Vencimiento</TH><TH>Estado</TH></TR></THead>
            <TBody>
              {data.map((p) => {
                const c = rel(p.cliente);
                const d = daysUntil(p.fecha_alerta);
                return (
                  <TR key={p.id}>
                    <TD className="font-medium">{c?.nombre} {c?.apellido}</TD>
                    <TD>{formatDate(p.fecha_alerta)}</TD>
                    <TD>{d == null ? "—" : d < 0 ? `Hace ${-d} días` : d === 0 ? "Hoy" : `En ${d} días`}</TD>
                    <TD>{p.realizada ? <Badge tone="ok">Realizada</Badge> : <Badge tone="warn">Pendiente</Badge>}</TD>
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
