import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge, toneForEstado } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { MoneyInput } from "@/components/ui/money-input";
import { formatARS, formatDate, humanize } from "@/lib/format";
import { rel, type Rel } from "@/lib/rel";
import { cambiarEstadoTaller, cerrarTrabajoTaller } from "./actions";

export const dynamic = "force-dynamic";

type Row = {
  id: string; trabajo: string | null; responsable: string | null; taller_externo: string | null;
  costo_estimado: number | null; costo_final: number | null;
  fecha_ingreso: string | null; fecha_salida_estimada: string | null; estado: string;
  vehiculo: Rel<{ marca: string; modelo: string; patente: string | null }>;
};

export default async function TallerPage() {
  const sb = createClient();
  const { data } = await sb
    .from("taller_trabajo")
    .select("id,trabajo,responsable,taller_externo,costo_estimado,costo_final,fecha_ingreso,fecha_salida_estimada,estado,vehiculo:vehiculo_id(marca,modelo,patente)")
    .order("created_at", { ascending: false })
    .returns<Row[]>();

  return (
    <div>
      <PageHeader
        title="Taller / Preparación"
        description="Trabajos de preparación de unidades, con costo estimado vs. final."
        actions={<Link href="/taller/nuevo"><Button><Plus className="h-4 w-4" /> Cargar trabajo</Button></Link>}
      />
      {!data || data.length === 0 ? (
        <EmptyState title="No hay trabajos de taller cargados" description="Cargá el service, detailing o reparación que necesita un vehículo." />
      ) : (
        <div className="rounded-xl border border-border/70 bg-card shadow-elevate">
          <Table>
            <THead><TR><TH>Vehículo</TH><TH>Trabajo</TH><TH>Responsable</TH><TH>Estimado</TH><TH>Final</TH><TH>Ingreso</TH><TH>Estado</TH><TH>Acciones</TH></TR></THead>
            <TBody>
              {data.map((t) => {
                const veh = rel(t.vehiculo);
                return (
                  <TR key={t.id}>
                    <TD className="font-medium">
                      {veh ? `${veh.marca} ${veh.modelo}` : "—"}
                      {veh?.patente && <span className="block font-mono text-xs text-muted-foreground">{veh.patente}</span>}
                    </TD>
                    <TD>{t.trabajo}{t.taller_externo && <span className="block text-xs text-muted-foreground">{t.taller_externo}</span>}</TD>
                    <TD>{t.responsable ?? "—"}</TD>
                    <TD>{formatARS(t.costo_estimado)}</TD>
                    <TD>{formatARS(t.costo_final)}</TD>
                    <TD>{formatDate(t.fecha_ingreso)}</TD>
                    <TD><Badge tone={toneForEstado(t.estado)}>{humanize(t.estado)}</Badge></TD>
                    <TD>
                      {t.estado === "pendiente" && (
                        <form action={cambiarEstadoTaller.bind(null, t.id, "en_taller")}>
                          <button type="submit" className="rounded border px-2 py-0.5 text-xs text-brand-800 hover:bg-muted">Iniciar</button>
                        </form>
                      )}
                      {t.estado === "en_taller" && (
                        <form action={cerrarTrabajoTaller.bind(null, t.id)} className="flex items-center gap-1.5">
                          <MoneyInput name="costo_final" placeholder="Costo final" className="h-8 w-28 pl-6 text-xs" />
                          <button type="submit" className="rounded border px-2 py-1 text-xs text-ok hover:bg-muted">Terminar</button>
                        </form>
                      )}
                      {t.estado === "listo_publicar" && (
                        <form action={cambiarEstadoTaller.bind(null, t.id, "listo_entregar")}>
                          <button type="submit" className="rounded border px-2 py-0.5 text-xs text-ok hover:bg-muted">Listo p/ entregar</button>
                        </form>
                      )}
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
