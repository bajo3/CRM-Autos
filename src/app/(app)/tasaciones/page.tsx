import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge, type Tone } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { formatARS, humanize } from "@/lib/format";
import { rel, type Rel } from "@/lib/rel";
import { cambiarDecisionTasacion } from "./actions";

export const dynamic = "force-dynamic";

type Row = {
  id: string; cliente_id: string | null; descripcion: string | null; precio_compra_estimado: number | null;
  precio_venta_estimado: number | null; margen_estimado: number | null;
  decision: string | null;
  cliente: Rel<{ nombre: string; apellido: string }>;
};

const DECISION_TONE: Record<string, Tone> = {
  tomar: "ok", rechazar: "danger", consultar: "info", negociar: "warn",
};

export default async function TasacionesPage() {
  const sb = createClient();
  const { data } = await sb
    .from("tasacion")
    .select("id,cliente_id,descripcion,precio_compra_estimado,precio_venta_estimado,margen_estimado,decision,cliente:cliente_id(nombre,apellido)")
    .order("created_at", { ascending: false })
    .returns<Row[]>();

  return (
    <div>
      <PageHeader
        title="Tasador interno"
        description="Estimación de compra/venta y margen para decidir si tomar una unidad."
        actions={<Link href="/tasaciones/nuevo"><Button><Plus className="h-4 w-4" /> Registrar tasación</Button></Link>}
      />
      {!data || data.length === 0 ? (
        <EmptyState title="No hay tasaciones registradas" description="Registrá la evaluación de un usado que te ofrecen." />
      ) : (
        <div className="rounded-xl border border-border/70 bg-card shadow-elevate">
          <Table>
            <THead><TR><TH>Cliente</TH><TH>Vehículo</TH><TH>Compra</TH><TH>Venta</TH><TH>Margen</TH><TH>Decisión</TH><TH>Acciones</TH></TR></THead>
            <TBody>
              {data.map((t) => {
                const c = rel(t.cliente);
                return (
                  <TR key={t.id}>
                    <TD className="font-medium">{c ? `${c.nombre} ${c.apellido}` : "—"}</TD>
                    <TD className="max-w-xs truncate" title={t.descripcion ?? ""}>{t.descripcion ?? "—"}</TD>
                    <TD>{formatARS(t.precio_compra_estimado)}</TD>
                    <TD>{formatARS(t.precio_venta_estimado)}</TD>
                    <TD className={t.margen_estimado != null && t.margen_estimado < 0 ? "text-danger" : "text-ok"}>
                      {t.margen_estimado != null ? formatARS(t.margen_estimado) : "—"}
                    </TD>
                    <TD>
                      {t.decision ? <Badge tone={DECISION_TONE[t.decision] ?? "neutral"}>{humanize(t.decision)}</Badge> : <Badge tone="neutral">Sin decisión</Badge>}
                    </TD>
                    <TD>
                      <div className="flex items-center gap-1">
                        <form action={cambiarDecisionTasacion.bind(null, t.id, "tomar")}>
                          <button type="submit" className="rounded border px-2 py-0.5 text-xs text-ok hover:bg-muted">Tomar</button>
                        </form>
                        <form action={cambiarDecisionTasacion.bind(null, t.id, "negociar")}>
                          <button type="submit" className="rounded border px-2 py-0.5 text-xs text-amber-700 hover:bg-muted">Negociar</button>
                        </form>
                        <form action={cambiarDecisionTasacion.bind(null, t.id, "rechazar")}>
                          <button type="submit" className="rounded border px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted">Rechazar</button>
                        </form>
                        {t.decision === "tomar" && t.cliente_id && (
                          <Link href={`/permutas/nuevo?cliente=${t.cliente_id}`} className="rounded border px-2 py-0.5 text-xs text-brand-800 hover:bg-muted">
                            Registrar permuta
                          </Link>
                        )}
                        {t.decision === "tomar" && (
                          <Link
                            href={`/stock/nuevo?precio_costo=${t.precio_compra_estimado ?? ""}&observaciones=${encodeURIComponent(t.descripcion ?? "")}&titularidad=propio`}
                            className="rounded border px-2 py-0.5 text-xs text-brand-800 hover:bg-muted"
                          >
                            Comprar para stock
                          </Link>
                        )}
                      </div>
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
