import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Badge, toneForEstado } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatARS, formatDate, humanize } from "@/lib/format";
import { rel, type Rel } from "@/lib/rel";

export const dynamic = "force-dynamic";

type Row = {
  id: string; monto_sena: number | null; fecha_reserva: string; vencimiento: string | null;
  medio_pago: string | null; estado: string;
  cliente: Rel<{ nombre: string; apellido: string }>;
  vehiculo: Rel<{ marca: string; modelo: string }>;
};

export default async function ReservasPage() {
  const sb = createClient();
  const { data } = await sb
    .from("reserva")
    .select("id,monto_sena,fecha_reserva,vencimiento,medio_pago,estado,cliente:cliente_id(nombre,apellido),vehiculo:vehiculo_id(marca,modelo)")
    .order("vencimiento", { ascending: true })
    .returns<Row[]>();

  return (
    <div>
      <PageHeader
        title="Reservas / Señas"
        description="Reservas activas, vencidas y convertidas en venta."
        actions={<Link href="/reservas/nuevo"><Button><Plus className="h-4 w-4" /> Nueva reserva</Button></Link>}
      />
      {!data || data.length === 0 ? (
        <EmptyState title="No hay reservas" description="Las señas que tomes quedarán registradas con su vencimiento." />
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <THead><TR><TH>Cliente</TH><TH>Vehículo</TH><TH>Seña</TH><TH>Reserva</TH><TH>Vence</TH><TH>Estado</TH></TR></THead>
            <TBody>
              {data.map((r) => {
                const c = rel(r.cliente);
                const veh = rel(r.vehiculo);
                return (
                  <TR key={r.id}>
                    <TD className="font-medium">{c?.nombre} {c?.apellido}</TD>
                    <TD>{veh?.marca} {veh?.modelo}</TD>
                    <TD>{formatARS(r.monto_sena)}</TD>
                    <TD>{formatDate(r.fecha_reserva)}</TD>
                    <TD>{formatDate(r.vencimiento)}</TD>
                    <TD><Badge tone={toneForEstado(r.estado)}>{humanize(r.estado)}</Badge></TD>
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
