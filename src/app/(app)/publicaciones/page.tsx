import Link from "next/link";
import {
  ExternalLink,
  Globe,
  Share2,
  RefreshCw,
  Plug,
  PlugZap,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { mlConfigurado } from "@/lib/mercadolibre/config";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatARS, humanize } from "@/lib/format";
import { estadoOperativo } from "@/lib/data/vehiculo-estado";
import { contactoPublicoListo } from "@/lib/data/contacto-publico";
import { evaluarPublicacion, type DatosPublicacion } from "@/lib/data/publicacion-completa";
import {
  conectarMercadoLibre,
  desconectarMercadoLibre,
  sincronizarML,
  togglePublicarWeb,
  togglePublicarRedes,
  publicarEnML,
  pausarEnML,
  activarEnML,
  finalizarEnML,
} from "./actions";

export const dynamic = "force-dynamic";

type VehRow = {
  id: string;
  marca: string;
  modelo: string;
  version: string | null;
  anio: number | null;
  precio_venta: number | null;
  estado: string;
  publicado_web: boolean;
  publicado_redes: boolean;
  slug_publico: string | null;
} & DatosPublicacion;
type PubRow = {
  vehiculo_id: string;
  estado: string;
  ml_item_id: string | null;
  permalink: string | null;
  mensaje: string | null;
};
type CuentaRow = {
  ml_user_id: number | null;
  nickname: string | null;
  email: string | null;
  token_expira: string | null;
};

function tonoEstado(estado: string) {
  if (estado === "publicado") return "ok" as const;
  if (estado === "pausado") return "warn" as const;
  if (estado === "vendido") return "info" as const;
  return "neutral" as const;
}

export default async function PublicacionesPage({
  searchParams,
}: {
  searchParams: { ml?: string; detalle?: string };
}) {
  const sb = createClient();
  const ctx = await getSessionContext();
  const puede = can(ctx?.profile?.rol, "mercadolibre.publicar");
  const slugEmpresa = ctx?.empresa?.slug ?? null;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  const [{ data: autos }, { data: pubs }, { data: cuenta }, { data: fotos }] = await Promise.all([
    sb
      .from("vehiculo")
      .select(
        "id,marca,modelo,version,anio,kilometros,precio_venta,precio_costo,patente,chasis,motor,estado_documental,estado,publicado_web,publicado_redes,slug_publico",
      )
      .neq("estado", "vendido")
      .order("created_at", { ascending: false })
      .returns<VehRow[]>(),
    sb
      .from("publicacion")
      .select("vehiculo_id,estado,ml_item_id,permalink,mensaje")
      .eq("canal", "mercadolibre")
      .returns<PubRow[]>(),
    sb
      .from("ml_cuenta")
      .select("ml_user_id,nickname,email,token_expira")
      .eq("empresa_id", ctx?.profile?.empresa_id ?? "")
      .maybeSingle<CuentaRow>(),
    sb.from("foto_vehiculo").select("vehiculo_id").returns<{ vehiculo_id: string }[]>(),
  ]);

  const pubPorVeh = new Map<string, PubRow>();
  for (const p of pubs ?? []) pubPorVeh.set(p.vehiculo_id, p);

  const conectado = Boolean(cuenta?.ml_user_id);
  const contactoListo = Boolean(ctx?.empresa && contactoPublicoListo(ctx.empresa));
  const fotosPorVehiculo = new Map<string, number>();
  for (const foto of fotos ?? []) fotosPorVehiculo.set(foto.vehiculo_id, (fotosPorVehiculo.get(foto.vehiculo_id) ?? 0) + 1);

  return (
    <div>
      <PageHeader
        title="Publicaciones"
        description="Gestioná en qué canales se publica cada unidad: web propia, MercadoLibre y redes."
      />

      {/* Banner de feedback del callback OAuth */}
      {searchParams.ml === "ok" && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          <CheckCircle2 className="h-4 w-4" /> Cuenta de MercadoLibre conectada correctamente.
        </div>
      )}
      {searchParams.ml === "error" && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          <AlertCircle className="h-4 w-4" />
          No se pudo conectar MercadoLibre{searchParams.detalle ? `: ${searchParams.detalle}` : "."}
        </div>
      )}

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        {/* Conexión MercadoLibre */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">MercadoLibre</CardTitle>
          </CardHeader>
          <CardContent>
            {!mlConfigurado() ? (
              <p className="text-sm text-muted-foreground">
                La integración no está configurada (faltan credenciales en el servidor).
              </p>
            ) : conectado ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Badge tone="ok">Conectada</Badge>
                  <span className="font-medium">{cuenta?.nickname ?? "Cuenta ML"}</span>
                  {cuenta?.email && (
                    <span className="text-muted-foreground">· {cuenta.email}</span>
                  )}
                </div>
                {puede && (
                  <div className="flex flex-wrap gap-2">
                    <form action={sincronizarML}>
                      <Button type="submit" variant="outline" size="sm">
                        <RefreshCw className="h-4 w-4" /> Sincronizar estados
                      </Button>
                    </form>
                    <form action={desconectarMercadoLibre}>
                      <Button type="submit" variant="outline" size="sm">
                        <Plug className="h-4 w-4" /> Desconectar
                      </Button>
                    </form>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Conectá tu cuenta de MercadoLibre para publicar unidades desde el CRM.
                </p>
                {puede ? (
                  <form action={conectarMercadoLibre}>
                    <Button type="submit" size="sm">
                      <PlugZap className="h-4 w-4" /> Conectar MercadoLibre
                    </Button>
                  </form>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Necesitás permiso de publicaciones para conectar la cuenta.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Página pública */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stock público</CardTitle>
          </CardHeader>
          <CardContent>
            {slugEmpresa ? (
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">
                  Las unidades marcadas como “Web” aparecen en tu página pública:
                </p>
                <Link
                  href={`/p/${slugEmpresa}`}
                  target="_blank"
                  className="inline-flex items-center gap-1 font-medium text-brand-800 hover:underline"
                >
                  <Globe className="h-4 w-4" />
                  {siteUrl ? `${siteUrl}/p/${slugEmpresa}` : `/p/${slugEmpresa}`}
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">La empresa no tiene slug configurado.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabla de unidades por canal */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Unidades en stock</CardTitle>
        </CardHeader>
        <CardContent>
          {!autos || autos.length === 0 ? (
            <EmptyState
              title="Sin unidades para publicar"
              description="Cargá vehículos en el stock para gestionarlos por canal."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Unidad</th>
                    <th className="py-2 pr-3 font-medium">Web</th>
                    <th className="py-2 pr-3 font-medium">Redes</th>
                    <th className="py-2 pr-3 font-medium">MercadoLibre</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {autos.map((v) => {
                    const pub = pubPorVeh.get(v.id);
                    const estadoML = pub?.estado ?? "borrador";
                    const evaluacion = evaluarPublicacion({ ...v, fotos: fotosPorVehiculo.get(v.id) ?? 0 });
                    return (
                      <tr key={v.id} className="align-top">
                        <td className="py-3 pr-3">
                          <Link href={`/stock/${v.id}`} className="font-medium hover:underline">
                            {v.marca} {v.modelo}
                          </Link>
                          <div className="text-xs text-muted-foreground">
                            {v.anio ?? ""} {v.version ? `· ${v.version}` : ""} · {formatARS(v.precio_venta)}
                          </div>
                          <div className="mt-1">
                            <Badge tone="neutral">{humanize(estadoOperativo(v.estado))}</Badge>
                            <span className={`ml-2 text-xs ${evaluacion.listo ? "text-green-700" : "text-amber-700"}`}>
                              Ficha {evaluacion.porcentaje}%
                            </span>
                          </div>
                          {!evaluacion.listo && <p className="mt-1 max-w-sm text-[11px] text-amber-700">Falta: {evaluacion.faltantes.join(", ")}</p>}
                        </td>

                        {/* Web */}
                        <td className="py-3 pr-3">
                          <div className="flex flex-col items-start gap-1.5">
                            <Badge tone={v.publicado_web ? "ok" : "neutral"}>
                              {v.publicado_web ? "Publicado" : "No publicado"}
                            </Badge>
                            {puede && (v.publicado_web || (contactoListo && evaluacion.listo)) && (
                              <form action={togglePublicarWeb.bind(null, v.id, !v.publicado_web)}>
                                <button
                                  type="submit"
                                  className="text-xs text-brand-800 hover:underline"
                                >
                                  {v.publicado_web ? "Quitar de web" : "Publicar en web"}
                                </button>
                              </form>
                            )}
                            {puede && !v.publicado_web && (!contactoListo || !evaluacion.listo) && (
                              <span className="text-[11px] text-muted-foreground">Completá contacto y ficha para publicar</span>
                            )}
                          </div>
                        </td>

                        {/* Redes */}
                        <td className="py-3 pr-3">
                          <div className="flex flex-col items-start gap-1.5">
                            <Badge tone={v.publicado_redes ? "ok" : "neutral"}>
                              {v.publicado_redes ? "Marcado" : "—"}
                            </Badge>
                            {puede && (
                              <form action={togglePublicarRedes.bind(null, v.id, !v.publicado_redes)}>
                                <button
                                  type="submit"
                                  className="inline-flex items-center gap-1 text-xs text-brand-800 hover:underline"
                                >
                                  <Share2 className="h-3 w-3" />
                                  {v.publicado_redes ? "Desmarcar" : "Marcar"}
                                </button>
                              </form>
                            )}
                          </div>
                        </td>

                        {/* MercadoLibre */}
                        <td className="py-3 pr-3">
                          <div className="flex flex-col items-start gap-1.5">
                            <div className="flex items-center gap-2">
                              <Badge tone={tonoEstado(estadoML)}>{humanize(estadoML)}</Badge>
                              {pub?.permalink && (
                                <a
                                  href={pub.permalink}
                                  target="_blank"
                                  className="inline-flex items-center gap-0.5 text-xs text-brand-800 hover:underline"
                                >
                                  ver <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                            {puede && conectado && (
                              <div className="flex flex-wrap gap-2">
                                {!pub?.ml_item_id ? (
                                  <form action={publicarEnML.bind(null, v.id)}>
                                    <button type="submit" className="text-xs text-brand-800 hover:underline">
                                      Publicar
                                    </button>
                                  </form>
                                ) : (
                                  <>
                                    {estadoML !== "pausado" && (
                                      <form action={pausarEnML.bind(null, v.id)}>
                                        <button type="submit" className="text-xs text-amber-700 hover:underline">
                                          Pausar
                                        </button>
                                      </form>
                                    )}
                                    {estadoML !== "publicado" && (
                                      <form action={activarEnML.bind(null, v.id)}>
                                        <button type="submit" className="text-xs text-green-700 hover:underline">
                                          Activar
                                        </button>
                                      </form>
                                    )}
                                    <form action={finalizarEnML.bind(null, v.id)}>
                                      <button type="submit" className="text-xs text-muted-foreground hover:underline">
                                        Finalizar
                                      </button>
                                    </form>
                                  </>
                                )}
                              </div>
                            )}
                            {pub?.mensaje && (
                              <p className="max-w-xs text-[11px] leading-snug text-red-600" title={pub.mensaje}>
                                {pub.mensaje.length > 120 ? `${pub.mensaje.slice(0, 120)}…` : pub.mensaje}
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
