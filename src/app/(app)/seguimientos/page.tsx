import Link from "next/link";
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

const PAGE_SIZE = 30;

export default async function SeguimientosPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const sb = createClient();
  const page = Math.max(1, Number(searchParams.page) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, count } = await sb
    .from("seguimiento")
    .select("id,fecha,hora,motivo,estado,cliente:cliente_id(nombre,apellido),vendedor:vendedor_id(nombre,apellido)", { count: "exact" })
    .order("fecha", { ascending: false })
    .range(from, to)
    .returns<Row[]>();
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

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

      {total > 0 && (
        <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {from + 1}–{Math.min(from + PAGE_SIZE, total)} de {total} seguimiento{total === 1 ? "" : "s"}
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              {page > 1 ? (
                <Link href={`/seguimientos?page=${page - 1}`} className="rounded-md border px-3 py-1 hover:bg-muted">Anterior</Link>
              ) : (
                <span className="rounded-md border px-3 py-1 opacity-40">Anterior</span>
              )}
              <span>Página {page} de {totalPages}</span>
              {page < totalPages ? (
                <Link href={`/seguimientos?page=${page + 1}`} className="rounded-md border px-3 py-1 hover:bg-muted">Siguiente</Link>
              ) : (
                <span className="rounded-md border px-3 py-1 opacity-40">Siguiente</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
