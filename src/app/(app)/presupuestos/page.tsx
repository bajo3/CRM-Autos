import Link from "next/link";
import { Plus, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { formatARS, formatDate } from "@/lib/format";
import { rel, type Rel } from "@/lib/rel";
import { ESTADOS, ESTADO_LABEL, ESTADO_TONE, ESTADO_VALUES, type EstadoPresupuesto } from "./lib";

export const dynamic = "force-dynamic";

type Row = {
  id: string; precio: number | null; validez: string | null; created_at: string;
  estado: EstadoPresupuesto; pdf_url: string | null;
  cliente: Rel<{ nombre: string; apellido: string | null }>;
  vehiculo: Rel<{ marca: string; modelo: string }>;
};

export default async function PresupuestosPage({ searchParams }: { searchParams: { estado?: string } }) {
  const sb = createClient();
  const ctx = await getSessionContext();
  const puede = can(ctx?.profile?.rol, "documentos.generar");

  let query = sb
    .from("presupuesto")
    .select("id,precio,validez,created_at,estado,pdf_url,cliente:cliente_id(nombre,apellido),vehiculo:vehiculo_id(marca,modelo)")
    .order("created_at", { ascending: false });

  const filtro = searchParams.estado;
  if (filtro && ESTADO_VALUES.includes(filtro as EstadoPresupuesto)) {
    query = query.eq("estado", filtro as EstadoPresupuesto);
  }

  const { data } = await query.returns<Row[]>();

  return (
    <div>
      <PageHeader
        title="Presupuestos"
        description="Cotizaciones con estado comercial, PDF con branding de la agencia y envío por WhatsApp."
        actions={
          puede ? (
            <Link href="/presupuestos/nuevo">
              <Button><Plus className="h-4 w-4" /> Nuevo presupuesto</Button>
            </Link>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Link
          href="/presupuestos"
          className={`rounded-full border px-3 py-1 text-sm ${!filtro ? "bg-brand-700 text-white" : "hover:bg-muted"}`}
        >
          Todos
        </Link>
        {ESTADOS.map((e) => (
          <Link
            key={e.value}
            href={`/presupuestos?estado=${e.value}`}
            className={`rounded-full border px-3 py-1 text-sm ${filtro === e.value ? "bg-brand-700 text-white" : "hover:bg-muted"}`}
          >
            {e.label}
          </Link>
        ))}
      </div>

      {!data || data.length === 0 ? (
        <EmptyState
          title="No hay presupuestos"
          description={puede ? "Creá el primer presupuesto con el botón de arriba." : "Todavía no se cargaron presupuestos."}
        />
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <THead>
              <TR><TH>Cliente</TH><TH>Vehículo</TH><TH>Precio</TH><TH>Estado</TH><TH>Validez</TH><TH>Creado</TH><TH></TH></TR>
            </THead>
            <TBody>
              {data.map((p) => {
                const c = rel(p.cliente);
                const veh = rel(p.vehiculo);
                return (
                  <TR key={p.id}>
                    <TD className="font-medium">
                      <Link href={`/presupuestos/${p.id}`} className="text-brand-800 hover:underline">
                        {c ? `${c.nombre} ${c.apellido ?? ""}`.trim() : "Sin cliente"}
                      </Link>
                    </TD>
                    <TD>{veh ? `${veh.marca} ${veh.modelo}` : "—"}</TD>
                    <TD>{formatARS(p.precio)}</TD>
                    <TD><Badge tone={ESTADO_TONE[p.estado]}>{ESTADO_LABEL[p.estado]}</Badge></TD>
                    <TD>{formatDate(p.validez)}</TD>
                    <TD>{formatDate(p.created_at)}</TD>
                    <TD>
                      {p.pdf_url ? (
                        <Link href={`/presupuestos/${p.id}/abrir`} target="_blank" className="inline-flex items-center gap-1 text-sm text-brand-800 hover:underline">
                          <ExternalLink className="h-4 w-4" /> PDF
                        </Link>
                      ) : (
                        <Link href={`/presupuestos/${p.id}`} className="text-sm text-muted-foreground hover:underline">Ver</Link>
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
