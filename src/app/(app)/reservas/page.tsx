import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { Badge, toneForEstado } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import Link from "next/link";
import { Plus, FileText, X, HandCoins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatARS, formatDate, humanize } from "@/lib/format";
import { rel, type Rel } from "@/lib/rel";
import { generarReciboReserva } from "@/app/(app)/documentos/actions";
import { cancelarReserva } from "./actions";

export const dynamic = "force-dynamic";

type Row = {
  id: string; monto_sena: number | null; fecha_reserva: string; vencimiento: string | null;
  medio_pago: string | null; estado: string;
  cliente: Rel<{ id: string; nombre: string; apellido: string }>;
  vehiculo: Rel<{ id: string; marca: string; modelo: string; precio_venta: number | null }>;
};

export default async function ReservasPage() {
  const sb = createClient();
  const [ctx, { data }] = await Promise.all([
    getSessionContext(),
    sb
      .from("reserva")
      .select("id,monto_sena,fecha_reserva,vencimiento,medio_pago,estado,cliente:cliente_id(id,nombre,apellido),vehiculo:vehiculo_id(id,marca,modelo,precio_venta)")
      .order("vencimiento", { ascending: true })
      .returns<Row[]>(),
  ]);
  const puedeGenerar = can(ctx?.profile?.rol, "documentos.generar");
  const puedeVender = can(ctx?.profile?.rol, "ventas.crear");

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
        <div className="rounded-xl border border-border/70 bg-card shadow-elevate">
          <Table>
            <THead><TR><TH>Cliente</TH><TH>Vehículo</TH><TH>Seña</TH><TH>Reserva</TH><TH>Vence</TH><TH>Estado</TH><TH>Acciones</TH></TR></THead>
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
                    <TD>
                      {r.estado === "activa" && (
                        <div className="flex items-center gap-1.5">
                          {puedeVender && (
                            <Link
                              href={`/ventas/nuevo?reserva=${r.id}&cliente=${c?.id ?? ""}&vehiculo=${veh?.id ?? ""}&sena=${r.monto_sena ?? 0}&precio=${veh?.precio_venta ?? ""}`}
                            >
                              <Button type="button" variant="outline" size="sm"><HandCoins className="h-3.5 w-3.5" /> Confirmar venta</Button>
                            </Link>
                          )}
                          {puedeGenerar && (
                            <form action={generarReciboReserva.bind(null, r.id)}>
                              <Button type="submit" variant="outline" size="sm"><FileText className="h-3.5 w-3.5" /> Recibo</Button>
                            </form>
                          )}
                          <form action={cancelarReserva.bind(null, r.id)}>
                            <Button type="submit" variant="outline" size="sm" title="El vehículo vuelve a quedar disponible"><X className="h-3.5 w-3.5" /> Cancelar</Button>
                          </form>
                        </div>
                      )}
                    </TD>
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
