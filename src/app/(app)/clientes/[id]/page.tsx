import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageCircle, Pencil, FileText, ExternalLink, Receipt } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, toneForEstado } from "@/components/ui/badge";
import { Input, Select, Textarea } from "@/components/ui/input";
import { formatARS, formatDate, humanize } from "@/lib/format";
import { rel, type Rel } from "@/lib/rel";
import { agendarSeguimiento, registrarConsulta, registrarContacto } from "../actions";
import { generarDocumentoCliente } from "@/app/(app)/documentos/actions";
import { ESTADO_LABEL, ESTADO_TONE, type EstadoPresupuesto } from "@/app/(app)/presupuestos/lib";

type DocRow = { id: string; tipo: string; numero: string | null; fecha_emision: string };
type PresupuestoRow = { id: string; precio: number | null; estado: EstadoPresupuesto; validez: string | null; created_at: string };

export const dynamic = "force-dynamic";

type Cliente = {
  id: string; empresa_id: string; nombre: string; apellido: string | null;
  telefono: string | null; whatsapp: string | null; email: string | null;
  dni_cuit: string | null; localidad: string | null; origen: string; estado: string;
  presupuesto_aprox: number | null; observaciones: string | null; proximo_seguimiento: string | null;
  created_at: string;
  vendedor: Rel<{ nombre: string; apellido: string }>;
  vehiculo: Rel<{ id: string; marca: string; modelo: string }>;
};

type TipoEvento = "alta" | "seguimiento" | "consulta" | "venta" | "reserva";
type Evento = {
  key: string;
  fecha: string;
  tipo: TipoEvento;
  titulo: string;
  detalle?: string | null;
  estado?: string | null;
};

const TIPO_LABEL: Record<TipoEvento, string> = {
  alta: "Alta", seguimiento: "Seguimiento", consulta: "Consulta", venta: "Venta", reserva: "Reserva",
};
const TIPO_DOT: Record<TipoEvento, string> = {
  alta: "bg-blue-500", seguimiento: "bg-amber-500", consulta: "bg-violet-500",
  venta: "bg-green-600", reserva: "bg-cyan-500",
};

/**
 * Ficha de cliente. El shell (datos de contacto + acciones) se renderiza al
 * instante con una sola consulta; toda la actividad (seguimientos, historial,
 * documentos, presupuestos, ventas/reservas) se transmite por streaming dentro
 * de un Suspense, así el clic se siente inmediato.
 */
export default async function FichaCliente({ params }: { params: { id: string } }) {
  const sb = createClient();
  const [ctx, { data: c }] = await Promise.all([
    getSessionContext(),
    sb
      .from("cliente")
      .select("id,empresa_id,nombre,apellido,telefono,whatsapp,email,dni_cuit,localidad,origen,estado,presupuesto_aprox,observaciones,proximo_seguimiento,created_at,vendedor:vendedor_id(nombre,apellido),vehiculo:vehiculo_interes_id(id,marca,modelo)")
      .eq("id", params.id)
      .maybeSingle<Cliente>(),
  ]);
  const puedeGenerar = can(ctx?.profile?.rol, "documentos.generar");
  if (!c) notFound();

  const vendedor = rel(c.vendedor);
  const interes = rel(c.vehiculo);
  const wa = (c.whatsapp || c.telefono || "").replace(/\D/g, "");
  const presupuestoHref = `/presupuestos/nuevo?cliente=${c.id}${interes ? `&vehiculo=${interes.id}` : ""}`;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-3 flex items-center justify-between">
        <Link href="/clientes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
          <ArrowLeft className="h-4 w-4" /> Volver a clientes
        </Link>
        <div className="flex gap-2">
          {wa && (
            <a href={`https://wa.me/${wa}`} target="_blank">
              <Button variant="outline" size="sm"><MessageCircle className="h-4 w-4 text-ok" /> WhatsApp</Button>
            </a>
          )}
          {puedeGenerar && (
            <Link href={presupuestoHref}>
              <Button variant="outline" size="sm"><Receipt className="h-4 w-4" /> Presupuesto</Button>
            </Link>
          )}
          <Link href={`/clientes/${c.id}/editar`}>
            <Button variant="outline" size="sm"><Pencil className="h-4 w-4" /> Editar</Button>
          </Link>
        </div>
      </div>

      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{c.nombre} {c.apellido}</h1>
          <p className="text-sm text-muted-foreground">{c.localidad ?? "—"} · Origen: {humanize(c.origen)}</p>
        </div>
        <Badge tone={toneForEstado(c.estado)}>{humanize(c.estado)}</Badge>
      </div>

      {/* Datos de contacto: parte del shell, aparece de inmediato. */}
      <Card>
        <CardHeader><CardTitle className="text-base">Datos de contacto</CardTitle></CardHeader>
        <CardContent className="grid gap-x-8 gap-y-1.5 text-sm sm:grid-cols-2">
          <Dato label="Teléfono" value={c.telefono ?? "—"} />
          <Dato label="WhatsApp" value={c.whatsapp ?? "—"} />
          <Dato label="Email" value={c.email ?? "—"} />
          <Dato label="DNI/CUIT" value={c.dni_cuit ?? "—"} />
          <Dato label="Vendedor" value={vendedor ? `${vendedor.nombre} ${vendedor.apellido}` : "—"} />
          <Dato label="Presupuesto aprox." value={formatARS(c.presupuesto_aprox)} />
          <Dato label="Auto de interés" value={interes ? `${interes.marca} ${interes.modelo}` : "—"} />
          <Dato label="Próx. seguimiento" value={formatDate(c.proximo_seguimiento)} />
          {c.observaciones && <p className="mt-2 rounded-md bg-muted p-2 text-xs sm:col-span-2">{c.observaciones}</p>}
        </CardContent>
      </Card>

      <Suspense fallback={<ActividadSkeleton />}>
        <ActividadCliente
          clienteId={c.id}
          createdAt={c.created_at}
          origen={c.origen}
          presupuestoHref={presupuestoHref}
          puedeGenerar={puedeGenerar}
        />
      </Suspense>
    </div>
  );
}

function Dato({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

/** Sección de actividad: se resuelve aparte y se transmite por streaming. */
async function ActividadCliente({
  clienteId, createdAt, origen, presupuestoHref, puedeGenerar,
}: {
  clienteId: string; createdAt: string; origen: string; presupuestoHref: string; puedeGenerar: boolean;
}) {
  const sb = createClient();

  const [{ data: seguimientos }, { data: consultas }, { data: ventas }, { data: reservas }, { data: documentos }, { data: presupuestos }, { data: vehiculos }] = await Promise.all([
    sb.from("seguimiento").select("id,fecha,motivo,notas,estado").eq("cliente_id", clienteId).order("fecha", { ascending: false })
      .returns<{ id: string; fecha: string; motivo: string | null; notas: string | null; estado: string }[]>(),
    sb.from("consulta").select("id,fecha,pendiente,vehiculo:vehiculo_id(marca,modelo)").eq("cliente_id", clienteId).order("fecha", { ascending: false })
      .returns<{ id: string; fecha: string; pendiente: boolean; vehiculo: Rel<{ marca: string; modelo: string }> }[]>(),
    sb.from("venta").select("id,fecha_venta,precio_final,vehiculo:vehiculo_id(marca,modelo)").eq("cliente_id", clienteId).order("fecha_venta", { ascending: false })
      .returns<{ id: string; fecha_venta: string; precio_final: number | null; vehiculo: Rel<{ marca: string; modelo: string }> }[]>(),
    sb.from("reserva").select("id,fecha_reserva,monto_sena,estado,vehiculo:vehiculo_id(marca,modelo)").eq("cliente_id", clienteId).order("fecha_reserva", { ascending: false })
      .returns<{ id: string; fecha_reserva: string; monto_sena: number | null; estado: string; vehiculo: Rel<{ marca: string; modelo: string }> }[]>(),
    sb.from("documento_comercial").select("id,tipo,numero,fecha_emision").eq("cliente_id", clienteId).order("created_at", { ascending: false })
      .returns<DocRow[]>(),
    sb.from("presupuesto").select("id,precio,estado,validez,created_at").eq("cliente_id", clienteId).order("created_at", { ascending: false })
      .returns<PresupuestoRow[]>(),
    // Solo los vehículos para el select de "consultar auto" (no todos los clientes).
    sb.from("vehiculo").select("id,marca,modelo,anio,patente").neq("estado", "vendido").order("created_at", { ascending: false })
      .returns<{ id: string; marca: string; modelo: string; anio: number | null; patente: string | null }[]>(),
  ]);

  const opcionesVehiculos = (vehiculos ?? []).map((v) => ({
    id: v.id,
    label: `${v.marca} ${v.modelo}${v.anio ? ` ${v.anio}` : ""}${v.patente ? ` · ${v.patente}` : ""}`,
  }));

  const eventos: Evento[] = [
    { key: `alta-${clienteId}`, fecha: createdAt, tipo: "alta" as const, titulo: `Alta del cliente · origen ${humanize(origen)}` },
    ...(seguimientos ?? []).map((s) => ({
      key: `seg-${s.id}`, fecha: s.fecha, tipo: "seguimiento" as const,
      titulo: s.motivo ?? "Seguimiento", detalle: s.notas, estado: s.estado,
    })),
    ...(consultas ?? []).map((q) => {
      const veh = rel(q.vehiculo);
      return {
        key: `con-${q.id}`, fecha: q.fecha, tipo: "consulta" as const,
        titulo: `Consultó ${veh ? `${veh.marca} ${veh.modelo}` : "una unidad"}`,
        estado: q.pendiente ? "pendiente" : null,
      };
    }),
    ...(ventas ?? []).map((vt) => {
      const veh = rel(vt.vehiculo);
      return {
        key: `ven-${vt.id}`, fecha: vt.fecha_venta, tipo: "venta" as const,
        titulo: `Compró ${veh ? `${veh.marca} ${veh.modelo}` : "una unidad"}`,
        detalle: formatARS(vt.precio_final),
      };
    }),
    ...(reservas ?? []).map((r) => {
      const veh = rel(r.vehiculo);
      return {
        key: `res-${r.id}`, fecha: r.fecha_reserva, tipo: "reserva" as const,
        titulo: `Reservó ${veh ? `${veh.marca} ${veh.modelo}` : "una unidad"}`,
        detalle: formatARS(r.monto_sena), estado: r.estado,
      };
    }),
  ].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  return (
    <>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* Seguimientos */}
        <Card>
          <CardHeader><CardTitle className="text-base">Seguimientos</CardTitle></CardHeader>
          <CardContent>
            {(seguimientos ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin seguimientos.</p>
            ) : (
              <ul className="mb-3 space-y-2 text-sm">
                {seguimientos!.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-2">
                    <span className="truncate">{formatDate(s.fecha)} · {s.motivo ?? "—"}</span>
                    <Badge tone={toneForEstado(s.estado)}>{humanize(s.estado)}</Badge>
                  </li>
                ))}
              </ul>
            )}
            <form action={agendarSeguimiento.bind(null, clienteId)} className="space-y-2 border-t pt-3">
              <Input name="fecha" type="date" required className="h-8 text-xs" />
              <div className="flex gap-2">
                <Input name="motivo" placeholder="Motivo" className="h-8 text-xs" />
                <Button type="submit" size="sm">Agendar</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Consultas (cliente-auto) */}
        <Card>
          <CardHeader><CardTitle className="text-base">Autos consultados</CardTitle></CardHeader>
          <CardContent>
            {(consultas ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin consultas.</p>
            ) : (
              <ul className="mb-3 space-y-2 text-sm">
                {consultas!.map((q) => {
                  const veh = rel(q.vehiculo);
                  return (
                    <li key={q.id} className="flex items-center justify-between gap-2">
                      <span className="truncate">{veh ? `${veh.marca} ${veh.modelo}` : "—"}</span>
                      {q.pendiente && <Badge tone="warn">Pendiente</Badge>}
                    </li>
                  );
                })}
              </ul>
            )}
            <form action={registrarConsulta.bind(null, clienteId)} className="flex gap-2 border-t pt-3">
              <Select name="vehiculo_id" defaultValue="" className="h-8 text-xs">
                <option value="">Elegir auto…</option>
                {opcionesVehiculos.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
              </Select>
              <Button type="submit" size="sm">+</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Historial de contacto cronológico unificado */}
      <Card className="mt-4">
        <CardHeader><CardTitle className="text-base">Historial de contacto</CardTitle></CardHeader>
        <CardContent>
          <form action={registrarContacto.bind(null, clienteId)} className="mb-4 grid gap-2 rounded-md border bg-muted/40 p-3 sm:grid-cols-[10rem_1fr_auto]">
            <Input name="fecha" type="date" className="h-8 text-xs" defaultValue={new Date().toISOString().slice(0, 10)} />
            <Input name="motivo" placeholder="Motivo (llamada, WhatsApp, visita…)" className="h-8 text-xs" />
            <Button type="submit" size="sm" className="sm:row-span-2">Registrar contacto</Button>
            <Textarea name="notas" placeholder="Notas del contacto (opcional)" className="min-h-[36px] text-xs sm:col-span-2" />
          </form>

          {eventos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin actividad registrada.</p>
          ) : (
            <ol className="relative space-y-3 border-l pl-4">
              {eventos.map((e) => (
                <li key={e.key} className="relative">
                  <span className={`absolute -left-[1.3125rem] top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-card ${TIPO_DOT[e.tipo]}`} />
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-xs tabular-nums text-muted-foreground">{formatDate(e.fecha)}</span>
                    <Badge tone="neutral">{TIPO_LABEL[e.tipo]}</Badge>
                    <span className="font-medium">{e.titulo}</span>
                    {e.estado && <Badge tone={toneForEstado(e.estado)}>{humanize(e.estado)}</Badge>}
                    {e.detalle && <span className="text-muted-foreground">· {e.detalle}</span>}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      {/* Documentos */}
      <Card className="mt-4">
        <CardHeader><CardTitle className="text-base">Documentos</CardTitle></CardHeader>
        <CardContent>
          {puedeGenerar && (
            <div className="mb-3 flex flex-wrap gap-2">
              <form action={generarDocumentoCliente.bind(null, clienteId, "ficha_cliente")}>
                <Button type="submit" variant="outline" size="sm"><FileText className="h-4 w-4" /> Ficha de cliente</Button>
              </form>
              <form action={generarDocumentoCliente.bind(null, clienteId, "datero")}>
                <Button type="submit" variant="outline" size="sm"><FileText className="h-4 w-4" /> Datero</Button>
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

      {/* Presupuestos */}
      <Card className="mt-4">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Presupuestos</CardTitle>
          {puedeGenerar && (
            <Link href={presupuestoHref}>
              <Button variant="outline" size="sm"><FileText className="h-4 w-4" /> Nuevo</Button>
            </Link>
          )}
        </CardHeader>
        <CardContent>
          {(presupuestos ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin presupuestos para este cliente.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {presupuestos!.map((pr) => (
                <li key={pr.id} className="flex items-center justify-between gap-2">
                  <Link href={`/presupuestos/${pr.id}`} className="text-brand-800 hover:underline">
                    {formatARS(pr.precio)} · {formatDate(pr.created_at)}
                  </Link>
                  <Badge tone={ESTADO_TONE[pr.estado]}>{ESTADO_LABEL[pr.estado]}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Ventas y reservas */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Ventas</CardTitle></CardHeader>
          <CardContent>
            {(ventas ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin ventas registradas.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {ventas!.map((vt) => {
                  const veh = rel(vt.vehiculo);
                  return (
                    <li key={vt.id} className="flex items-center justify-between gap-2">
                      <span>{formatDate(vt.fecha_venta)} · {veh ? `${veh.marca} ${veh.modelo}` : "—"}</span>
                      <span className="font-medium">{formatARS(vt.precio_final)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Reservas</CardTitle></CardHeader>
          <CardContent>
            {(reservas ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin reservas.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {reservas!.map((r) => {
                  const veh = rel(r.vehiculo);
                  return (
                    <li key={r.id} className="flex items-center justify-between gap-2">
                      <span>{formatDate(r.fecha_reserva)} · {veh ? `${veh.marca} ${veh.modelo}` : "—"}</span>
                      <span className="flex items-center gap-2"><span>{formatARS(r.monto_sena)}</span><Badge tone={toneForEstado(r.estado)}>{humanize(r.estado)}</Badge></span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

/** Skeleton de la sección de actividad mientras se transmite por streaming. */
function ActividadSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="h-40 rounded-lg border bg-gray-100" />
        <div className="h-40 rounded-lg border bg-gray-100" />
      </div>
      <div className="mt-4 h-48 rounded-lg border bg-gray-100" />
      <div className="mt-4 h-28 rounded-lg border bg-gray-100" />
    </div>
  );
}
