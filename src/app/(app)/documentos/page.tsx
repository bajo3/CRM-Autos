import Link from "next/link";
import { Suspense } from "react";
import { FileText, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { getFormOptions } from "@/lib/data/options";
import { can } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea, Label } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/format";
import { rel, type Rel } from "@/lib/rel";
import {
  generarPresupuesto,
  generarAutorizacionTestDrive,
  generarAutorizacionConducir,
  generarDateroDesdeCliente,
} from "./actions";

export const dynamic = "force-dynamic";

const TIPO_LABEL: Record<string, string> = {
  recibo_sena: "Recibo de seña",
  recibo_pago: "Recibo de pago",
  boleto: "Boleto de compraventa",
  presupuesto: "Presupuesto",
  datero: "Datero",
  ficha_cliente: "Ficha de cliente",
  ficha_vehiculo: "Ficha de vehículo",
  autorizacion_test_drive: "Autorización test drive",
  autorizacion_entrega: "Autorización de entrega",
  autorizacion_retiro_doc: "Autorización retiro doc.",
  autorizacion_conducir: "Autorización para conducir",
};

type Row = {
  id: string; tipo: string; numero: string | null; fecha_emision: string; pdf_url: string | null;
  cliente: Rel<{ nombre: string; apellido: string | null }>;
  vehiculo: Rel<{ marca: string; modelo: string }>;
};

const PAGE_SIZE = 30;

function FormulariosSkeleton() {
  return (
    <div className="mb-4 space-y-4">
      <div className="h-64 animate-pulse rounded-lg border bg-gray-100" />
      <div className="h-56 animate-pulse rounded-lg border bg-gray-100" />
    </div>
  );
}

function Seccion({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <p className="mb-3 text-sm text-muted-foreground">{description}</p>
      {children}
    </div>
  );
}

/** Formularios de generación: necesitan opts (clientes/vehículos), se streamean aparte del listado. */
async function NuevosDocumentos() {
  const opts = await getFormOptions();

  return (
    <>
      <Seccion title="Compra y venta" description="Presupuestos, recibos y boleto de compraventa.">
        <Card className="mb-4">
          <CardHeader><CardTitle className="text-base">Nuevo presupuesto</CardTitle></CardHeader>
          <CardContent>
            <form action={generarPresupuesto} className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="cliente_id">Cliente</Label>
                <Select id="cliente_id" name="cliente_id" defaultValue="">
                  <option value="">— Sin cliente —</option>
                  {opts.clientes.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </Select>
              </div>
              <div>
                <Label htmlFor="vehiculo_id">Vehículo</Label>
                <Select id="vehiculo_id" name="vehiculo_id" defaultValue="">
                  <option value="">— Sin vehículo —</option>
                  {opts.vehiculos.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
                </Select>
              </div>
              <div>
                <Label htmlFor="precio">Precio</Label>
                <MoneyInput id="precio" name="precio" required />
              </div>
              <div>
                <Label htmlFor="forma_pago">Forma de pago</Label>
                <Input id="forma_pago" name="forma_pago" placeholder="Efectivo, transferencia…" />
              </div>
              <div>
                <Label htmlFor="financiacion">Financiación</Label>
                <Input id="financiacion" name="financiacion" placeholder="Ej.: 12 cuotas s/interés" />
              </div>
              <div>
                <Label htmlFor="permuta">Permuta</Label>
                <Input id="permuta" name="permuta" placeholder="Ej.: toma usado" />
              </div>
              <div>
                <Label htmlFor="validez">Válido hasta</Label>
                <Input id="validez" name="validez" type="date" />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="observaciones">Observaciones</Label>
                <Textarea id="observaciones" name="observaciones" placeholder="Detalles del presupuesto (opcional)" />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit"><FileText className="h-4 w-4" /> Generar presupuesto PDF</Button>
              </div>
            </form>
            <p className="mt-4 text-sm text-muted-foreground">
              Los recibos de seña, recibos de pago y el boleto de compraventa se generan desde la ficha de cada venta.
            </p>
          </CardContent>
        </Card>
      </Seccion>

      <Seccion
        title="Datero y autorización para conducir"
        description="Registrá los datos de un interesado o autorizá a un tercero a circular con un vehículo."
      >
        <Card className="mb-4">
          <CardHeader><CardTitle className="text-base">Nuevo datero</CardTitle></CardHeader>
          <CardContent>
            <form action={generarDateroDesdeCliente} className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="datero_cliente">Cliente</Label>
                <Select id="datero_cliente" name="cliente_id" defaultValue="" required>
                  <option value="">— Elegir cliente —</option>
                  {opts.clientes.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Button type="submit"><FileText className="h-4 w-4" /> Generar datero PDF</Button>
              </div>
            </form>
            <p className="mt-3 text-sm text-muted-foreground">
              El datero toma los datos ya cargados del cliente (contacto, vehículo de interés y presupuesto).
            </p>
          </CardContent>
        </Card>

        <Card className="mb-4">
          <CardHeader><CardTitle className="text-base">Autorización para conducir</CardTitle></CardHeader>
          <CardContent>
            <form action={generarAutorizacionConducir} className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="ac_vehiculo">Vehículo</Label>
                <Select id="ac_vehiculo" name="vehiculo_id" defaultValue="">
                  <option value="">— Elegir vehículo —</option>
                  {opts.vehiculos.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
                </Select>
              </div>
              <div>
                <Label htmlFor="ac_conductor_nombre">Conductor</Label>
                <Input id="ac_conductor_nombre" name="conductor_nombre" required placeholder="Nombre y apellido" />
              </div>
              <div>
                <Label htmlFor="ac_conductor_dni">DNI</Label>
                <Input id="ac_conductor_dni" name="conductor_dni" placeholder="DNI del conductor" />
              </div>
              <div>
                <Label htmlFor="ac_conductor_licencia">Licencia</Label>
                <Input id="ac_conductor_licencia" name="conductor_licencia" placeholder="N.º de licencia" />
              </div>
              <div>
                <Label htmlFor="ac_motivo">Motivo / destino</Label>
                <Input id="ac_motivo" name="motivo" placeholder="Ej.: traslado, trámite…" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="ac_desde">Desde</Label>
                  <Input id="ac_desde" name="fecha_desde" type="date" />
                </div>
                <div>
                  <Label htmlFor="ac_hasta">Hasta</Label>
                  <Input id="ac_hasta" name="fecha_hasta" type="date" />
                </div>
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="ac_observaciones">Observaciones</Label>
                <Textarea id="ac_observaciones" name="observaciones" placeholder="Detalles adicionales (opcional)" />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit"><FileText className="h-4 w-4" /> Generar autorización PDF</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </Seccion>

      <Seccion title="Prueba de manejo" description="Autorización de prueba de manejo del vehículo en el local.">
        <Card className="mb-4">
          <CardHeader><CardTitle className="text-base">Autorización de prueba de manejo</CardTitle></CardHeader>
          <CardContent>
            <form action={generarAutorizacionTestDrive} className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="td_vehiculo">Vehículo</Label>
                <Select id="td_vehiculo" name="vehiculo_id" defaultValue="">
                  <option value="">— Elegir vehículo —</option>
                  {opts.vehiculos.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
                </Select>
              </div>
              <div>
                <Label htmlFor="td_cliente">Cliente (opcional)</Label>
                <Select id="td_cliente" name="cliente_id" defaultValue="">
                  <option value="">— Sin cliente —</option>
                  {opts.clientes.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </Select>
              </div>
              <div>
                <Label htmlFor="conductor_nombre">Conductor</Label>
                <Input id="conductor_nombre" name="conductor_nombre" required placeholder="Nombre y apellido" />
              </div>
              <div>
                <Label htmlFor="conductor_dni">DNI</Label>
                <Input id="conductor_dni" name="conductor_dni" placeholder="DNI del conductor" />
              </div>
              <div>
                <Label htmlFor="conductor_licencia">Licencia</Label>
                <Input id="conductor_licencia" name="conductor_licencia" placeholder="N.º de licencia" />
              </div>
              <div>
                <Label htmlFor="td_fecha">Fecha</Label>
                <Input id="td_fecha" name="fecha" type="date" />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit"><FileText className="h-4 w-4" /> Generar autorización PDF</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </Seccion>
    </>
  );
}

export default async function DocumentosPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const sb = createClient();

  const page = Math.max(1, Number(searchParams.page) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const [ctx, { data, count }] = await Promise.all([
    getSessionContext(),
    sb
      .from("documento_comercial")
      .select("id,tipo,numero,fecha_emision,pdf_url,cliente:cliente_id(nombre,apellido),vehiculo:vehiculo_id(marca,modelo)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to)
      .returns<Row[]>(),
  ]);
  const puedeGenerar = can(ctx?.profile?.rol, "documentos.generar");
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <PageHeader
        title="Documentos comerciales"
        description="Generá presupuestos, dateros y autorizaciones en PDF, organizados por tipo. Los recibos y boletos salen de cada venta."
      />

      {puedeGenerar && (
        <Suspense fallback={<FormulariosSkeleton />}>
          <NuevosDocumentos />
        </Suspense>
      )}

      {!data || data.length === 0 ? (
        <EmptyState title="No hay documentos generados" description="Generá un presupuesto acá, o recibos y boletos desde la ficha de cada venta." />
      ) : (
        <>
          <div className="rounded-lg border bg-card">
            <Table>
              <THead><TR><TH>N.º</TH><TH>Tipo</TH><TH>Cliente</TH><TH>Vehículo</TH><TH>Fecha</TH><TH></TH></TR></THead>
              <TBody>
                {data.map((d) => {
                  const c = rel(d.cliente);
                  const veh = rel(d.vehiculo);
                  return (
                    <TR key={d.id}>
                      <TD className="font-mono text-xs">{d.numero ?? "—"}</TD>
                      <TD className="font-medium">{TIPO_LABEL[d.tipo] ?? d.tipo}</TD>
                      <TD>{c ? `${c.nombre} ${c.apellido ?? ""}` : "—"}</TD>
                      <TD>{veh ? `${veh.marca} ${veh.modelo}` : "—"}</TD>
                      <TD>{formatDate(d.fecha_emision)}</TD>
                      <TD>
                        {d.pdf_url ? (
                          <Link href={`/documentos/${d.id}/abrir`} target="_blank" className="inline-flex items-center gap-1 text-sm text-brand-800 hover:underline">
                            <ExternalLink className="h-4 w-4" /> Abrir
                          </Link>
                        ) : "—"}
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </div>

          {total > 0 && (
            <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {from + 1}–{Math.min(from + PAGE_SIZE, total)} de {total} documento{total === 1 ? "" : "s"}
              </span>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  {page > 1 ? (
                    <Link href={`/documentos?page=${page - 1}`} className="rounded-md border px-3 py-1 hover:bg-muted">Anterior</Link>
                  ) : (
                    <span className="rounded-md border px-3 py-1 opacity-40">Anterior</span>
                  )}
                  <span>Página {page} de {totalPages}</span>
                  {page < totalPages ? (
                    <Link href={`/documentos?page=${page + 1}`} className="rounded-md border px-3 py-1 hover:bg-muted">Siguiente</Link>
                  ) : (
                    <span className="rounded-md border px-3 py-1 opacity-40">Siguiente</span>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
