import Link from "next/link";
import { Plus, Car } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge, toneForEstado } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { MoneyInput } from "@/components/ui/money-input";
import { formatARS, humanize } from "@/lib/format";
import { rel, type Rel } from "@/lib/rel";
import { tasarPermuta, cambiarEstadoPermuta, ingresarPermutaAStock } from "./actions";

export const dynamic = "force-dynamic";

type Row = {
  id: string; marca: string | null; modelo: string | null; anio: number | null;
  kilometros: number | null; patente: string | null; estado_general: string | null;
  valor_pretendido: number | null; valor_tasado: number | null; diferencia: number | null;
  estado: string;
  cliente: Rel<{ nombre: string; apellido: string }>;
};

export default async function PermutasPage() {
  const sb = createClient();
  const ctx = await getSessionContext();
  const puedeEditar = can(ctx?.profile?.rol, "stock.editar");
  const puedeCargarStock = can(ctx?.profile?.rol, "stock.crear");

  const { data } = await sb
    .from("permuta")
    .select("id,marca,modelo,anio,kilometros,patente,estado_general,valor_pretendido,valor_tasado,diferencia,estado,cliente:cliente_id(nombre,apellido)")
    .order("created_at", { ascending: false })
    .returns<Row[]>();

  return (
    <div>
      <PageHeader
        title="Permutas / Toma de usados"
        description="Usados que entrega el cliente en parte de pago, con valor pretendido vs. tasado."
        actions={<Link href="/permutas/nuevo"><Button><Plus className="h-4 w-4" /> Registrar permuta</Button></Link>}
      />
      {!data || data.length === 0 ? (
        <EmptyState title="No hay permutas registradas" description="Registrá el usado que un cliente entrega en parte de pago." />
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <THead><TR><TH>Cliente</TH><TH>Vehículo</TH><TH>Pretendido</TH><TH>Tasado</TH><TH>Diferencia</TH><TH>Estado</TH><TH>Acciones</TH></TR></THead>
            <TBody>
              {data.map((p) => {
                const c = rel(p.cliente);
                return (
                  <TR key={p.id}>
                    <TD className="font-medium">{c ? `${c.nombre} ${c.apellido}` : "—"}</TD>
                    <TD>
                      {p.marca} {p.modelo} {p.anio ? `· ${p.anio}` : ""}
                      {p.patente && <span className="block font-mono text-xs text-muted-foreground">{p.patente}</span>}
                    </TD>
                    <TD>{formatARS(p.valor_pretendido)}</TD>
                    <TD>{formatARS(p.valor_tasado)}</TD>
                    <TD className={p.diferencia != null && p.diferencia > 0 ? "text-danger" : "text-ok"}>
                      {p.diferencia != null ? formatARS(p.diferencia) : "—"}
                    </TD>
                    <TD><Badge tone={toneForEstado(p.estado)}>{humanize(p.estado)}</Badge></TD>
                    <TD>
                      {puedeEditar && p.estado === "pendiente" && (
                        <form action={tasarPermuta.bind(null, p.id)} className="flex items-center gap-1.5">
                          <MoneyInput name="valor_tasado" placeholder="Valor tasado" className="h-8 w-32 pl-6 text-xs" />
                          <button type="submit" className="rounded border px-2 py-1 text-xs text-brand-800 hover:bg-muted">Tasar</button>
                        </form>
                      )}
                      {puedeEditar && p.estado === "tasado" && (
                        <div className="flex items-center gap-1">
                          <form action={cambiarEstadoPermuta.bind(null, p.id, "aceptado")}>
                            <button type="submit" className="rounded border px-2 py-0.5 text-xs text-ok hover:bg-muted">Aceptar</button>
                          </form>
                          <form action={cambiarEstadoPermuta.bind(null, p.id, "en_negociacion")}>
                            <button type="submit" className="rounded border px-2 py-0.5 text-xs text-amber-700 hover:bg-muted">Negociar</button>
                          </form>
                          <form action={cambiarEstadoPermuta.bind(null, p.id, "rechazado")}>
                            <button type="submit" className="rounded border px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted">Rechazar</button>
                          </form>
                        </div>
                      )}
                      {puedeCargarStock && p.estado === "aceptado" && (
                        <form action={ingresarPermutaAStock.bind(null, p.id)}>
                          <button type="submit" className="inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs text-brand-800 hover:bg-muted">
                            <Car className="h-3.5 w-3.5" /> Ingresar a stock
                          </button>
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
