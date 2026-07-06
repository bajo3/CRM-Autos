import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verificarSignedRequest } from "@/lib/whatsapp/meta-signed-request";
import { registrarEventoWa } from "@/lib/whatsapp/log";

export const dynamic = "force-dynamic";

/**
 * Callback de "Deauthorize" de Facebook Login for Business: Meta lo llama
 * (POST x-www-form-urlencoded, campo signed_request) cuando el usuario quita
 * la app desde su configuración de Facebook. Debe responder 200 siempre que
 * el request esté bien formado, haya o no una cuenta para desconectar.
 */
export async function POST(request: NextRequest) {
  const form = await request.formData().catch(() => null);
  const signedRequest = form?.get("signed_request");
  if (typeof signedRequest !== "string") {
    return NextResponse.json({ ok: false, error: "Falta signed_request." }, { status: 400 });
  }

  const payload = verificarSignedRequest(signedRequest, process.env.META_APP_SECRET);
  if (!payload?.user_id) {
    console.error("[meta] deauthorize: signed_request inválido o sin verificar (¿falta META_APP_SECRET?).");
    return NextResponse.json({ ok: true });
  }

  const admin = createAdminClient();
  const { data: cuenta } = await admin
    .from("whatsapp_account")
    .select("empresa_id")
    .eq("fb_user_id", payload.user_id)
    .maybeSingle<{ empresa_id: string }>();

  if (!cuenta) {
    console.error(`[meta] deauthorize: no hay whatsapp_account con fb_user_id=${payload.user_id}.`);
    return NextResponse.json({ ok: true });
  }

  await admin
    .from("whatsapp_account")
    .update({ estado: "desconectado", access_token_encrypted: null, last_error: "Desautorizado desde Facebook." })
    .eq("empresa_id", cuenta.empresa_id);

  await registrarEventoWa(admin, {
    empresaId: cuenta.empresa_id,
    tipo: "desconexion",
    detalle: `Meta notificó que el usuario de Facebook (id=${payload.user_id}) desautorizó la app. Conexión desconectada.`,
  });

  return NextResponse.json({ ok: true });
}
