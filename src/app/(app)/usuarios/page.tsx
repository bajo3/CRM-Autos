import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { can } from "@/lib/auth/permissions";
import { UsuariosAdmin, type Usuario } from "@/components/usuarios/usuarios-admin";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const sb = createClient();
  const ctx = await getSessionContext();
  // RLS limita a la propia empresa.
  const { data } = await sb
    .from("profile")
    .select("id, nombre, apellido, email, telefono, rol, activo")
    .order("created_at", { ascending: true })
    .returns<Usuario[]>();

  const puede = can(ctx?.profile?.rol, "usuarios.crear");

  return (
    <div>
      <PageHeader
        title="Usuarios y roles"
        description="Equipo de la agencia. Cada usuario solo accede a los datos de esta empresa."
      />
      {!data || data.length === 0 ? (
        <EmptyState title="No hay usuarios" />
      ) : (
        <UsuariosAdmin usuarios={data} currentUserId={ctx?.userId} puede={puede} />
      )}
    </div>
  );
}
