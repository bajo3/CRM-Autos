import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verificarSignedRequest } from "@/lib/whatsapp/meta-signed-request";
import { registrarEventoWa } from "@/lib/whatsapp/log";

export const dynamic = "force-dynamic";

/**
 * Data Deletion Request callback (App Review de Facebook Login for Business).
 * Meta lo llama (POST x-www-form-urlencoded, campo signed_request) cuando el
 * usuario de Facebook pide que se borren los datos que la app tiene de él.
 *
 * Lo único personal del usuario de Facebook que guardamos es `fb_user_id`
 * (vincula la conexión con su cuenta de Facebook): se borra junto con el
 * token de acceso. El historial de conversaciones de WhatsApp es dato
 * comercial de la agencia con sus propios clientes -no del usuario de
 * Facebook que autorizó la app- y no se toca, igual que en la desconexión
 * manual (ver docs/whatsapp-integration.md).
 *
 * El borrado es sincrónico: la respuesta a Meta se procesa al toque, por eso
 * la página de estado (GET) siempre confirma "completado" para cualquier id.
 */
export async function POST(request: NextRequest) {
  const form = await request.formData().catch(() => null);
  const signedRequest = form?.get("signed_request");
  const confirmationCode = randomUUID();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin;
  const statusUrl = `${siteUrl}/api/meta/data-deletion?id=${confirmationCode}`;

  if (typeof signedRequest !== "string") {
    return NextResponse.json({ ok: false, error: "Falta signed_request." }, { status: 400 });
  }

  const payload = verificarSignedRequest(signedRequest, process.env.META_APP_SECRET);
  if (!payload?.user_id) {
    console.error("[meta] data-deletion: signed_request inválido o sin verificar (¿falta META_APP_SECRET?).");
    return NextResponse.json({ url: statusUrl, confirmation_code: confirmationCode });
  }

  const admin = createAdminClient();
  const { data: cuenta } = await admin
    .from("whatsapp_account")
    .select("empresa_id")
    .eq("fb_user_id", payload.user_id)
    .maybeSingle<{ empresa_id: string }>();

  if (cuenta) {
    await admin
      .from("whatsapp_account")
      .update({
        estado: "desconectado",
        access_token_encrypted: null,
        fb_user_id: null,
        last_error: "Datos del usuario de Facebook eliminados a pedido de Meta.",
      })
      .eq("empresa_id", cuenta.empresa_id);

    await registrarEventoWa(admin, {
      empresaId: cuenta.empresa_id,
      tipo: "desconexion",
      detalle: `Meta pidió eliminar los datos del usuario de Facebook (id=${payload.user_id}). Código de confirmación: ${confirmationCode}.`,
    });
  } else {
    console.error(`[meta] data-deletion: no hay whatsapp_account con fb_user_id=${payload.user_id}.`);
  }

  return NextResponse.json({ url: statusUrl, confirmation_code: confirmationCode });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

/** Página de estado que Meta exige mostrarle al usuario que pidió el borrado. */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return new NextResponse("Falta el parámetro id.", { status: 400 });

  return new NextResponse(
    `<!doctype html><html lang="es"><meta charset="utf-8">
    <title>Solicitud de eliminación de datos</title>
    <body style="font-family: system-ui; max-width: 32rem; margin: 4rem auto; padding: 0 1rem; color: #111;">
      <h1 style="font-size: 1.25rem;">Solicitud de eliminación de datos completada</h1>
      <p>Código de confirmación: <code>${escapeHtml(id)}</code></p>
      <p>Los datos personales asociados a tu cuenta de Facebook fueron eliminados de este sistema.</p>
    </body></html>`,
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}
