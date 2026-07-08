import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Badge, toneForEstado } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate, humanize } from "@/lib/format";
import { rel, type Rel } from "@/lib/rel";
import { cn } from "@/lib/utils";
import { NuevoSeguimientoForm } from "@/components/seguimientos/nuevo-seguimiento-form";
import { FilaAcciones } from "@/components/seguimientos/fila-acciones";
import { cambiarEstadoSeguimiento } from "./actions";

export const dynamic = "force-dynamic";

type Row = {
  id: string; fecha: string; hora: string | null; motivo: string | null; estado: string;
  cliente: Rel<{ id: string; nombre: string; apellido: string; telefono: string | null; whatsapp: string | null }>;
  vendedor: Rel<{ nombre: string; apellido: string }>;
};

const PAGE_SIZE = 30;

type Filtro = "pendientes" | "vencidos" | "hoy" | "proximos" | "todos";

const TABS: { key: Filtro; label: string }[] = [
  { key: "pendientes", label: "Pendientes" },
  { key: "vencidos", label: "Vencidos" },
  { key: "hoy", label: "Hoy" },
  { key: "proximos", label: "Próximos" },
  { key: "todos", label: "Historial" },
];

export default async function SeguimientosPage({
  searchParams,
}: {
  searchParams: { page?: string; filtro?: string };
}) {
  const sb = createClient();
  const page = Math.max(1, Number(searchParams.page) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const filtro: Filtro = (TABS.some((t) => t.key === searchParams.filtro) ? searchParams.filtro : "pendientes") as Filtro;
  const hoy = new Date().toISOString().slice(0, 10);

  let query = sb
    .from("seguimiento")
    .select(
      "id,fecha,hora,motivo,estado,cliente:cliente_id(id,nombre,apellido,telefono,whatsapp),vendedor:vendedor_id(nombre,apellido)",
      { count: "exact" },
    );

  if (filtro === "todos") {
    query = query.order("fecha", { ascending: false });
  } else if (filtro === "vencidos") {
    query = query.or(`estado.eq.vencido,and(estado.eq.pendiente,fecha.lt.${hoy})`).order("fecha", { ascending: true });
  } else if (filtro === "hoy") {
    query = query.eq("estado", "pendiente").eq("fecha", hoy).order("hora", { ascending: true });
  } else if (filtro === "proximos") {
    query = query.eq("estado", "pendiente").gt("fecha", hoy).order("fecha", { ascending: true });
  } else {
    // pendientes: todo lo accionable (vencidos + hoy + próximos), la vista por defecto.
    query = query.in("estado", ["pendiente", "vencido"]).order("fecha", { ascending: true });
  }

  const { data, count } = await query.range(from, to).returns<Row[]>();
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <PageHeader
        title="Seguimientos"
        description="Agenda comercial: pendientes, realizados y vencidos."
        actions={<NuevoSeguimientoForm />}
      />

      <div className="mb-4 flex flex-wrap gap-1 border-b">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/seguimientos?filtro=${t.key}`}
            className={cn(
              "rounded-t-md border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              filtro === t.key
                ? "border-brand-800 text-brand-900"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {!data || data.length === 0 ? (
        <EmptyState
          title="No hay seguimientos"
          description={
            filtro === "todos"
              ? "Los seguimientos agendados desde un cliente o el bot de WhatsApp aparecen acá."
              : "No hay nada en esta vista. Probá otra pestaña o agendá un seguimiento nuevo."
          }
        />
      ) : (
        <div className="rounded-xl border border-border/70 bg-card shadow-elevate">
          <Table>
            <THead><TR><TH>Fecha</TH><TH>Cliente</TH><TH>Motivo</TH><TH>Vendedor</TH><TH>Estado</TH><TH>Acciones</TH></TR></THead>
            <TBody>
              {data.map((s) => {
                const c = rel(s.cliente);
                const v = rel(s.vendedor);
                const tel = c?.whatsapp || c?.telefono || null;
                const mensaje = `¡Hola${c?.nombre ? ` ${c.nombre}` : ""}! ${s.motivo || "¿Pudiste ver la info que te pasé?"} Cualquier duda quedo a disposición.`;
                return (
                  <TR key={s.id}>
                    <TD>{formatDate(s.fecha)}{s.hora ? ` ${s.hora.slice(0, 5)}` : ""}</TD>
                    <TD className="font-medium">{c?.nombre} {c?.apellido}</TD>
                    <TD>{s.motivo ?? "—"}</TD>
                    <TD>{v ? `${v.nombre} ${v.apellido}` : "—"}</TD>
                    <TD><Badge tone={toneForEstado(s.estado)}>{humanize(s.estado)}</Badge></TD>
                    <TD>
                      <div className="flex items-center gap-1">
                        {tel && c?.id && <FilaAcciones seguimientoId={s.id} clienteId={c.id} mensajeGenerico={mensaje} />}
                        {(s.estado === "pendiente" || s.estado === "vencido") && (
                          <>
                            <form action={cambiarEstadoSeguimiento.bind(null, s.id, "realizado")}>
                              <button type="submit" className="rounded border px-2 py-0.5 text-xs text-ok hover:bg-muted">✓ Realizado</button>
                            </form>
                            <form action={cambiarEstadoSeguimiento.bind(null, s.id, "cancelado")}>
                              <button type="submit" className="rounded border px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted">Cancelar</button>
                            </form>
                          </>
                        )}
                      </div>
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
                <Link href={`/seguimientos?filtro=${filtro}&page=${page - 1}`} className="rounded-md border px-3 py-1 hover:bg-muted">Anterior</Link>
              ) : (
                <span className="rounded-md border px-3 py-1 opacity-40">Anterior</span>
              )}
              <span>Página {page} de {totalPages}</span>
              {page < totalPages ? (
                <Link href={`/seguimientos?filtro=${filtro}&page=${page + 1}`} className="rounded-md border px-3 py-1 hover:bg-muted">Siguiente</Link>
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
