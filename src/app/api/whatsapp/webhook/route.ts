import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseWebhookPayload } from "@/lib/whatsapp/webhook-parser";
import { procesarMensajeEntrante, procesarEstadoSaliente } from "@/lib/whatsapp/inbound";

export const dynamic = "force-dynamic";

/**
 * Webhook de WhatsApp Cloud API.
 * GET: verificación inicial de Meta (hub.challenge).
 * POST: mensajes entrantes y estados de salientes. Siempre 200 ante errores de
 * procesamiento (Meta reintenta ante non-200 y duplicaría trabajo); los errores
 * quedan en el log del servidor.
 */

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  const esperado = process.env.META_VERIFY_TOKEN;
  if (mode === "subscribe" && esperado && token === esperado && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

function firmaValida(rawBody: string, header: string | null): boolean {
  const secret = process.env.META_APP_SECRET;
  // Sin app secret configurado (dev/QA local) no se puede validar: se acepta.
  if (!secret) return true;
  if (!header?.startsWith("sha256=")) return false;
  const esperada = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const recibida = header.slice("sha256=".length);
  if (esperada.length !== recibida.length) return false;
  return timingSafeEqual(Buffer.from(esperada, "hex"), Buffer.from(recibida, "hex"));
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  if (!firmaValida(rawBody, request.headers.get("x-hub-signature-256"))) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new NextResponse("Bad request", { status: 400 });
  }

  const { mensajes, estados } = parseWebhookPayload(payload);
  if (mensajes.length === 0 && estados.length === 0) {
    return NextResponse.json({ ok: true });
  }

  try {
    const admin = createAdminClient();
    for (const msg of mensajes) {
      try {
        await procesarMensajeEntrante(admin, msg);
      } catch (err) {
        console.error("[whatsapp] error procesando mensaje entrante:", err);
      }
    }
    for (const st of estados) {
      try {
        await procesarEstadoSaliente(admin, st);
      } catch (err) {
        console.error("[whatsapp] error procesando estado:", err);
      }
    }
  } catch (err) {
    // createAdminClient puede fallar si falta la service key: log y 200 igual.
    console.error("[whatsapp] webhook sin procesar:", err);
  }

  return NextResponse.json({ ok: true });
}
