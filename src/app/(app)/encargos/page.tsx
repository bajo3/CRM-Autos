import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge, toneForEstado } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { formatARS, humanize } from "@/lib/format";
import { rel, type Rel } from "@/lib/rel";
import { mensajeVehiculo } from "@/lib/data/whatsapp";
import { matchStockParaEncargos } from "@/lib/data/matching";
import { AbrirChatButton } from "@/components/whatsapp/abrir-chat-button";

export const dynamic = "force-dynamic";

const ACTIVOS = ["buscando", "unidad_encontrada", "ofrecido"];

type Row = {
  id: string; marca_buscada: string | null; modelo_buscado: string | null;
  anio_min: number | null; anio_max: number | null; km_max: number | null;
  presupuesto_max: number | null;
  urgencia: string; estado: string;
  cliente: Rel<{ id: string; nombre: string; apellido: string; telefono: string | null }>;
};

export default async function EncargosPage() {
  const sb = createClient();
  const [ctx, { data }] = await Promise.all([
    getSessionContext(),
    sb
      .from("encargo")
      .select("id,marca_buscada,modelo_buscado,anio_min,anio_max,km_max,presupuesto_max,urgencia,estado,cliente:cliente_id(id,nombre,apellido,telefono)")
      .order("created_at", { ascending: false })
      .returns<Row[]>(),
  ]);
  const empresaNombre = ctx?.empresa?.nombre ?? "nuestra agencia";

  const activos = (data ?? []).filter((e) => ACTIVOS.includes(e.estado));
  const coincidencias = await matchStockParaEncargos(activos);

  return (
    <div>
      <PageHeader
        title="Encargos"
        description="Clientes que buscan una unidad específica. Se cruzan solos contra el stock disponible."
        actions={<Link href="/encargos/nuevo"><Button><Plus className="h-4 w-4" /> Nuevo encargo</Button></Link>}
      />
      {!data || data.length === 0 ? (
        <EmptyState title="No hay encargos activos" description="Registrá lo que busca un cliente para detectar coincidencias automáticamente." />
      ) : (
        <div className="rounded-xl border border-border/70 bg-card shadow-elevate">
          <Table>
            <THead><TR><TH>Cliente</TH><TH>Busca</TH><TH>Años</TH><TH>Presupuesto</TH><TH>Urgencia</TH><TH>Estado</TH><TH>Coincidencias</TH></TR></THead>
            <TBody>
              {data.map((e) => {
                const c = rel(e.cliente);
                const matches = coincidencias.get(e.id) ?? [];
                return (
                  <TR key={e.id}>
                    <TD className="font-medium">{c?.nombre} {c?.apellido}</TD>
                    <TD>{e.marca_buscada} {e.modelo_buscado}</TD>
                    <TD>{e.anio_min ?? "—"}–{e.anio_max ?? "—"}</TD>
                    <TD>{formatARS(e.presupuesto_max)}</TD>
                    <TD><Badge tone={e.urgencia === "alta" ? "danger" : e.urgencia === "media" ? "warn" : "neutral"}>{humanize(e.urgencia)}</Badge></TD>
                    <TD><Badge tone={toneForEstado(e.estado)}>{humanize(e.estado)}</Badge></TD>
                    <TD>
                      {matches.length === 0 ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <div className="flex flex-col gap-1">
                          {matches.map((v) => (
                            <div key={v.id} className="flex items-center gap-1.5">
                              <Link href={`/stock/${v.id}`} className="text-xs font-medium text-ok hover:underline">
                                ¡Hay 1! {v.marca} {v.modelo}{v.anio ? ` ${v.anio}` : ""}
                              </Link>
                              {c?.telefono && (
                                <AbrirChatButton
                                  clienteId={c.id}
                                  mensaje={mensajeVehiculo(empresaNombre, { marca: v.marca, modelo: v.modelo, anio: v.anio, precio: v.precio_venta })}
                                  className="border-0 p-0 text-ok hover:bg-transparent"
                                />
                              )}
                            </div>
                          ))}
                        </div>
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
