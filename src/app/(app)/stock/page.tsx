import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge, toneForEstado } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { formatARS, formatNumber, humanize } from "@/lib/format";

export const dynamic = "force-dynamic";

type VehiculoRow = {
  id: string; marca: string; modelo: string; version: string | null;
  anio: number | null; kilometros: number | null; patente: string | null;
  precio_venta: number | null; margen_estimado: number | null;
  estado: string; estado_documental: string;
  publicado_web: boolean; publicado_ml: boolean;
};

const ESTADOS = [
  "disponible", "en_preparacion", "publicado", "no_publicado",
  "pausado", "reservado", "en_negociacion", "vendido", "consignado",
];

const PAGE_SIZE = 30;

export default async function StockPage({
  searchParams,
}: {
  searchParams: { estado?: string; q?: string; page?: string };
}) {
  const sb = createClient();

  const page = Math.max(1, Number(searchParams.page) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = sb
    .from("vehiculo")
    .select("id, marca, modelo, version, anio, kilometros, patente, precio_venta, margen_estimado, estado, estado_documental, publicado_web, publicado_ml", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (searchParams.estado && ESTADOS.includes(searchParams.estado)) {
    query = query.eq("estado", searchParams.estado as never);
  }
  if (searchParams.q) {
    query = query.or(
      `marca.ilike.%${searchParams.q}%,modelo.ilike.%${searchParams.q}%,patente.ilike.%${searchParams.q}%`,
    );
  }

  const [ctx, { data: autos, count }] = await Promise.all([
    getSessionContext(),
    query.returns<VehiculoRow[]>(),
  ]);
  const rol = ctx?.profile?.rol;
  const verMargen = can(rol, "margenes.ver");
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = (p: number) => {
    const sp = new URLSearchParams();
    if (searchParams.q) sp.set("q", searchParams.q);
    if (searchParams.estado) sp.set("estado", searchParams.estado);
    sp.set("page", String(p));
    return `/stock?${sp.toString()}`;
  };

  return (
    <div>
      <PageHeader
        title="Stock de autos"
        description="Inventario de la agencia con estado, precio y publicación."
        actions={
          can(rol, "stock.crear") ? (
            <Link href="/stock/nuevo">
              <Button><Plus className="h-4 w-4" /> Nuevo auto</Button>
            </Link>
          ) : null
        }
      />

      {/* Filtros rápidos */}
      <form className="mb-4 flex flex-wrap items-center gap-2" action="/stock" method="get">
        <input
          name="q"
          defaultValue={searchParams.q ?? ""}
          placeholder="Buscar marca, modelo o patente…"
          className="h-9 w-full max-w-xs rounded-md border border-input bg-white px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <select name="estado" defaultValue={searchParams.estado ?? ""} className="h-9 rounded-md border border-input bg-white px-3 text-sm shadow-sm">
          <option value="">Todos los estados</option>
          {ESTADOS.map((e) => (
            <option key={e} value={e}>{humanize(e)}</option>
          ))}
        </select>
        <Button type="submit" variant="outline" size="sm">Filtrar</Button>
        {(searchParams.estado || searchParams.q) && (
          <Link href="/stock" className="text-sm text-muted-foreground underline">Limpiar</Link>
        )}
      </form>

      {!autos || autos.length === 0 ? (
        <EmptyState
          title="No hay autos que coincidan"
          description="Cargá tu primer vehículo o ajustá los filtros de búsqueda."
          action={
            can(rol, "stock.crear") ? (
              <Link href="/stock/nuevo"><Button><Plus className="h-4 w-4" /> Cargar auto</Button></Link>
            ) : undefined
          }
        />
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <THead>
              <TR>
                <TH>Vehículo</TH>
                <TH>Año</TH>
                <TH>Km</TH>
                <TH>Patente</TH>
                <TH>Precio</TH>
                {verMargen && <TH>Margen</TH>}
                <TH>Estado</TH>
                <TH>Doc.</TH>
                <TH>Pub.</TH>
              </TR>
            </THead>
            <TBody>
              {autos.map((a) => (
                <TR key={a.id}>
                  <TD>
                    <Link href={`/stock/${a.id}`} className="font-medium text-brand-700 hover:underline">
                      {a.marca} {a.modelo}
                    </Link>
                    {a.version && <span className="block text-xs text-muted-foreground">{a.version}</span>}
                  </TD>
                  <TD>{a.anio ?? "—"}</TD>
                  <TD>{a.kilometros != null ? formatNumber(a.kilometros) : "—"}</TD>
                  <TD className="font-mono text-xs">{a.patente ?? "—"}</TD>
                  <TD className="font-medium">{formatARS(a.precio_venta)}</TD>
                  {verMargen && <TD className="text-ok">{formatARS(a.margen_estimado)}</TD>}
                  <TD><Badge tone={toneForEstado(a.estado)}>{humanize(a.estado)}</Badge></TD>
                  <TD><Badge tone={toneForEstado(a.estado_documental)}>{humanize(a.estado_documental)}</Badge></TD>
                  <TD className="text-xs text-muted-foreground">
                    {a.publicado_web ? "Web " : ""}{a.publicado_ml ? "ML" : ""}
                    {!a.publicado_web && !a.publicado_ml ? "—" : ""}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      )}

      {total > 0 && (
        <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {from + 1}–{Math.min(from + PAGE_SIZE, total)} de {total} auto{total === 1 ? "" : "s"}
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              {page > 1 ? (
                <Link href={qs(page - 1)} className="rounded-md border px-3 py-1 hover:bg-muted">Anterior</Link>
              ) : (
                <span className="rounded-md border px-3 py-1 opacity-40">Anterior</span>
              )}
              <span>Página {page} de {totalPages}</span>
              {page < totalPages ? (
                <Link href={qs(page + 1)} className="rounded-md border px-3 py-1 hover:bg-muted">Siguiente</Link>
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
