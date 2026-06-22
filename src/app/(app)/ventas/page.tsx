import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge, toneForEstado } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { formatARS, formatDate, humanize } from "@/lib/format";
import { rel, type Rel } from "@/lib/rel";

export const dynamic = "force-dynamic";

type Row = {
  id: string; fecha_venta: string; precio_final: number | null; sena: number | null;
  saldo: number | null; forma_pago: string; estado_entrega: string; tiene_credito: boolean;
  cliente: Rel<{ nombre: string; apellido: string }>;
  vehiculo: Rel<{ marca: string; modelo: string }>;
};

export default async function VentasPage() {
  const sb = createClient();
  const { data } = await sb
    .from("venta")
    .select("id,fecha_venta,precio_final,sena,saldo,forma_pago,estado_entrega,tiene_credito,cliente:cliente_id(nombre,apellido),vehiculo:vehiculo_id(marca,modelo)")
    .order("fecha_venta", { ascending: false })
    .returns<Row[]>();

  return (
    <div>
      <PageHeader
        title="Ventas"
        description="Operaciones cerradas con forma de pago y estado de entrega."
        actions={<Link href="/ventas/nuevo"><Button><Plus className="h-4 w-4" /> Nueva venta</Button></Link>}
      />
      {!data || data.length === 0 ? (
        <EmptyState title="No hay ventas registradas" description="Las ventas que cierres aparecerán acá con su seguimiento de entrega." />
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <THead><TR><TH>Fecha</TH><TH>Cliente</TH><TH>Vehículo</TH><TH>Precio</TH><TH>Saldo</TH><TH>Pago</TH><TH>Entrega</TH></TR></THead>
            <TBody>
              {data.map((v) => {
                const c = rel(v.cliente);
                const veh = rel(v.vehiculo);
                return (
                  <TR key={v.id} className="cursor-pointer hover:bg-muted/50">
                    <TD><Link href={`/ventas/${v.id}`} className="block">{formatDate(v.fecha_venta)}</Link></TD>
                    <TD className="font-medium"><Link href={`/ventas/${v.id}`} className="block">{c?.nombre} {c?.apellido}</Link></TD>
                    <TD>{veh?.marca} {veh?.modelo}</TD>
                    <TD className="font-medium">{formatARS(v.precio_final)}</TD>
                    <TD>{formatARS(v.saldo)}</TD>
                    <TD>{humanize(v.forma_pago)}{v.tiene_credito ? " 💳" : ""}</TD>
                    <TD><Badge tone={toneForEstado(v.estado_entrega)}>{humanize(v.estado_entrega)}</Badge></TD>
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
