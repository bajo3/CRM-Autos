import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { humanize } from "@/lib/format";
import { can } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const sb = createClient();
  const ctx = await getSessionContext();
  // RLS limita a la propia empresa.
  const { data } = await sb
    .from("profile")
    .select("id, nombre, apellido, email, telefono, rol, activo")
    .order("created_at", { ascending: true })
    .returns<{ id: string; nombre: string; apellido: string; email: string | null; telefono: string | null; rol: string; activo: boolean }[]>();

  const puedeCrear = can(ctx?.profile?.rol, "usuarios.crear");

  return (
    <div>
      <PageHeader
        title="Usuarios y roles"
        description="Equipo de la agencia. Cada usuario solo accede a los datos de esta empresa."
      />
      {puedeCrear && (
        <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          Como <strong>{humanize(ctx?.profile?.rol)}</strong> podés crear usuarios. El alta con invitación por email
          queda para la Etapa 2 (ver <code className="rounded bg-white/60 px-1">/docs/PENDIENTES.md</code>).
        </div>
      )}
      {!data || data.length === 0 ? (
        <EmptyState title="No hay usuarios" />
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <THead><TR><TH>Nombre</TH><TH>Email</TH><TH>Teléfono</TH><TH>Rol</TH><TH>Estado</TH></TR></THead>
            <TBody>
              {data.map((u) => (
                <TR key={u.id}>
                  <TD className="font-medium">{u.nombre} {u.apellido}{u.id === ctx?.userId ? " (vos)" : ""}</TD>
                  <TD>{u.email ?? "—"}</TD>
                  <TD>{u.telefono ?? "—"}</TD>
                  <TD><Badge tone="info">{humanize(u.rol)}</Badge></TD>
                  <TD>{u.activo ? <Badge tone="ok">Activo</Badge> : <Badge tone="danger">Inactivo</Badge>}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      )}
    </div>
  );
}
