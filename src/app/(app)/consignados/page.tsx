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
import { cambiarEstadoConsignacion, liquidarConsignacion } from "./actions";

export const dynamic = "force-dynamic";

type Row = {
  id: string; cliente_id: string | null; dueno_nombre: string | null; dueno_contacto: string | null;
  comision_acordada: number | null; precio_pretendido: number | null; precio_minimo: number | null;
  autorizacion_venta: boolean; vencimiento: string | null; estado: string;
  liquidado: boolean; monto_liquidado: number | null; fecha_liquidacion: string | null;
  vehiculo: Rel<{ marca: string; modelo: string; patente: string | null }>;
};

export default async function ConsignadosPage() {
  const sb = createClient();
  const { data } = await sb
    .from("consignacion")
    .select(
      "id,cliente_id,dueno_nombre,dueno_contacto,comision_acordada,precio_pretendido,precio_minimo,autorizacion_venta,vencimiento,estado," +
        "liquidado,monto_liquidado,fecha_liquidacion,vehiculo:vehiculo_id(marca,modelo,patente)",
    )
    .order("created_at", { ascending: false })
    .returns<Row[]>();

  return (
    <div>
      <PageHeader
        title="Consignados"
        description="Autos de terceros que la agencia vende por comisión."
        actions={<Link href="/consignados/nuevo"><Button><Plus className="h-4 w-4" /> Registrar consignación</Button></Link>}
      />
      {!data || data.length === 0 ? (
        <EmptyState title="No hay consignaciones registradas" description="Registrá un auto de un tercero que la agencia vende por comisión." />
      ) : (
        <div className="rounded-xl border border-border/70 bg-card shadow-elevate">
          <Table>
            <THead><TR><TH>Vehículo</TH><TH>Dueño</TH><TH>Comisión</TH><TH>Pretendido</TH><TH>Mínimo</TH><TH>Autorización</TH><TH>Vence</TH><TH>Estado</TH><TH>Liquidación</TH><TH>Acciones</TH></TR></THead>
            <TBody>
              {data.map((c) => {
                const veh = rel(c.vehiculo);
                return (
                  <TR key={c.id}>
                    <TD className="font-medium">
                      {veh ? `${veh.marca} ${veh.modelo}` : "—"}
                      {veh?.patente && <span className="block font-mono text-xs text-muted-foreground">{veh.patente}</span>}
                    </TD>
                    <TD>
                      {c.cliente_id ? (
                        <Link href={`/clientes/${c.cliente_id}`} className="text-brand-700 hover:underline">{c.dueno_nombre}</Link>
                      ) : c.dueno_nombre}
                      {c.dueno_contacto && <span className="block text-xs text-muted-foreground">{c.dueno_contacto}</span>}
                    </TD>
                    <TD>{c.comision_acordada != null ? `${c.comision_acordada}%` : "—"}</TD>
                    <TD>{formatARS(c.precio_pretendido)}</TD>
                    <TD>{formatARS(c.precio_minimo)}</TD>
                    <TD>{c.autorizacion_venta ? <Badge tone="ok">Firmada</Badge> : <Badge tone="warn">Pendiente</Badge>}</TD>
                    <TD>{formatDate(c.vencimiento)}</TD>
                    <TD><Badge tone={toneForEstado(c.estado)}>{humanize(c.estado)}</Badge></TD>
                    <TD>
                      {c.estado !== "vendida" ? (
                        <span className="text-muted-foreground">—</span>
                      ) : c.liquidado ? (
                        <div>
                          <span className="font-medium text-ok">{formatARS(c.monto_liquidado)}</span>
                          <span className="block text-xs text-muted-foreground">{formatDate(c.fecha_liquidacion)}</span>
                        </div>
                      ) : (
                        <form action={liquidarConsignacion.bind(null, c.id)}>
                          <Button type="submit" variant="outline" size="sm">Liquidar</Button>
                        </form>
                      )}
                    </TD>
                    <TD>
                      {c.estado === "activa" && (
                        <div className="flex items-center gap-1">
                          <form action={cambiarEstadoConsignacion.bind(null, c.id, "vendida")}>
                            <Button type="submit" variant="outline" size="sm">Vendida</Button>
                          </form>
                          <form action={cambiarEstadoConsignacion.bind(null, c.id, "retirada")}>
                            <Button type="submit" variant="outline" size="sm">Retirada</Button>
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
