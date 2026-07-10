import { createClient } from "@/lib/supabase/server";

export type WhatsappAccountStatus = {
  connected: boolean;
  estado: "conectado" | "desconectado" | "error" | "sin_configurar";
  provider: string | null;
  telefono: string | null;
  lastError: string | null;
  ultimoCronAt: string | null;
};

export async function getWhatsappAccountStatus(empresaId: string): Promise<WhatsappAccountStatus> {
  const sb = createClient();
  const [{ data: account }, { data: cron }] = await Promise.all([
    sb.from("whatsapp_account")
      .select("estado,provider,display_phone_number,last_error")
      .eq("empresa_id", empresaId)
      .maybeSingle<{ estado: "conectado" | "desconectado" | "error"; provider: string; display_phone_number: string | null; last_error: string | null }>(),
    sb.from("whatsapp_evento_log")
      .select("created_at")
      .eq("empresa_id", empresaId)
      .eq("tipo", "otro")
      .eq("detalle", "cron_ejecutado")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ created_at: string }>(),
  ]);

  return {
    connected: account?.estado === "conectado",
    estado: account?.estado ?? "sin_configurar",
    provider: account?.provider ?? null,
    telefono: account?.display_phone_number ?? null,
    lastError: account?.last_error ?? null,
    ultimoCronAt: cron?.created_at ?? null,
  };
}
