import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTextMessage, sendTemplateMessage } from "@/lib/whatsapp/service";
import { registrarEventoWa } from "@/lib/whatsapp/log";
import { enviarRecordatoriosDiarios } from "@/lib/whatsapp/recordatorios";

export const dynamic = "force-dynamic";

const LOTE = 25;
const BACKOFF_MIN = 15;

/**
 * Worker de mensajes programados. Lo dispara Vercel Cron en producción
 * (vercel.json) o un curl manual en dev (ver docs/whatsapp-integration.md).
 * Requiere `Authorization: Bearer ${WHATSAPP_CRON_SECRET}`.
 */
async function ejecutar(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.WHATSAPP_CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const admin = createAdminClient();
  const { data: pendientes } = await admin
    .from("whatsapp_programado")
    .select("id, empresa_id, telefono, plantilla_id, plantilla_nombre, idioma, variables, cuerpo_texto, intentos_restantes")
    .eq("estado", "pendiente")
    .lte("send_at", new Date().toISOString())
    .order("send_at", { ascending: true })
    .limit(LOTE);

  let enviados = 0;
  let fallados = 0;
  let reintentados = 0;

  for (const p of pendientes ?? []) {
    // Lock optimista: si otro worker ya lo tomó, esta condición no matchea ninguna fila.
    const { data: tomado } = await admin
      .from("whatsapp_programado")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", p.id)
      .eq("estado", "pendiente")
      .select("id")
      .maybeSingle();
    if (!tomado) continue;

    let resultado: { ok: boolean; error?: string };
    try {
      if (p.plantilla_id) {
        let cuerpoLocal: string | null = null;
        const { data: plantilla } = await admin
          .from("whatsapp_plantilla")
          .select("cuerpo")
          .eq("id", p.plantilla_id)
          .maybeSingle();
        cuerpoLocal = plantilla?.cuerpo ?? null;

        resultado = await sendTemplateMessage(admin, {
          empresaId: p.empresa_id,
          telefono: p.telefono,
          nombrePlantilla: p.plantilla_nombre ?? "",
          idioma: p.idioma ?? "es_AR",
          variables: Array.isArray(p.variables) ? (p.variables as string[]) : [],
          cuerpoLocal,
        });
      } else if (p.cuerpo_texto) {
        resultado = await sendTextMessage(admin, {
          empresaId: p.empresa_id,
          telefono: p.telefono,
          cuerpo: p.cuerpo_texto,
        });
      } else {
        resultado = { ok: false, error: "El programado no tiene plantilla ni texto definido." };
      }
    } catch (err) {
      resultado = { ok: false, error: err instanceof Error ? err.message : "Error desconocido al enviar." };
    }

    if (resultado.ok) {
      await admin
        .from("whatsapp_programado")
        .update({ estado: "enviado", enviado_at: new Date().toISOString(), error_mensaje: null })
        .eq("id", p.id);
      enviados++;
      continue;
    }

    const intentosRestantes = p.intentos_restantes - 1;
    if (intentosRestantes > 0) {
      await admin
        .from("whatsapp_programado")
        .update({
          estado: "pendiente",
          intentos_restantes: intentosRestantes,
          send_at: new Date(Date.now() + BACKOFF_MIN * 60_000).toISOString(),
          error_mensaje: resultado.error ?? "Error al enviar",
        })
        .eq("id", p.id);
      reintentados++;
    } else {
      await admin
        .from("whatsapp_programado")
        .update({ estado: "fallado", intentos_restantes: 0, error_mensaje: resultado.error ?? "Error al enviar" })
        .eq("id", p.id);
      await registrarEventoWa(admin, {
        empresaId: p.empresa_id,
        tipo: "mensaje_fallado",
        detalle: `Programado agotó reintentos: ${resultado.error ?? "sin motivo"}`,
        datos: { programado_id: p.id },
      });
      fallados++;
    }
  }

  const recordatorios = await enviarRecordatoriosDiarios(admin);

  return NextResponse.json({
    ok: true,
    revisados: pendientes?.length ?? 0,
    enviados,
    reintentados,
    fallados,
    recordatorios,
  });
}

export async function POST(request: NextRequest) {
  return ejecutar(request);
}

// Vercel Cron dispara GET; se acepta también para poder probarlo con un link.
export async function GET(request: NextRequest) {
  return ejecutar(request);
}
