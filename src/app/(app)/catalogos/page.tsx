import { headers } from "next/headers";
import { FileText, ExternalLink, MessageCircle, Trash2, Globe } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatARS, formatDate, humanize } from "@/lib/format";
import { waUrl, mensajeCatalogo } from "@/lib/data/whatsapp";
import { CatalogoPublico } from "@/components/catalogos/catalogo-publico";
import { generarCatalogo, eliminarCatalogo } from "./actions";

export const dynamic = "force-dynamic";

const ESTADOS = ["disponible", "en_preparacion", "publicado", "reservado", "en_negociacion"];

const ORDENES: Record<string, { col: string; asc: boolean; label: string }> = {
  recientes: { col: "created_at", asc: false, label: "Más recientes" },
  precio_desc: { col: "precio_venta", asc: false, label: "Precio: mayor a menor" },
  precio_asc: { col: "precio_venta", asc: true, label: "Precio: menor a mayor" },
  anio_desc: { col: "anio", asc: false, label: "Año: más nuevos" },
  marca: { col: "marca", asc: true, label: "Marca (A-Z)" },
};

type VehRow = {
  id: string; marca: string; modelo: string; version: string | null;
  anio: number | null; kilometros: number | null; precio_venta: number | null; estado: string;
};
type CatRow = {
  id: string; nombre: string | null; vehiculo_ids: string[]; pdf_url: string | null; created_at: string;
};

export default async function CatalogosPage({
  searchParams,
}: {
  searchParams: { estado?: string; q?: string; orden?: string };
}) {
  const sb = createClient();
  const ctx = await getSessionContext();
  const empresaNombre = ctx?.empresa?.nombre ?? "nuestra agencia";
  const slug = ctx?.empresa?.slug ?? null;
  const puedeGenerar = can(ctx?.profile?.rol, "catalogo.generar");
  const estado = searchParams.estado ?? "disponible";
  const orden = ORDENES[searchParams.orden ?? ""] ? searchParams.orden! : "recientes";

  // URL absoluta de la vitrina pública para compartir (mismo host de la app).
  const h = headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  const publicUrl = slug && host ? `${proto}://${host}/p/${slug}` : null;

  const ord = ORDENES[orden];
  let query = sb
    .from("vehiculo")
    .select("id,marca,modelo,version,anio,kilometros,precio_venta,estado")
    .neq("estado", "vendido")
    .order(ord.col, { ascending: ord.asc, nullsFirst: false });
  if (estado && ESTADOS.includes(estado)) query = query.eq("estado", estado as never);
  if (searchParams.q) {
    query = query.or(`marca.ilike.%${searchParams.q}%,modelo.ilike.%${searchParams.q}%`);
  }

  const [{ data: autos }, { data: catalogos }] = await Promise.all([
    query.returns<VehRow[]>(),
    sb.from("catalogo_pdf").select("id,nombre,vehiculo_ids,pdf_url,created_at").order("created_at", { ascending: false }).returns<CatRow[]>(),
  ]);

  return (
    <div>
      <PageHeader
        title="Catálogos"
        description="Tu vitrina web pública + catálogos de stock en PDF para compartir por WhatsApp."
      />

      {/* Vitrina web pública (link compartible) */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-4 w-4 text-brand-700" /> Catálogo web público
          </CardTitle>
        </CardHeader>
        <CardContent>
          {publicUrl ? (
            <CatalogoPublico url={publicUrl} empresaNombre={empresaNombre} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Configurá el identificador público (slug) de tu agencia en{" "}
              <a href="/configuracion" className="text-brand-800 hover:underline">Configuración</a>{" "}
              para activar tu vitrina online.
            </p>
          )}
        </CardContent>
      </Card>

      {puedeGenerar && (
        <Card className="mb-4">
          <CardHeader><CardTitle className="text-base">Nuevo catálogo PDF</CardTitle></CardHeader>
          <CardContent>
            {/* Filtro (GET) */}
            <form method="get" action="/catalogos" className="mb-3 flex flex-wrap items-center gap-2">
              <input
                name="q" defaultValue={searchParams.q ?? ""} placeholder="Buscar marca o modelo…"
                className="h-9 w-full max-w-xs rounded-md border border-input bg-white px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <select name="estado" defaultValue={estado} className="h-9 rounded-md border border-input bg-white px-3 text-sm shadow-sm">
                <option value="">Todos (menos vendidos)</option>
                {ESTADOS.map((e) => <option key={e} value={e}>{humanize(e)}</option>)}
              </select>
              <select name="orden" defaultValue={orden} className="h-9 rounded-md border border-input bg-white px-3 text-sm shadow-sm">
                {Object.entries(ORDENES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <Button type="submit" variant="outline" size="sm">Filtrar</Button>
            </form>

            {/* Selección + generación (POST) */}
            {!autos || autos.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay vehículos que coincidan con el filtro.</p>
            ) : (
              <form action={generarCatalogo} className="space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <label htmlFor="nombre" className="mb-1 block text-sm font-medium">Nombre del catálogo</label>
                    <input
                      id="nombre" name="nombre" defaultValue={`Catálogo ${formatDate(new Date())}`}
                      className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                  <Button type="submit"><FileText className="h-4 w-4" /> Generar catálogo PDF</Button>
                </div>

                <div className="max-h-80 divide-y overflow-y-auto rounded-md border">
                  {autos.map((a) => (
                    <label key={a.id} className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-muted/50">
                      <input type="checkbox" name="vehiculo_ids" value={a.id} defaultChecked className="h-4 w-4 rounded border-input" />
                      <span className="flex-1">
                        <span className="font-medium">{a.marca} {a.modelo}</span>
                        <span className="text-muted-foreground"> {a.anio ?? ""} {a.version ? `· ${a.version}` : ""}</span>
                      </span>
                      <span className="font-medium">{formatARS(a.precio_venta)}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">{autos.length} unidad(es) en el filtro. Destildá las que no quieras incluir.</p>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {/* Historial */}
      <Card>
        <CardHeader><CardTitle className="text-base">Catálogos generados</CardTitle></CardHeader>
        <CardContent>
          {!catalogos || catalogos.length === 0 ? (
            <EmptyState title="Sin catálogos todavía" description="Generá tu primer catálogo arriba y compartilo por WhatsApp." />
          ) : (
            <ul className="divide-y">
              {catalogos.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <div className="text-sm">
                    <span className="font-medium">{c.nombre ?? "Catálogo"}</span>
                    <span className="text-muted-foreground"> · {c.vehiculo_ids?.length ?? 0} unidad(es) · {formatDate(c.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {c.pdf_url && (
                      <>
                        <a href={c.pdf_url} target="_blank" className="inline-flex items-center gap-1 text-sm text-brand-800 hover:underline">
                          <ExternalLink className="h-4 w-4" /> Abrir
                        </a>
                        <a href={waUrl(mensajeCatalogo(empresaNombre, c.pdf_url))} target="_blank" className="inline-flex items-center gap-1 text-sm text-ok hover:underline">
                          <MessageCircle className="h-4 w-4" /> WhatsApp
                        </a>
                      </>
                    )}
                    {puedeGenerar && (
                      <form action={eliminarCatalogo.bind(null, c.id)}>
                        <button type="submit" className="text-muted-foreground hover:text-danger" title="Eliminar catálogo">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </form>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
