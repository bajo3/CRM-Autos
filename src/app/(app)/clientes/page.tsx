import Link from "next/link";
import { MessageCircle, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge, toneForEstado } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { formatARS, formatDate, humanize } from "@/lib/format";
import { rel, type Rel } from "@/lib/rel";

export const dynamic = "force-dynamic";

const ESTADOS = [
  "nuevo", "contactado", "interesado", "agendo_visita", "visito_agencia",
  "pidio_financiacion", "reservado", "vendido", "perdido",
];

type ClienteRow = {
  id: string; nombre: string; apellido: string | null;
  telefono: string | null; whatsapp: string | null; localidad: string | null;
  origen: string; estado: string; presupuesto_aprox: number | null;
  proximo_seguimiento: string | null;
  vendedor: Rel<{ nombre: string; apellido: string }>;
};

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: { estado?: string; q?: string };
}) {
  const sb = createClient();

  let query = sb
    .from("cliente")
    .select("id,nombre,apellido,telefono,whatsapp,localidad,origen,estado,presupuesto_aprox,proximo_seguimiento,vendedor:vendedor_id(nombre,apellido)")
    .order("created_at", { ascending: false });

  if (searchParams.estado && ESTADOS.includes(searchParams.estado)) {
    query = query.eq("estado", searchParams.estado as never);
  }
  if (searchParams.q) {
    query = query.or(`nombre.ilike.%${searchParams.q}%,apellido.ilike.%${searchParams.q}%,telefono.ilike.%${searchParams.q}%`);
  }

  const { data: clientes } = await query.returns<ClienteRow[]>();

  return (
    <div>
      <PageHeader
        title="Clientes / Leads"
        description="Base comercial con estados y seguimiento."
        actions={
          <Link href="/clientes/nuevo">
            <Button><Plus className="h-4 w-4" /> Nuevo cliente</Button>
          </Link>
        }
      />

      <form className="mb-4 flex flex-wrap items-center gap-2" action="/clientes" method="get">
        <input name="q" defaultValue={searchParams.q ?? ""} placeholder="Buscar nombre o teléfono…"
          className="h-9 w-full max-w-xs rounded-md border border-input bg-white px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        <select name="estado" defaultValue={searchParams.estado ?? ""} className="h-9 rounded-md border border-input bg-white px-3 text-sm shadow-sm">
          <option value="">Todos los estados</option>
          {ESTADOS.map((e) => <option key={e} value={e}>{humanize(e)}</option>)}
        </select>
        <button type="submit" className="h-9 rounded-md border px-3 text-sm hover:bg-muted">Filtrar</button>
        {(searchParams.estado || searchParams.q) && <Link href="/clientes" className="text-sm text-muted-foreground underline">Limpiar</Link>}
      </form>

      {!clientes || clientes.length === 0 ? (
        <EmptyState title="No hay clientes que coincidan" description="Ajustá los filtros o cargá un nuevo lead." />
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <THead>
              <TR>
                <TH>Cliente</TH><TH>Localidad</TH><TH>Origen</TH><TH>Estado</TH>
                <TH>Presupuesto</TH><TH>Vendedor</TH><TH>Próx. seg.</TH><TH>WA</TH>
              </TR>
            </THead>
            <TBody>
              {clientes.map((c) => {
                const vend = rel(c.vendedor);
                const wa = (c.whatsapp || c.telefono || "").replace(/\D/g, "");
                return (
                  <TR key={c.id}>
                    <TD>
                      <Link href={`/clientes/${c.id}`} className="font-medium text-brand-700 hover:underline">
                        {c.nombre} {c.apellido}
                      </Link>
                    </TD>
                    <TD>{c.localidad ?? "—"}</TD>
                    <TD>{humanize(c.origen)}</TD>
                    <TD><Badge tone={toneForEstado(c.estado)}>{humanize(c.estado)}</Badge></TD>
                    <TD>{formatARS(c.presupuesto_aprox)}</TD>
                    <TD className="text-sm">{vend ? `${vend.nombre} ${vend.apellido}` : "—"}</TD>
                    <TD>{formatDate(c.proximo_seguimiento)}</TD>
                    <TD>
                      {wa ? (
                        <a href={`https://wa.me/${wa}`} target="_blank" className="text-ok hover:opacity-80" title="WhatsApp">
                          <MessageCircle className="h-4 w-4" />
                        </a>
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
