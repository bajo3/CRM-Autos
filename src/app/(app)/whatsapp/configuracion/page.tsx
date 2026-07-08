import { getSessionContext } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { WhatsappBotConfigForm } from "@/components/forms/whatsapp-bot-config-form";
import { ConexionPanel } from "@/components/whatsapp/conexion-panel";
import { ConexionQrPanel } from "@/components/whatsapp/conexion-qr-panel";
import { obtenerBotConfig, obtenerCuentaWa } from "../data";

export const dynamic = "force-dynamic";

export default async function WhatsappConfiguracionPage() {
  const ctx = await getSessionContext();
  if (!ctx?.profile?.empresa_id) {
    return (
      <div>
        <PageHeader title="Configuración de WhatsApp" />
        <EmptyState title="Sesión inválida" />
      </div>
    );
  }

  const puedeEditar = can(ctx.profile.rol, "whatsapp.bot");
  const puedeConectar = can(ctx.profile.rol, "whatsapp.conectar");
  const [config, cuenta] = await Promise.all([
    obtenerBotConfig(ctx.profile.empresa_id),
    obtenerCuentaWa(ctx.profile.empresa_id),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Configuración de WhatsApp"
        description="Conexión oficial, datos comerciales y reglas del agente automático."
      />

      <ConexionPanel
        cuenta={cuenta}
        appId={process.env.META_APP_ID || null}
        configId={process.env.META_CONFIG_ID || null}
        puedeAdministrar={puedeConectar}
      />

      {puedeConectar && (
        <ConexionQrPanel yaConectadoBaileys={cuenta?.estado === "conectado" && cuenta?.provider === "baileys"} />
      )}

      {!puedeEditar ? (
        <Card>
          <CardContent className="p-6">
            <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Solo el dueño o el encargado pueden editar la configuración del bot.
            </div>
          </CardContent>
        </Card>
      ) : (
        <WhatsappBotConfigForm
          initial={{
            habilitado: config?.habilitado ?? false,
            nombre_comercial: config?.nombre_comercial ?? ctx.empresa?.nombre ?? "",
            direccion: config?.direccion ?? ctx.empresa?.direccion ?? "",
            horarios: config?.horarios ?? "",
            financiacion: config?.financiacion ?? "",
            politica_permuta: config?.politica_permuta ?? "",
            mensaje_fallback:
              config?.mensaje_fallback ?? "En breve un asesor te va a responder por acá. ¡Gracias por escribirnos!",
            keywords_handoff: Array.isArray(config?.keywords_handoff)
              ? (config.keywords_handoff as string[]).join(", ")
              : "humano, asesor, vendedor, persona",
            tono: config?.tono ?? "profesional",
            pausa_intervencion_min: config?.pausa_intervencion_min ?? 240,
          }}
        />
      )}
    </div>
  );
}
