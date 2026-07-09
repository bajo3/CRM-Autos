import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageCircle, Pencil, FileText, ExternalLink, Receipt, BookmarkPlus, ClipboardCheck, Wrench, HandCoins, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { Button } from "@/components/ui/button";
import { waUrl, mensajeVehiculo } from "@/lib/data/whatsapp";
import { DeleteAutoButton } from "@/components/stock/delete-auto-button";
import { FotosManager } from "@/components/stock/fotos-manager";
import { EstadoDocumentalSelect } from "@/components/stock/estado-documental-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, toneForEstado } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { formatARS, formatNumber, formatDate, daysUntil, humanize } from "@/lib/format";
import { rel, type Rel } from "@/lib/rel";
import { matchEncargosParaVehiculo } from "@/lib/data/matching";
import { vtvSeveridad, vtvSeveridadLabel, vtvSeveridadTone } from "@/lib/data/vtv";
import { agregarGasto, eliminarGasto, crearVtv } from "./actions";
import { generarDocumentoVehiculo } from "@/app/(app)/documentos/actions";

type DocRow = { id: string; tipo: string; numero: string | null; fecha_emision: string };
type TallerRow = {
  id: string; trabajo: string | null; estado: string;
  costo_estimado: number | null; costo_final: number | null;
};
type ReservaRow = {
  id: string; monto_sena: number | null; estado: string;
  cliente: Rel<{ nombre: string; apellido: string }>;
};
type PresupuestoRow = {
  id: string; precio: number | null; estado: string;
  cliente: Rel<{ nombre: string; apellido: string }>;
};
type PermutaOrigenRow = {
  id: string; valor_pretendido: number | null; valor_tasado: number | null;
  cliente: Rel<{ nombre: string; apellido: string }>;
};

export const dynamic = "force-dynamic";

type ConsultaRow = {
  id: string; pendiente: boolean; fecha: string;
  cliente: Rel<{ id: string; nombre: string; apellido: string; telefono: string | null }>;
};

type HistRow = {
  id: string; accion: string; fecha: string;
  valor_anterior: Record<string, unknown> | null;
  valor_nuevo: Record<string, unknown> | null;
  usuario: Rel<{ nombre: string; apellido: string }>;
};

const ACCION_LABEL: Record<string, string> = {
  cambio_precio: "Cambio de precio",
  cambio_estado: "Cambio de estado",
  baja_vehiculo: "Baja del vehículo",
  venta_registrada: "Venta registrada",
};

function describeCambio(h: HistRow): string {
  const a = h.valor_anterior ?? {};
  const n = h.valor_nuevo ?? {};
  if (h.accion === "cambio_precio") {
    return `${formatARS(Number(a.precio_venta ?? 0))} → ${formatARS(Number(n.precio_venta ?? 0))}`;
  }
  if (h.accion === "cambio_estado") {
    return `${humanize(String(a.estado ?? "—"))} → ${humanize(String(n.estado ?? "—"))}`;
  }
  if (h.accion === "venta_registrada" && n.precio_final != null) {
    return `por ${formatARS(Number(n.precio_final))}`;
  }
  return "";
}

function Spec({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value ?? "—"}</dd>
    </div>
  );
}

export default async function FichaVehiculo({ params }: { params: { id: string } }) {
  const sb = createClient();
  const [ctx, { data: v }] = await Promise.all([
    getSessionContext(),
    sb.from("vehiculo").select("*").eq("id", params.id).maybeSingle(),
  ]);
  const rol = ctx?.profile?.rol;
  if (!v) notFound();

  const [{ data: gastos }, { data: vtv }, { data: consultas }, { data: fotos }, { data: documentos }, { data: historial }, { data: trabajosTaller }, { data: reservas }, { data: presupuestos }, { data: permutaOrigen }] = await Promise.all([
    sb.from("gasto_vehiculo").select("*").eq("vehiculo_id", v.id).order("fecha", { ascending: false }),
    sb.from("vtv").select("*").eq("vehiculo_id", v.id).order("fecha_vencimiento", { ascending: false }),
    sb.from("consulta").select("id,pendiente,fecha,cliente:cliente_id(id,nombre,apellido,telefono)").eq("vehiculo_id", v.id).order("fecha", { ascending: false }).returns<ConsultaRow[]>(),
    sb.from("foto_vehiculo").select("id,url,es_principal").eq("vehiculo_id", v.id).order("es_principal", { ascending: false }).order("orden").returns<{ id: string; url: string; es_principal: boolean }[]>(),
    sb.from("documento_comercial").select("id,tipo,numero,fecha_emision").eq("vehiculo_id", v.id).order("created_at", { ascending: false }).returns<DocRow[]>(),
    sb.from("historial_cambio").select("id,accion,fecha,valor_anterior,valor_nuevo,usuario:usuario_id(nombre,apellido)").eq("entidad", "vehiculo").eq("entidad_id", v.id).order("fecha", { ascending: false }).limit(15).returns<HistRow[]>(),
    sb.from("taller_trabajo").select("id,trabajo,estado,costo_estimado,costo_final").eq("vehiculo_id", v.id).order("created_at", { ascending: false }).returns<TallerRow[]>(),
    sb.from("reserva").select("id,monto_sena,estado,cliente:cliente_id(nombre,apellido)").eq("vehiculo_id", v.id).order("created_at", { ascending: false }).returns<ReservaRow[]>(),
    sb.from("presupuesto").select("id,precio,estado,cliente:cliente_id(nombre,apellido)").eq("vehiculo_id", v.id).order("created_at", { ascending: false }).returns<PresupuestoRow[]>(),
    v.permuta_origen_id
      ? sb.from("permuta").select("id,valor_pretendido,valor_tasado,cliente:cliente_id(nombre,apellido)").eq("id", v.permuta_origen_id).maybeSingle<PermutaOrigenRow>()
      : Promise.resolve({ data: null as PermutaOrigenRow | null }),
  ]);

  const totalGastos = (gastos ?? []).reduce((s, g) => s + Number(g.monto ?? 0), 0);
  const margenNeto = Number(v.margen_estimado ?? 0) - totalGastos;
  const verMargen = can(rol, "margenes.ver");
  const verCostos = can(rol, "costos.ver");
  const interesadosPendientes = (consultas ?? []).filter((c) => c.pendiente);

  // Matching: encargos activos compatibles con esta unidad.
  const encargosCompatibles = v.estado === "vendido"
    ? []
    : await matchEncargosParaVehiculo(v.id, {
        marca: v.marca, modelo: v.modelo, anio: v.anio,
        kilometros: v.kilometros, precio_venta: v.precio_venta,
      });

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-3 flex items-center justify-between">
        <Link href="/stock" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
          <ArrowLeft className="h-4 w-4" /> Volver al stock
        </Link>
        <div className="flex gap-2">
          {can(rol, "stock.editar") && (
            <Link href={`/stock/${v.id}/editar`}>
              <Button variant="outline" size="sm"><Pencil className="h-4 w-4" /> Editar</Button>
            </Link>
          )}
          {can(rol, "stock.eliminar") && <DeleteAutoButton id={v.id} />}
        </div>
      </div>

      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {v.marca} {v.modelo} {v.anio ? `· ${v.anio}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground">{v.version}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone={toneForEstado(v.estado)}>{humanize(v.estado)}</Badge>
          <Badge tone={toneForEstado(v.estado_documental)}>Doc: {humanize(v.estado_documental)}</Badge>
          <Badge tone="info">{humanize(v.titularidad)}</Badge>
        </div>
      </div>

      {v.estado !== "vendido" && (
        <div className="mb-5 flex flex-wrap gap-2">
          {can(rol, "documentos.generar") && (
            <Link href={`/presupuestos/nuevo?vehiculo=${v.id}`}>
              <Button variant="outline" size="sm"><Receipt className="h-4 w-4" /> Presupuestar</Button>
            </Link>
          )}
          <Link href={`/reservas/nuevo?vehiculo=${v.id}`}>
            <Button variant="outline" size="sm"><BookmarkPlus className="h-4 w-4" /> Reservar</Button>
          </Link>
          {can(rol, "ventas.crear") && (
            <Link href={`/ventas/nuevo?vehiculo=${v.id}&precio=${v.precio_venta ?? ""}`}>
              <Button variant="outline" size="sm"><HandCoins className="h-4 w-4" /> Vender</Button>
            </Link>
          )}
          <Link href={`/test-drive/nuevo?vehiculo=${v.id}`}>
            <Button variant="outline" size="sm"><ClipboardCheck className="h-4 w-4" /> Test Drive</Button>
          </Link>
          {can(rol, "stock.editar") && (
            <Link href={`/taller/nuevo?vehiculo=${v.id}`}>
              <Button variant="outline" size="sm"><Wrench className="h-4 w-4" /> Taller</Button>
            </Link>
          )}
          <a
            href={waUrl(mensajeVehiculo(ctx?.empresa?.nombre ?? "nuestra agencia", {
              marca: v.marca, modelo: v.modelo, anio: v.anio, precio: v.precio_venta,
            }))}
            target="_blank"
          >
            <Button variant="outline" size="sm"><MessageCircle className="h-4 w-4" /> Compartir por WhatsApp</Button>
          </a>
        </div>
      )}

      {v.estado === "vendido" && interesadosPendientes.length > 0 && (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          ⚠️ Este auto está vendido pero hay <strong>{interesadosPendientes.length} interesado(s) pendiente(s)</strong>.
          Buen momento para ofrecerles una unidad similar.
        </div>
      )}

      {permutaOrigen && (
        <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          🔄 Esta unidad vino de una <strong>permuta</strong>
          {(() => {
            const c = rel(permutaOrigen.cliente);
            return c ? ` con ${c.nombre} ${c.apellido}` : "";
          })()}
          {permutaOrigen.valor_tasado != null && ` · tasado en ${formatARS(permutaOrigen.valor_tasado)}`}
          {" · "}
          <Link href="/permutas" className="underline">ver permutas</Link>
        </div>
      )}

      {encargosCompatibles.length > 0 && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          🎯 Este auto coincide con <strong>{encargosCompatibles.length} encargo(s) activo(s)</strong>:
          <ul className="mt-1 space-y-0.5">
            {encargosCompatibles.map((e) => (
              <li key={e.id} className="flex items-center gap-2">
                • {e.clienteData ? `${e.clienteData.nombre} ${e.clienteData.apellido}` : "Cliente"}
                {" — busca "}{e.marca_buscada} {e.modelo_buscado}
                <Badge tone={e.urgencia === "alta" ? "danger" : "warn"}>{humanize(e.urgencia)}</Badge>
                {e.clienteData?.telefono && (
                  <a href={`https://wa.me/${e.clienteData.telefono.replace(/\D/g, "")}`} target="_blank" className="text-ok" title="WhatsApp">
                    <MessageCircle className="inline h-4 w-4" />
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Especificaciones */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Especificaciones</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Spec label="Kilómetros" value={v.kilometros != null ? formatNumber(v.kilometros) : "—"} />
              <Spec label="Patente" value={v.patente} />
              <Spec label="Último dígito" value={v.ultimo_digito} />
              <Spec label="Combustible" value={humanize(v.combustible)} />
              <Spec label="Transmisión" value={humanize(v.transmision)} />
              <Spec label="Color" value={v.color} />
              <Spec label="Chasis" value={v.chasis} />
              <Spec label="Motor" value={v.motor} />
              <Spec label="Ingreso" value={formatDate(v.fecha_ingreso)} />
              <Spec label="Ubicación" value={v.ubicacion} />
            </dl>
            {v.observaciones && (
              <p className="mt-4 rounded-md bg-muted p-3 text-sm">{v.observaciones}</p>
            )}
          </CardContent>
        </Card>

        {/* Precios y rentabilidad */}
        <Card>
          <CardHeader><CardTitle className="text-base">Precios y rentabilidad</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Precio venta</span><span className="font-semibold">{formatARS(v.precio_venta)}</span></div>
            {verCostos && <div className="flex justify-between"><span className="text-muted-foreground">Costo / toma</span><span>{formatARS(v.precio_costo)}</span></div>}
            {verMargen && <div className="flex justify-between"><span className="text-muted-foreground">Margen bruto</span><span className="text-ok">{formatARS(v.margen_estimado)}</span></div>}
            {verCostos && <div className="flex justify-between"><span className="text-muted-foreground">Gastos</span><span className="text-danger">{formatARS(totalGastos)}</span></div>}
            {verMargen && (
              <div className="flex justify-between border-t pt-2 font-semibold">
                <span>Margen neto</span>
                <span className={margenNeto >= 0 ? "text-ok" : "text-danger"}>{formatARS(margenNeto)}</span>
              </div>
            )}
            {!verMargen && !verCostos && (
              <p className="text-xs text-muted-foreground">Tu rol no tiene acceso a costos ni márgenes.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Fotos + Documentación */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Fotos</CardTitle></CardHeader>
          <CardContent>
            {can(rol, "stock.editar") ? (
              <FotosManager vehiculoId={v.id} empresaId={v.empresa_id} fotos={fotos ?? []} />
            ) : (fotos ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin fotos cargadas.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {(fotos ?? []).map((f) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={f.id} src={f.url} alt="Foto" className="aspect-[4/3] w-full rounded-md border object-cover" />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Documentación</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">Estado documental general:</p>
            {can(rol, "stock.editar") ? (
              <EstadoDocumentalSelect vehiculoId={v.id} value={v.estado_documental} />
            ) : (
              <Badge tone={toneForEstado(v.estado_documental)}>{humanize(v.estado_documental)}</Badge>
            )}
            <p className="pt-2 text-xs text-muted-foreground">
              El control documental por ítem (cédula, título, seguro, etc.) se modela en <code className="rounded bg-muted px-1">documento_vehiculo</code>; la carga detallada queda para una próxima iteración.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {/* Interesados */}
        <Card>
          <CardHeader><CardTitle className="text-base">Interesados ({consultas?.length ?? 0})</CardTitle></CardHeader>
          <CardContent>
            {!consultas || consultas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin consultas registradas.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {consultas.map((c) => {
                  const cli = rel(c.cliente);
                  return (
                    <li key={c.id} className="flex items-center justify-between gap-2">
                      <span>{cli?.nombre} {cli?.apellido}</span>
                      <div className="flex items-center gap-2">
                        {c.pendiente && <Badge tone="warn">Pendiente</Badge>}
                        {cli?.telefono && (
                          <a href={`https://wa.me/${cli.telefono.replace(/\D/g, "")}`} target="_blank"
                            className="text-ok hover:opacity-80" title="WhatsApp">
                            <MessageCircle className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Gastos */}
        <Card>
          <CardHeader><CardTitle className="text-base">Gastos ({gastos?.length ?? 0})</CardTitle></CardHeader>
          <CardContent>
            {!gastos || gastos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin gastos cargados.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {gastos.map((g) => (
                  <li key={g.id} className="flex items-center justify-between gap-2">
                    <span className="truncate">{humanize(g.tipo)}{g.concepto ? ` · ${g.concepto}` : ""}</span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="text-danger">{formatARS(g.monto)}</span>
                      {can(rol, "stock.editar") && (
                        <form action={eliminarGasto.bind(null, v.id, g.id)}>
                          <button type="submit" className="text-muted-foreground hover:text-danger" title="Eliminar"><Trash2 className="h-3.5 w-3.5" /></button>
                        </form>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {can(rol, "stock.editar") && (
              <form action={agregarGasto.bind(null, v.id)} className="mt-3 space-y-2 border-t pt-3">
                <Select name="tipo" defaultValue="otros" className="h-8 text-xs">
                  <option value="lavado">Lavado</option>
                  <option value="detailing">Detailing</option>
                  <option value="mecanica">Mecánica</option>
                  <option value="cubiertas">Cubiertas</option>
                  <option value="bateria">Batería</option>
                  <option value="gestoria">Gestoría</option>
                  <option value="verificacion_policial">Verif. policial</option>
                  <option value="vtv">VTV</option>
                  <option value="publicidad">Publicidad</option>
                  <option value="traslado">Traslado</option>
                  <option value="reparaciones">Reparaciones</option>
                  <option value="otros">Otros</option>
                </Select>
                <Input name="concepto" placeholder="Concepto" className="h-8 text-xs" />
                <div className="flex gap-2">
                  <MoneyInput name="monto" placeholder="Monto" required className="h-8 pl-7 text-xs" />
                  <Button type="submit" size="sm">Agregar</Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        {/* VTV */}
        <Card>
          <CardHeader><CardTitle className="text-base">VTV</CardTitle></CardHeader>
          <CardContent>
            {!vtv || vtv.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin registros de VTV.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {vtv.map((t) => {
                  const sev = vtvSeveridad(daysUntil(t.fecha_vencimiento));
                  return (
                    <li key={t.id} className="flex items-center justify-between gap-2">
                      <span>Vence {formatDate(t.fecha_vencimiento)}</span>
                      <Badge tone={vtvSeveridadTone(sev)}>{vtvSeveridadLabel(sev)}</Badge>
                    </li>
                  );
                })}
              </ul>
            )}

            {can(rol, "stock.editar") && (
              <form action={crearVtv.bind(null, v.id)} className="mt-3 space-y-2 border-t pt-3">
                <Input name="patente" defaultValue={v.patente ?? ""} placeholder="Patente" className="h-8 text-xs" />
                <div className="flex gap-2">
                  <Input name="fecha_vencimiento" type="date" className="h-8 text-xs" title="Dejar vacío para calcular por patente" />
                  <Button type="submit" size="sm">Cargar</Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Si dejás la fecha vacía, se calcula desde el último dígito de la patente y el calendario de la empresa.
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reservas y presupuestos */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Reservas ({reservas?.length ?? 0})</CardTitle></CardHeader>
          <CardContent>
            {!reservas || reservas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin reservas para este vehículo.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {reservas.map((r) => {
                  const c = rel(r.cliente);
                  return (
                    <li key={r.id} className="flex items-center justify-between gap-2">
                      <span>{c ? `${c.nombre} ${c.apellido}` : "—"} · {formatARS(r.monto_sena)}</span>
                      <Badge tone={toneForEstado(r.estado)}>{humanize(r.estado)}</Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Presupuestos ({presupuestos?.length ?? 0})</CardTitle></CardHeader>
          <CardContent>
            {!presupuestos || presupuestos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin presupuestos para este vehículo.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {presupuestos.map((p) => {
                  const c = rel(p.cliente);
                  return (
                    <li key={p.id} className="flex items-center justify-between gap-2">
                      <Link href={`/presupuestos/${p.id}`} className="text-brand-800 hover:underline">
                        {c ? `${c.nombre} ${c.apellido}` : "—"} · {formatARS(p.precio)}
                      </Link>
                      <Badge tone={toneForEstado(p.estado)}>{humanize(p.estado)}</Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Documentos */}
      <Card className="mt-4">
        <CardHeader><CardTitle className="text-base">Documentos</CardTitle></CardHeader>
        <CardContent>
          {can(rol, "documentos.generar") && (
            <div className="mb-3">
              <form action={generarDocumentoVehiculo.bind(null, v.id, "ficha_vehiculo")}>
                <Button type="submit" variant="outline" size="sm"><FileText className="h-4 w-4" /> Ficha de vehículo</Button>
              </form>
            </div>
          )}
          {(documentos ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin documentos generados.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {documentos!.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-2">
                  <span><span className="font-mono text-xs text-muted-foreground">{d.numero}</span> · {humanize(d.tipo)} · {formatDate(d.fecha_emision)}</span>
                  <Link href={`/documentos/${d.id}/abrir`} target="_blank" className="inline-flex items-center gap-1 text-brand-800 hover:underline">
                    <ExternalLink className="h-4 w-4" /> Abrir
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Taller / Preparación */}
      <Card className="mt-4">
        <CardHeader><CardTitle className="text-base">Taller / Preparación</CardTitle></CardHeader>
        <CardContent>
          {can(rol, "stock.editar") && (
            <div className="mb-3">
              <Link href={`/taller/nuevo?vehiculo=${v.id}`}>
                <Button type="button" variant="outline" size="sm"><Wrench className="h-4 w-4" /> Cargar trabajo</Button>
              </Link>
            </div>
          )}
          {(trabajosTaller ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin trabajos de taller cargados.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {trabajosTaller!.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2">
                  <span>{t.trabajo}</span>
                  <span className="flex items-center gap-2 shrink-0">
                    <span className="text-muted-foreground">{formatARS(t.costo_final ?? t.costo_estimado)}</span>
                    <Badge tone={toneForEstado(t.estado)}>{humanize(t.estado)}</Badge>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Historial de cambios */}
      <Card className="mt-4">
        <CardHeader><CardTitle className="text-base">Historial de cambios</CardTitle></CardHeader>
        <CardContent>
          {(historial ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin cambios registrados todavía.</p>
          ) : (
            <ul className="space-y-2">
              {historial!.map((h) => {
                const u = rel(h.usuario);
                return (
                  <li key={h.id} className="flex items-start gap-3 text-sm">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-300" />
                    <div className="flex-1">
                      <span className="font-medium">{ACCION_LABEL[h.accion] ?? humanize(h.accion)}</span>
                      {describeCambio(h) && <span className="text-muted-foreground"> · {describeCambio(h)}</span>}
                      <div className="text-xs text-muted-foreground">
                        {formatDate(h.fecha)}
                        {u ? ` · ${u.nombre} ${u.apellido}` : ""}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
