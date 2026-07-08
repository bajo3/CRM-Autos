import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { getAccionesComerciales } from "@/lib/data/acciones-comerciales";

export type NotificacionItem = {
  key: string;
  titulo: string;
  detalle: string;
  href: string;
  tono: "danger" | "warn" | "info";
};

/**
 * Resumen para la campanita del topbar: mensajes de WhatsApp sin leer +
 * lo vencido/de hoy del Centro de Acción Comercial. Se recalcula en cada
 * carga de página (sin polling ni websockets, a tono con el resto del CRM).
 */
export async function getNotificaciones(): Promise<NotificacionItem[]> {
  const ctx = await getSessionContext();
  if (!ctx?.profile?.empresa_id) return [];
  const sb = createClient();

  const [{ data: conversaciones }, acciones] = await Promise.all([
    sb
      .from("whatsapp_conversacion")
      .select("id, nombre_contacto, telefono, no_leidos, last_message_preview")
      .eq("empresa_id", ctx.profile.empresa_id)
      .gt("no_leidos", 0)
      .order("last_message_at", { ascending: false })
      .limit(10),
    getAccionesComerciales(),
  ]);

  const items: NotificacionItem[] = [];

  for (const c of conversaciones ?? []) {
    items.push({
      key: `wa-${c.id}`,
      titulo: c.nombre_contacto || c.telefono,
      detalle: `${c.no_leidos} mensaje${c.no_leidos === 1 ? "" : "s"} nuevo${c.no_leidos === 1 ? "" : "s"}${c.last_message_preview ? `: ${c.last_message_preview}` : ""}`,
      href: `/whatsapp/${c.id}`,
      tono: "info",
    });
  }

  for (const a of acciones) {
    if (a.urgencia === "oportunidad") continue;
    items.push({
      key: a.key,
      titulo: a.cliente,
      detalle: a.detalle,
      href: a.href,
      tono: a.urgencia === "vencido" ? "danger" : "warn",
    });
  }

  return items;
}
