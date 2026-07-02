import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, toneForEstado } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { formatARS, formatDate, humanize } from "@/lib/format";
import { rel, type Rel } from "@/lib/rel";
import { RegistrarPagoButton } from "@/components/creditos/registrar-pago";
import { RevertirPagoButton } from "@/components/creditos/revertir-pago";

export const dynamic = "force-dynamic";

type Credito = {
  id: string; cantidad_cuotas: number; cuota_actual: number; estado: string;
  fecha_inicio: string; fecha_fin_estimada: string | null; observaciones: string | null;
  venta: Rel<{
    id: string; precio_final: number; fecha_venta: string;
    cliente: Rel<{ nombre: string; apellido: string; telefono: string | null }>;
    vehiculo: Rel<{ marca: string; modelo: string; anio: number | null; patente: string | null }>;
  }>;
};

type Pago = {
  id: string; numero_cuota: number; monto_pagado: number; fecha_pago: string; observaciones: string | null;
};

export default async function CreditoDetallePage({ params }: { params: { id: string } }) {
  const sb = createClient();
  const ctx = await getSessionContext();
  const puedeCobrar = can(ctx?.profile?.rol, "creditos.cobrar");

  const { data: credito } = await sb
    .from("credito")
    .select("id,cantidad_cuotas,cuota_actual,estado,fecha_inicio,fecha_fin_estimada,observaciones,venta:venta_id(id,precio_final,fecha_venta,cliente:cliente_id(nombre,apellido,telefono),vehiculo:vehiculo_id(marca,modelo,anio,patente))")
    .eq("id", params.id)
    .maybeSingle<Credito>();

  if (!credito) notFound();

  const { data: pagos } = await sb
    .from("pago_cuota")
    .select("id,numero_cuota,monto_pagado,fecha_pago,observaciones")
    .eq("credito_id", credito.id)
    .order("numero_cuota", { ascending: true })
    .returns<Pago[]>();

  const venta = rel(credito.venta);
  const cliente = venta ? rel(venta.cliente) : null;
  const vehiculo = venta ? rel(venta.vehiculo) : null;
  const abierto = credito.estado !== "finalizado" && credito.estado !== "cancelado" && credito.cuota_actual < credito.cantidad_cuotas;
  const totalPagado = (pagos ?? []).reduce((acc, p) => acc + Number(p.monto_pagado), 0);

  return (
    <div>
      <PageHeader
        title={`Crédito — ${cliente?.nombre ?? ""} ${cliente?.apellido ?? ""}`.trim()}
        description={`Cuota ${credito.cuota_actual}/${credito.cantidad_cuotas} · ${humanize(credito.estado)}`}
        actions={
          <div className="flex items-center gap-2">
            {puedeCobrar && credito.cuota_actual > 0 && (
              <RevertirPagoButton creditoId={credito.id} cuota={credito.cuota_actual} />
            )}
            {puedeCobrar && abierto && (
              <RegistrarPagoButton
                creditoId={credito.id}
                proximaCuota={credito.cuota_actual + 1}
                totalCuotas={credito.cantidad_cuotas}
              />
            )}
          </div>
        }
      />

      <Link href="/creditos" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
        <ArrowLeft className="h-4 w-4" /> Volver a créditos
      </Link>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="space-y-2 p-6 text-sm">
            <h2 className="mb-2 font-semibold">Crédito</h2>
            <div className="flex justify-between"><span className="text-muted-foreground">Estado</span><Badge tone={toneForEstado(credito.estado)}>{humanize(credito.estado)}</Badge></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Cuotas pagadas</span><span>{credito.cuota_actual} de {credito.cantidad_cuotas}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Total cobrado</span><span>{formatARS(totalPagado)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Inicio</span><span>{formatDate(credito.fecha_inicio)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Fin estimado</span><span>{formatDate(credito.fecha_fin_estimada)}</span></div>
            {credito.observaciones && (
              <div className="pt-2"><span className="text-muted-foreground">Observaciones</span><p className="whitespace-pre-line">{credito.observaciones}</p></div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-2 p-6 text-sm">
            <h2 className="mb-2 font-semibold">Venta</h2>
            <div className="flex justify-between"><span className="text-muted-foreground">Cliente</span><span>{cliente?.nombre} {cliente?.apellido}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Teléfono</span><span>{cliente?.telefono ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Vehículo</span><span>{vehiculo?.marca} {vehiculo?.modelo} {vehiculo?.anio ?? ""}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Patente</span><span>{vehiculo?.patente ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Precio final</span><span>{formatARS(venta?.precio_final ?? null)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Fecha venta</span><span>{formatDate(venta?.fecha_venta ?? null)}</span></div>
            {venta && (
              <Link href={`/ventas/${venta.id}`} className="inline-block pt-2 text-brand-800 hover:underline">Ver venta →</Link>
            )}
          </CardContent>
        </Card>
      </div>

      <h2 className="mb-3 mt-6 text-sm font-semibold">Historial de pagos</h2>
      {!pagos || pagos.length === 0 ? (
        <EmptyState title="Sin pagos registrados" description="Registrá el primer pago con el botón de arriba." />
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <THead><TR><TH>Cuota</TH><TH>Fecha</TH><TH>Monto</TH><TH>Observación</TH></TR></THead>
            <TBody>
              {pagos.map((p) => (
                <TR key={p.id}>
                  <TD className="font-medium">{p.numero_cuota}/{credito.cantidad_cuotas}</TD>
                  <TD>{formatDate(p.fecha_pago)}</TD>
                  <TD>{formatARS(p.monto_pagado)}</TD>
                  <TD>{p.observaciones ?? "—"}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      )}
    </div>
  );
}
