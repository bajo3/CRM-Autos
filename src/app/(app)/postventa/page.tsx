import { Phone, MessageCircle, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate, daysUntil } from "@/lib/format";
import { rel, type Rel } from "@/lib/rel";
import { waUrl, mensajePostventa } from "@/lib/data/whatsapp";
import { marcarPostventaRealizada } from "./actions";

export const dynamic = "force-dynamic";

type Row = {
  id: string; fecha_alerta: string; realizada: boolean; notas: string | null;
  cliente: Rel<{ nombre: string; apellido: string; telefono: string | null; whatsapp: string | null }>;
};

export default async function PostventaPage() {
  const sb = createClient();
  const ctx = await getSessionContext();
  const empresaNombre = ctx?.empresa?.nombre ?? "nuestra agencia";

  const { data } = await sb
    .from("postventa")
    .select("id,fecha_alerta,realizada,notas,cliente:cliente_id(nombre,apellido,telefono,whatsapp)")
    .order("fecha_alerta", { ascending: true })
    .returns<Row[]>();

  return (
    <div>
      <PageHeader
        title="Postventa"
        description="Recontacto a 6 meses de ventas en efectivo: experiencia, referidos y nueva operación."
      />
      {!data || data.length === 0 ? (
        <EmptyState title="No hay alertas de postventa" description="Las ventas en efectivo generan una alerta automática a los 6 meses." />
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <THead><TR><TH>Cliente</TH><TH>Alerta</TH><TH>Vencimiento</TH><TH>Estado</TH><TH>Acciones</TH></TR></THead>
            <TBody>
              {data.map((p) => {
                const c = rel(p.cliente);
                const d = daysUntil(p.fecha_alerta);
                const tel = c?.whatsapp || c?.telefono || "";
                return (
                  <TR key={p.id}>
                    <TD className="font-medium">{c?.nombre} {c?.apellido}</TD>
                    <TD>{formatDate(p.fecha_alerta)}</TD>
                    <TD>{d == null ? "—" : d < 0 ? `Hace ${-d} días` : d === 0 ? "Hoy" : `En ${d} días`}</TD>
                    <TD>{p.realizada ? <Badge tone="ok">Realizada</Badge> : <Badge tone="warn">Pendiente</Badge>}</TD>
                    <TD>
                      {!p.realizada && (
                        <div className="flex items-center gap-1.5">
                          {tel && (
                            <a
                              href={`tel:${tel.replace(/\D/g, "")}`}
                              title="Llamar"
                              className="rounded-md border p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                              <Phone className="h-4 w-4" />
                            </a>
                          )}
                          {tel && (
                            <a
                              href={waUrl(mensajePostventa(empresaNombre, c?.nombre), tel)}
                              target="_blank"
                              title="WhatsApp"
                              className="rounded-md border p-1.5 text-ok hover:bg-muted"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </a>
                          )}
                          <form action={marcarPostventaRealizada.bind(null, p.id)}>
                            <button
                              type="submit"
                              title="Marcar como realizada"
                              className="rounded-md border p-1.5 text-ok hover:bg-muted"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                          </form>
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
