import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Badge, toneForEstado } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate, humanize } from "@/lib/format";
import { rel, type Rel } from "@/lib/rel";
import { cambiarEstadoSeguimiento } from "./actions";

export const dynamic = "force-dynamic";

type Row = {
  id: string; fecha: string; hora: string | null; motivo: string | null; estado: string;
  cliente: Rel<{ nombre: string; apellido: string }>;
  vendedor: Rel<{ nombre: string; apellido: string }>;
};

export default async function SeguimientosPage() {
  const sb = createClient();
  const { data } = await sb
    .from("seguimiento")
    .select("id,fecha,hora,motivo,estado,cliente:cliente_id(nombre,apellido),vendedor:vendedor_id(nombre,apellido)")
    .order("fecha", { ascending: false })
    .returns<Row[]>();

  return (
    <div>
      <PageHeader title="Seguimientos" description="Agenda comercial: pendientes, realizados y vencidos." />
      {!data || data.length === 0 ? (
        <EmptyState title="No hay seguimientos" description="Los seguimientos agendados desde un cliente aparecen acá." />
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <THead><TR><TH>Fecha</TH><TH>Cliente</TH><TH>Motivo</TH><TH>Vendedor</TH><TH>Estado</TH><TH>Acciones</TH></TR></THead>
            <TBody>
              {data.map((s) => {
                const c = rel(s.cliente);
                const v = rel(s.vendedor);
                return (
                  <TR key={s.id}>
                    <TD>{formatDate(s.fecha)}{s.hora ? ` ${s.hora.slice(0, 5)}` : ""}</TD>
                    <TD className="font-medium">{c?.nombre} {c?.apellido}</TD>
                    <TD>{s.motivo ?? "—"}</TD>
                    <TD>{v ? `${v.nombre} ${v.apellido}` : "—"}</TD>
                    <TD><Badge tone={toneForEstado(s.estado)}>{humanize(s.estado)}</Badge></TD>
                    <TD>
                      {(s.estado === "pendiente" || s.estado === "vencido") ? (
                        <div className="flex gap-1">
                          <form action={cambiarEstadoSeguimiento.bind(null, s.id, "realizado")}>
                            <button type="submit" className="rounded border px-2 py-0.5 text-xs text-ok hover:bg-muted">✓ Realizado</button>
                          </form>
                          <form action={cambiarEstadoSeguimiento.bind(null, s.id, "cancelado")}>
                            <button type="submit" className="rounded border px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted">Cancelar</button>
                          </form>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
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
