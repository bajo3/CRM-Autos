import Link from "next/link";
import { Plus, Car } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Badge, toneForEstado } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { formatARS, formatNumber, humanize, daysUntil } from "@/lib/format";
import { vtvSeveridad, vtvSeveridadLabel, vtvSeveridadTone } from "@/lib/data/vtv";

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

  // VTV vigente por vehículo (la más próxima a vencer si hay varias): una sola consulta extra, sin N+1.
  const ids = (autos ?? []).map((a) => a.id);
  const { data: vtvs } = ids.length > 0
    ? await sb.from("vtv").select("vehiculo_id,fecha_vencimiento").in("vehiculo_id", ids).order("fecha_vencimiento", { ascending: true })
        .returns<{ vehiculo_id: string; fecha_vencimiento: string | null }[]>()
    : { data: [] as { vehiculo_id: string; fecha_vencimiento: string | null }[] };
  const vtvPorVehiculo = new Map<string, string | null>();
  for (const v of vtvs ?? []) {
    if (!vtvPorVehiculo.has(v.vehiculo_id)) vtvPorVehiculo.set(v.vehiculo_id, v.fecha_vencimiento);
  }

  // Foto de portada por vehículo (principal, o la primera cargada si no hay principal): una sola consulta, sin N+1.
  const { data: fotos } = ids.length > 0
    ? await sb.from("foto_vehiculo").select("vehiculo_id,url,es_principal").in("vehiculo_id", ids)
        .order("es_principal", { ascending: false }).order("orden", { ascending: true })
        .returns<{ vehiculo_id: string; url: string; es_principal: boolean }[]>()
    : { data: [] as { vehiculo_id: string; url: string; es_principal: boolean }[] };
  const fotoPorVehiculo = new Map<string, string>();
  for (const f of fotos ?? []) {
    if (!fotoPorVehiculo.has(f.vehiculo_id)) fotoPorVehiculo.set(f.vehiculo_id, f.url);
  }
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
        <Input
          name="q"
          defaultValue={searchParams.q ?? ""}
          placeholder="Buscar marca, modelo o patente…"
          className="w-full max-w-xs"
        />
        <Select name="estado" defaultValue={searchParams.estado ?? ""} className="w-auto">
          <option value="">Todos los estados</option>
          {ESTADOS.map((e) => (
            <option key={e} value={e}>{humanize(e)}</option>
          ))}
        </Select>
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
        <div className="rounded-xl border border-border/70 bg-card shadow-elevate">
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
                <TH>VTV</TH>
                <TH>Pub.</TH>
              </TR>
            </THead>
            <TBody>
              {autos.map((a) => {
                const foto = fotoPorVehiculo.get(a.id);
                return (
                <TR key={a.id}>
                  <TD>
                    <div className="flex items-center gap-3">
                      <Link href={`/stock/${a.id}`} className="block h-11 w-16 shrink-0 overflow-hidden rounded-md border bg-muted">
                        {foto ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={foto} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                            <Car className="h-4 w-4" />
                          </div>
                        )}
                      </Link>
                      <div>
                        <Link href={`/stock/${a.id}`} className="font-medium text-brand-700 hover:underline">
                          {a.marca} {a.modelo}
                        </Link>
                        {a.version && <span className="block text-xs text-muted-foreground">{a.version}</span>}
                      </div>
                    </div>
                  </TD>
                  <TD>{a.anio ?? "—"}</TD>
                  <TD>{a.kilometros != null ? formatNumber(a.kilometros) : "—"}</TD>
                  <TD className="font-mono text-xs">{a.patente ?? "—"}</TD>
                  <TD className="font-medium">{formatARS(a.precio_venta)}</TD>
                  {verMargen && <TD className="text-ok">{formatARS(a.margen_estimado)}</TD>}
                  <TD><Badge tone={toneForEstado(a.estado)}>{humanize(a.estado)}</Badge></TD>
                  <TD><Badge tone={toneForEstado(a.estado_documental)}>{humanize(a.estado_documental)}</Badge></TD>
                  <TD>
                    {(() => {
                      const fecha = vtvPorVehiculo.get(a.id);
                      if (fecha === undefined) return <span className="text-xs text-muted-foreground">Sin cargar</span>;
                      const sev = vtvSeveridad(daysUntil(fecha));
                      return <Badge tone={vtvSeveridadTone(sev)}>{vtvSeveridadLabel(sev)}</Badge>;
                    })()}
                  </TD>
                  <TD className="text-xs text-muted-foreground">
                    {a.publicado_web ? "Web " : ""}{a.publicado_ml ? "ML" : ""}
                    {!a.publicado_web && !a.publicado_ml ? "—" : ""}
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
