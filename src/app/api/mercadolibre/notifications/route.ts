import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Webhook de notificaciones de MercadoLibre.
 *
 * ML envía un POST por cada evento (preguntas, ventas, cambios de publicación…)
 * y espera un 200 rápido. Guardamos el evento crudo en `ml_notificacion` vía la
 * función `ml_registrar_notificacion` (SECURITY DEFINER: el webhook llega sin
 * sesión) y respondemos de inmediato. El procesamiento fino se hace después.
 */
export async function POST(request: NextRequest) {
  let payload: unknown = null;
  try {
    payload = await request.json();
  } catch {
    // Cuerpo no-JSON: igual respondemos 200 para que ML no reintente en loop.
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  try {
    const sb = createClient();
    await sb.rpc("ml_registrar_notificacion", {
      p: payload as never,
    });
  } catch {
    // No propagamos: ML reintenta si no devolvemos 200, pero un fallo de
    // registro no debe tumbar el endpoint.
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

// Algunas validaciones de ML hacen un GET de prueba a la URL.
export async function GET() {
  return NextResponse.json({ ok: true });
}
