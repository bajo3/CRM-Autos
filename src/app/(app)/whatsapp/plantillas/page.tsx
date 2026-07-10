import { getSessionContext } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { PlantillasAdmin, type Plantilla } from "@/components/whatsapp/plantillas-admin";

export const dynamic = "force-dynamic";

export default async function PlantillasPage() {
  const ctx = await getSessionContext();
  if (!ctx?.profile?.empresa_id) {
    return (
      <div>
        <PageHeader title="Plantillas de WhatsApp" />
        <EmptyState title="Sesión inválida" />
      </div>
    );
  }

  const puedeAdministrar = can(ctx.profile.rol, "whatsapp.plantillas");
  const sb = createClient();
  const { data } = await sb
    .from("whatsapp_plantilla")
    .select("id, nombre, idioma, categoria, cuerpo, variables_schema, estado, created_at")
    .eq("empresa_id", ctx.profile.empresa_id)
    .order("created_at", { ascending: false })
    .returns<Plantilla[]>();

  return (
    <div>
      <PageHeader
        title="Plantillas de WhatsApp"
        description="Mensajes aprobados para contactar clientes fuera de la ventana de 24 horas."
      />
      <PlantillasAdmin plantillas={data ?? []} puedeAdministrar={puedeAdministrar} />
    </div>
  );
}
