import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, Receipt, FileSignature } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, toneForEstado } from "@/components/ui/badge";
import { Select } from "@/components/ui/input";
import { formatARS, formatDate, humanize } from "@/lib/format";
import { rel, type Rel } from "@/lib/rel";
import { CHECKLIST_ENTREGA, checklistProgreso, type ChecklistEntrega } from "@/lib/data/checklist";
import { actualizarEntrega } from "../actions";
import { generarDocumentoVenta } from "@/app/(app)/documentos/actions";

export const dynamic = "force-dynamic";

type Venta = {
  id: string; fecha_venta: string; precio_final: number | null; sena: number | null;
  saldo: number | null; forma_pago: string; estado_entrega: string;
  tiene_credito: boolean; tiene_permuta: boolean; observaciones: string | null;
  checklist_entrega: ChecklistEntrega | null;
  cliente: Rel<{ id: string; nombre: string; apellido: string | null }>;
  vehiculo: Rel<{ id: string; marca: string; modelo: string; anio: number | null; patente: string | null }>;
  vendedor: Rel<{ nombre: string; apellido: string }>;
};

export default async function FichaVenta({ params }: { params: { id: string } }) {
  const sb = createClient();
  const ctx = await getSessionContext();
  const puedeEditar = can(ctx?.profile?.rol, "ventas.crear");
  const puedeGenerar = can(ctx?.profile?.rol, "documentos.generar");

  const { data: v } = await sb
    .from("venta")
    .select("id,fecha_venta,precio_final,sena,saldo,forma_pago,estado_entrega,tiene_credito,tiene_permuta,observaciones,checklist_entrega,cliente:cliente_id(id,nombre,apellido),vehiculo:vehiculo_id(id,marca,modelo,anio,patente),vendedor:vendedor_id(nombre,apellido)")
    .eq("id", params.id)
    .maybeSingle<Venta>();
  if (!v) notFound();

  const cli = rel(v.cliente);
  const veh = rel(v.vehiculo);
  const vendedor = rel(v.vendedor);
  const checklist = v.checklist_entrega ?? {};
  const prog = checklistProgreso(checklist);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-3">
        <Link href="/ventas" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
          <ArrowLeft className="h-4 w-4" /> Volver a ventas
        </Link>
      </div>

      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {veh ? `${veh.marca} ${veh.modelo}` : "Venta"} {veh?.anio ? `· ${veh.anio}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground">
            {cli ? `${cli.nombre} ${cli.apellido ?? ""}` : "Sin cliente"} · {formatDate(v.fecha_venta)}
          </p>
        </div>
        <Badge tone={toneForEstado(v.estado_entrega)}>{humanize(v.estado_entrega)}</Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Datos de la operación */}
        <Card>
          <CardHeader><CardTitle className="text-base">Operación</CardTitle></CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Precio final</span><span className="font-semibold">{formatARS(v.precio_final)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Seña</span><span>{formatARS(v.sena)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Saldo</span><span className="font-medium">{formatARS(v.saldo)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Forma de pago</span><span>{humanize(v.forma_pago)}{v.tiene_credito ? " 💳" : ""}{v.tiene_permuta ? " 🔄" : ""}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Patente</span><span className="font-mono text-xs">{veh?.patente ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Vendedor</span><span>{vendedor ? `${vendedor.nombre} ${vendedor.apellido}` : "—"}</span></div>
            {v.observaciones && <p className="mt-2 rounded-md bg-muted p-2 text-xs">{v.observaciones}</p>}
          </CardContent>
        </Card>

        {/* Checklist de entrega */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span>Checklist de entrega</span>
              <span className="text-xs font-normal text-muted-foreground">{prog.done}/{prog.total}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form action={actualizarEntrega.bind(null, v.id)} className="space-y-3">
              <div className="space-y-1.5">
                {CHECKLIST_ENTREGA.map((item) => (
                  <label key={item.key} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name={`chk_${item.key}`}
                      defaultChecked={!!checklist[item.key]}
                      disabled={!puedeEditar}
                      className="h-4 w-4 rounded border-input"
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>

              <div className="border-t pt-3">
                <label className="mb-1 block text-xs text-muted-foreground">Estado de entrega</label>
                <div className="flex gap-2">
                  <Select name="estado_entrega" defaultValue={v.estado_entrega} disabled={!puedeEditar} className="h-8 text-xs">
                    <option value="pendiente">Pendiente</option>
                    <option value="en_preparacion">En preparación</option>
                    <option value="listo">Listo</option>
                    <option value="entregado">Entregado</option>
                  </Select>
                  {puedeEditar && <Button type="submit" size="sm">Guardar</Button>}
                </div>
              </div>
            </form>
            {!puedeEditar && (
              <p className="mt-2 text-xs text-muted-foreground">Tu rol no puede editar la entrega.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Documentos PDF */}
      <Card className="mt-4">
        <CardHeader><CardTitle className="text-base">Documentos</CardTitle></CardHeader>
        <CardContent>
          {puedeGenerar ? (
            <>
              <div className="flex flex-wrap gap-2">
                <form action={generarDocumentoVenta.bind(null, v.id, "recibo_sena")}>
                  <Button type="submit" variant="outline" size="sm"><Receipt className="h-4 w-4" /> Recibo de seña</Button>
                </form>
                <form action={generarDocumentoVenta.bind(null, v.id, "recibo_pago")}>
                  <Button type="submit" variant="outline" size="sm"><Receipt className="h-4 w-4" /> Recibo de pago</Button>
                </form>
                <form action={generarDocumentoVenta.bind(null, v.id, "boleto")}>
                  <Button type="submit" variant="outline" size="sm"><FileSignature className="h-4 w-4" /> Boleto de compraventa</Button>
                </form>
                <form action={generarDocumentoVenta.bind(null, v.id, "autorizacion_entrega")}>
                  <Button type="submit" variant="outline" size="sm"><FileText className="h-4 w-4" /> Autorización de entrega</Button>
                </form>
                <form action={generarDocumentoVenta.bind(null, v.id, "autorizacion_retiro_doc")}>
                  <Button type="submit" variant="outline" size="sm"><FileText className="h-4 w-4" /> Autorización retiro doc.</Button>
                </form>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Se genera un PDF numerado con los datos de la empresa, el cliente y la unidad. Queda guardado en{" "}
                <Link href="/documentos" className="underline">Documentos</Link>.
              </p>
            </>
          ) : (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" /> Tu rol no puede generar documentos.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
