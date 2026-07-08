import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { EmptyState } from "@/components/ui/empty-state";
import { BandejaShell } from "@/components/whatsapp/bandeja-shell";
import { ChatPanel } from "@/components/whatsapp/chat-panel";
import { ClientPanel } from "@/components/whatsapp/client-panel";
import {
  obtenerConversacionDetalle,
  listarPlantillasAprobadas,
  listarVendedores,
  botEfectivo,
  type FiltrosBandeja,
} from "../data";
import { dentroVentana24h } from "@/lib/whatsapp/service";
import { rel } from "@/lib/rel";

export const dynamic = "force-dynamic";

export default async function ConversacionPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: FiltrosBandeja & { draft?: string };
}) {
  const ctx = await getSessionContext();
  if (!can(ctx?.profile?.rol, "whatsapp.ver") || !ctx?.profile?.empresa_id) {
    return (
      <div>
        <PageHeader title="WhatsApp" description="Bandeja centralizada de conversaciones." />
        <EmptyState title="Sin acceso" description="Tu rol no tiene permiso para ver esta sección." />
      </div>
    );
  }

  const empresaId = ctx.profile.empresa_id;
  const detalle = await obtenerConversacionDetalle(empresaId, params.id);
  if (!detalle) notFound();
  const { conversacion, mensajes } = detalle;

  // Marca la conversación como leída al abrirla. Se espera (no fire-and-forget)
  // porque el panel de lista se renderiza justo después con la cuenta ya en 0.
  const sb = createClient();
  const [, plantillas, vendedores, { data: cuenta }] = await Promise.all([
    sb.from("whatsapp_conversacion").update({ no_leidos: 0 }).eq("id", conversacion.id),
    listarPlantillasAprobadas(empresaId),
    listarVendedores(empresaId),
    sb.from("whatsapp_account").select("provider").eq("empresa_id", empresaId).maybeSingle(),
  ]);
  // La ventana de 24h es una regla de la Cloud API de Meta: no aplica a
  // Baileys (sesión personal), donde siempre se puede escribir texto libre.
  const dentroVentana = cuenta?.provider === "baileys" || dentroVentana24h(conversacion.ultima_entrada_at);

  const clienteRel = rel(conversacion.cliente);
  const nombreContacto = clienteRel
    ? `${clienteRel.nombre} ${clienteRel.apellido ?? ""}`.trim()
    : conversacion.nombre_contacto || conversacion.telefono;

  return (
    <div>
      <PageHeader
        title="WhatsApp"
        description={`Conversación con ${nombreContacto}`}
      />
      <BandejaShell searchParams={searchParams} activeId={conversacion.id}>
        <div className="flex h-full">
          <div className="min-w-0 flex-1">
            <ChatPanel
              conversacionId={conversacion.id}
              telefono={conversacion.telefono}
              mensajesIniciales={mensajes}
              dentroVentana={dentroVentana}
              plantillas={plantillas}
              draftInicial={searchParams.draft}
            />
          </div>
          <ClientPanel
            conversacion={conversacion}
            vendedores={vendedores}
            botOn={botEfectivo(conversacion.bot_activo, conversacion.bot_pausado_hasta)}
          />
        </div>
      </BandejaShell>
    </div>
  );
}
