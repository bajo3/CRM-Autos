import Link from "next/link";
import { FileText, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { getFormOptions } from "@/lib/data/options";
import { can } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea, Label } from "@/components/ui/input";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/format";
import { rel, type Rel } from "@/lib/rel";
import { generarPresupuesto, generarAutorizacionTestDrive } from "./actions";

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
};

type Row = {
  id: string; tipo: string; numero: string | null; fecha_emision: string; pdf_url: string | null;
  cliente: Rel<{ nombre: string; apellido: string | null }>;
  vehiculo: Rel<{ marca: string; modelo: string }>;
};

export default async function DocumentosPage() {
  const sb = createClient();
  const ctx = await getSessionContext();
  const puedeGenerar = can(ctx?.profile?.rol, "documentos.generar");

  const [{ data }, opts] = await Promise.all([
    sb.from("documento_comercial")
      .select("id,tipo,numero,fecha_emision,pdf_url,cliente:cliente_id(nombre,apellido),vehiculo:vehiculo_id(marca,modelo)")
      .order("created_at", { ascending: false })
      .returns<Row[]>(),
    getFormOptions(),
  ]);

  return (
    <div>
      <PageHeader
        title="Documentos comerciales"
        description="Recibos, boletos y presupuestos en PDF con numeración interna y datos de la empresa."
      />

      {puedeGenerar && (
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
                <Input id="precio" name="precio" type="number" min="0" required placeholder="0" />
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
          </CardContent>
        </Card>
      )}

      {puedeGenerar && (
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
      )}

      {!data || data.length === 0 ? (
        <EmptyState title="No hay documentos generados" description="Generá un presupuesto acá, o recibos y boletos desde la ficha de cada venta." />
      ) : (
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
      )}
    </div>
  );
}
