import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge, toneForEstado } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { formatARS, humanize } from "@/lib/format";
import { rel, type Rel } from "@/lib/rel";

export const dynamic = "force-dynamic";

type Row = {
  id: string; marca_buscada: string | null; modelo_buscado: string | null;
  anio_min: number | null; anio_max: number | null; presupuesto_max: number | null;
  urgencia: string; estado: string;
  cliente: Rel<{ nombre: string; apellido: string }>;
};

export default async function EncargosPage() {
  const sb = createClient();
  const { data } = await sb
    .from("encargo")
    .select("id,marca_buscada,modelo_buscado,anio_min,anio_max,presupuesto_max,urgencia,estado,cliente:cliente_id(nombre,apellido)")
    .order("created_at", { ascending: false })
    .returns<Row[]>();

  return (
    <div>
      <PageHeader
        title="Encargos"
        description="Clientes que buscan una unidad específica. Al abrir la ficha de un auto se detectan coincidencias."
        actions={<Link href="/encargos/nuevo"><Button><Plus className="h-4 w-4" /> Nuevo encargo</Button></Link>}
      />
      {!data || data.length === 0 ? (
        <EmptyState title="No hay encargos activos" description="Registrá lo que busca un cliente para detectar coincidencias automáticamente." />
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <THead><TR><TH>Cliente</TH><TH>Busca</TH><TH>Años</TH><TH>Presupuesto</TH><TH>Urgencia</TH><TH>Estado</TH></TR></THead>
            <TBody>
              {data.map((e) => {
                const c = rel(e.cliente);
                return (
                  <TR key={e.id}>
                    <TD className="font-medium">{c?.nombre} {c?.apellido}</TD>
                    <TD>{e.marca_buscada} {e.modelo_buscado}</TD>
                    <TD>{e.anio_min ?? "—"}–{e.anio_max ?? "—"}</TD>
                    <TD>{formatARS(e.presupuesto_max)}</TD>
                    <TD><Badge tone={e.urgencia === "alta" ? "danger" : e.urgencia === "media" ? "warn" : "neutral"}>{humanize(e.urgencia)}</Badge></TD>
                    <TD><Badge tone={toneForEstado(e.estado)}>{humanize(e.estado)}</Badge></TD>
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
