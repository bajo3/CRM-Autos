import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, ExternalLink, Copy, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatARS, formatDate } from "@/lib/format";
import { rel, type Rel } from "@/lib/rel";
import {
  ESTADOS, ESTADO_LABEL, ESTADO_TONE, FORMAS_PAGO, calcularSaldo,
  type EstadoPresupuesto, type FormaPago,
} from "../lib";
import { cambiarEstadoPresupuesto, generarPdfPresupuesto, duplicarPresupuesto } from "../actions";

export const dynamic = "force-dynamic";

type Presupuesto = {
  id: string; estado: EstadoPresupuesto; precio: number | null; anticipo: number | null;
  bonificacion: number | null; gastos: number | null; cantidad_cuotas: number | null;
  valor_cuota: number | null; forma_pago: FormaPago | null; financiacion: string | null;
  permuta: string | null; validez: string | null; observaciones: string | null;
  pdf_url: string | null; created_at: string;
  cliente: Rel<{ id: string; nombre: string; apellido: string | null; telefono: string | null; whatsapp: string | null }>;
  vehiculo: Rel<{ marca: string; modelo: string; anio: number | null; patente: string | null }>;
  vendedor: Rel<{ nombre: string; apellido: string }>;
};

const formaLabel = (f: FormaPago | null) => FORMAS_PAGO.find((x) => x.value === f)?.label ?? "—";

export default async function PresupuestoDetallePage({ params }: { params: { id: string } }) {
  const sb = createClient();
  const [ctx, { data: p }] = await Promise.all([
    getSessionContext(),
    sb
      .from("presupuesto")
      .select("id,estado,precio,anticipo,bonificacion,gastos,cantidad_cuotas,valor_cuota,forma_pago,financiacion,permuta,validez,observaciones,pdf_url,created_at,cliente:cliente_id(id,nombre,apellido,telefono,whatsapp),vehiculo:vehiculo_id(marca,modelo,anio,patente),vendedor:vendedor_id(nombre,apellido)")
      .eq("id", params.id)
      .maybeSingle<Presupuesto>(),
  ]);
  const puede = can(ctx?.profile?.rol, "documentos.generar");
  if (!p) notFound();

  const cliente = rel(p.cliente);
  const vehiculo = rel(p.vehiculo);
  const vendedor = rel(p.vendedor);
  const saldo = calcularSaldo(p.precio, p.anticipo, p.bonificacion);
  const nombreCliente = cliente ? `${cliente.nombre} ${cliente.apellido ?? ""}`.trim() : "Sin cliente";
  const vehTexto = vehiculo ? `${vehiculo.marca} ${vehiculo.modelo}${vehiculo.anio ? ` ${vehiculo.anio}` : ""}` : null;

  // Mensaje de WhatsApp con resumen del presupuesto.
  const wa = (cliente?.whatsapp || cliente?.telefono || "").replace(/\D/g, "");
  const lineas = [
    `Hola${cliente ? ` ${cliente.nombre}` : ""}, te paso el presupuesto${vehTexto ? ` por ${vehTexto}` : ""}:`,
    `Precio: ${formatARS(p.precio)}`,
    p.anticipo != null ? `Anticipo: ${formatARS(p.anticipo)}` : null,
    saldo > 0 ? `Saldo a financiar: ${formatARS(saldo)}` : null,
    p.cantidad_cuotas ? `Cuotas: ${p.cantidad_cuotas}${p.valor_cuota ? ` x ${formatARS(p.valor_cuota)}` : ""}` : null,
    p.validez ? `Válido hasta: ${formatDate(p.validez)}` : null,
  ].filter(Boolean);
  const waHref = `https://wa.me/${wa}?text=${encodeURIComponent(lineas.join("\n"))}`;

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/presupuestos" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
        <ArrowLeft className="h-4 w-4" /> Volver a presupuestos
      </Link>

      <PageHeader
        title={`Presupuesto · ${nombreCliente}`}
        description={vehTexto ?? "Sin vehículo asociado"}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={ESTADO_TONE[p.estado]}>{ESTADO_LABEL[p.estado]}</Badge>
            {(cliente?.whatsapp || cliente?.telefono) && (
              <a href={waHref} target="_blank">
                <Button variant="outline" size="sm"><MessageCircle className="h-4 w-4 text-ok" /> WhatsApp</Button>
              </a>
            )}
            {puede && (
              <>
                <form action={generarPdfPresupuesto.bind(null, p.id)}>
                  <Button type="submit" variant="outline" size="sm">
                    <FileText className="h-4 w-4" /> {p.pdf_url ? "Regenerar PDF" : "Generar PDF"}
                  </Button>
                </form>
                <form action={duplicarPresupuesto.bind(null, p.id)}>
                  <Button type="submit" variant="outline" size="sm"><Copy className="h-4 w-4" /> Duplicar</Button>
                </form>
              </>
            )}
            {p.pdf_url && (
              <Link href={`/presupuestos/${p.id}/abrir`} target="_blank">
                <Button variant="outline" size="sm"><ExternalLink className="h-4 w-4" /> Abrir PDF</Button>
              </Link>
            )}
          </div>
        }
      />

      {puede && (
        <Card className="mb-4">
          <CardContent className="flex flex-wrap items-center gap-2 p-4">
            <span className="text-sm text-muted-foreground">Cambiar estado:</span>
            {ESTADOS.map((e) => (
              <form key={e.value} action={cambiarEstadoPresupuesto.bind(null, p.id, e.value)}>
                <Button
                  type="submit"
                  size="sm"
                  variant={p.estado === e.value ? "default" : "outline"}
                  disabled={p.estado === e.value}
                >
                  {e.label}
                </Button>
              </form>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Condiciones</CardTitle></CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <Row label="Precio" value={formatARS(p.precio)} />
            {p.bonificacion != null && <Row label="Bonificación" value={formatARS(p.bonificacion)} />}
            {p.anticipo != null && <Row label="Anticipo" value={formatARS(p.anticipo)} />}
            <Row label="Saldo a financiar" value={formatARS(saldo)} strong />
            {p.cantidad_cuotas != null && (
              <Row label="Cuotas" value={`${p.cantidad_cuotas}${p.valor_cuota != null ? ` x ${formatARS(p.valor_cuota)}` : ""}`} />
            )}
            {p.gastos != null && <Row label="Gastos" value={formatARS(p.gastos)} />}
            <Row label="Forma de pago" value={formaLabel(p.forma_pago)} />
            {p.financiacion && <Row label="Financiación" value={p.financiacion} />}
            {p.permuta && <Row label="Permuta" value={p.permuta} />}
            <Row label="Válido hasta" value={formatDate(p.validez)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Cliente y vehículo</CardTitle></CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <Row label="Cliente" value={nombreCliente} />
            <Row label="Teléfono" value={cliente?.telefono ?? "—"} />
            <Row label="Vehículo" value={vehTexto ?? "—"} />
            <Row label="Patente" value={vehiculo?.patente ?? "—"} />
            <Row label="Vendedor" value={vendedor ? `${vendedor.nombre} ${vendedor.apellido}` : "—"} />
            <Row label="Creado" value={formatDate(p.created_at)} />
            {cliente && (
              <Link href={`/clientes/${cliente.id}`} className="inline-block pt-2 text-brand-800 hover:underline">Ver ficha del cliente →</Link>
            )}
          </CardContent>
        </Card>
      </div>

      {p.observaciones && (
        <Card className="mt-4">
          <CardHeader><CardTitle className="text-base">Observaciones</CardTitle></CardHeader>
          <CardContent><p className="whitespace-pre-line text-sm">{p.observaciones}</p></CardContent>
        </Card>
      )}
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "font-semibold" : ""}>{value}</span>
    </div>
  );
}
