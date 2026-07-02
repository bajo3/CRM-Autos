import Link from "next/link";
import { Plus, Phone, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge, toneForEstado } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate, humanize } from "@/lib/format";
import { rel, type Rel } from "@/lib/rel";
import { waUrl } from "@/lib/data/whatsapp";
import { cambiarEstadoTestDrive } from "./actions";

export const dynamic = "force-dynamic";

type Row = {
  id: string; fecha: string | null; hora: string | null; estado: string;
  conductor_nombre: string | null; telefono: string | null;
  cliente: Rel<{ nombre: string; apellido: string }>;
  vehiculo: Rel<{ marca: string; modelo: string }>;
};

export default async function TestDrivePage() {
  const sb = createClient();
  const { data } = await sb
    .from("test_drive")
    .select("id,fecha,hora,estado,conductor_nombre,telefono,cliente:cliente_id(nombre,apellido),vehiculo:vehiculo_id(marca,modelo)")
    .order("fecha", { ascending: false })
    .returns<Row[]>();

  return (
    <div>
      <PageHeader
        title="Test Drive"
        description="Agenda de pruebas de manejo, con autorización y seguimiento por conductor."
        actions={<Link href="/test-drive/nuevo"><Button><Plus className="h-4 w-4" /> Agendar test drive</Button></Link>}
      />
      {!data || data.length === 0 ? (
        <EmptyState title="No hay test drives agendados" description="Agendá una prueba de manejo desde acá o desde la ficha del vehículo." />
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <THead><TR><TH>Fecha</TH><TH>Cliente</TH><TH>Vehículo</TH><TH>Conductor</TH><TH>Estado</TH><TH>Acciones</TH></TR></THead>
            <TBody>
              {data.map((t) => {
                const c = rel(t.cliente);
                const veh = rel(t.vehiculo);
                const wa = (t.telefono ?? "").replace(/\D/g, "");
                return (
                  <TR key={t.id}>
                    <TD>{formatDate(t.fecha)}{t.hora ? ` ${t.hora.slice(0, 5)}` : ""}</TD>
                    <TD className="font-medium">{c ? `${c.nombre} ${c.apellido}` : "—"}</TD>
                    <TD>{veh ? `${veh.marca} ${veh.modelo}` : "—"}</TD>
                    <TD>{t.conductor_nombre ?? "—"}</TD>
                    <TD><Badge tone={toneForEstado(t.estado)}>{humanize(t.estado)}</Badge></TD>
                    <TD>
                      <div className="flex items-center gap-1.5">
                        {wa && (
                          <a href={`tel:${wa}`} title="Llamar" className="rounded-md border p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                            <Phone className="h-4 w-4" />
                          </a>
                        )}
                        {wa && (
                          <a
                            href={waUrl(`¡Hola${t.conductor_nombre ? ` ${t.conductor_nombre}` : ""}! Te confirmo el test drive${veh ? ` del ${veh.marca} ${veh.modelo}` : ""}${t.fecha ? ` para el ${formatDate(t.fecha)}` : ""}.`, wa)}
                            target="_blank"
                            title="WhatsApp"
                            className="rounded-md border p-1.5 text-ok hover:bg-muted"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </a>
                        )}
                        {t.estado === "agendado" && (
                          <>
                            <form action={cambiarEstadoTestDrive.bind(null, t.id, "realizado")}>
                              <button type="submit" className="rounded border px-2 py-0.5 text-xs text-ok hover:bg-muted">✓ Realizado</button>
                            </form>
                            <form action={cambiarEstadoTestDrive.bind(null, t.id, "no_asistio")}>
                              <button type="submit" className="rounded border px-2 py-0.5 text-xs text-amber-700 hover:bg-muted">No asistió</button>
                            </form>
                            <form action={cambiarEstadoTestDrive.bind(null, t.id, "cancelado")}>
                              <button type="submit" className="rounded border px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted">Cancelar</button>
                            </form>
                          </>
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
