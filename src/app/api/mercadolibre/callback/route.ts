import { NextRequest, NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { verificarState } from "@/lib/mercadolibre/state";
import { intercambiarCodigo, obtenerUsuario } from "@/lib/mercadolibre/client";

/**
 * Callback OAuth de MercadoLibre. El navegador del usuario vuelve acá con
 * `code` y `state` tras autorizar. Intercambiamos el code por tokens y los
 * guardamos en `ml_cuenta` (1 por empresa).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const error = searchParams.get("error");
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const volver = (estado: string) =>
    NextResponse.redirect(new URL(`/publicaciones?ml=${estado}`, origin));

  // El usuario canceló o ML devolvió error.
  if (error) return volver(`error&detalle=${encodeURIComponent(error)}`);
  if (!code || !state) return volver("error&detalle=faltan_parametros");

  // El state firmado prueba que el flujo salió de nuestra app.
  const empresaState = verificarState(state);
  if (!empresaState) return volver("error&detalle=state_invalido");

  // Necesitamos sesión para escribir bajo RLS y atar la cuenta al usuario.
  const ctx = await getSessionContext();
  if (!ctx?.profile?.empresa_id) {
    return NextResponse.redirect(new URL("/login", origin));
  }
  if (ctx.profile.empresa_id !== empresaState) {
    return volver("error&detalle=empresa_no_coincide");
  }

  try {
    const token = await intercambiarCodigo(code);
    let nickname: string | null = null;
    let email: string | null = null;
    try {
      const u = await obtenerUsuario(token.access_token);
      nickname = u.nickname ?? null;
      email = u.email ?? null;
    } catch {
      // Si /users/me falla no abortamos: la cuenta queda conectada igual.
    }

    const sb = createClient();
    const { error: upErr } = await sb.from("ml_cuenta").upsert(
      {
        empresa_id: ctx.profile.empresa_id,
        ml_user_id: token.user_id,
        nickname,
        email,
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        token_expira: new Date(Date.now() + token.expires_in * 1000).toISOString(),
        scope: token.scope,
        conectada_por: ctx.profile.id,
      },
      { onConflict: "empresa_id" },
    );
    if (upErr) return volver(`error&detalle=${encodeURIComponent(upErr.message)}`);

    return volver("ok");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error_desconocido";
    return volver(`error&detalle=${encodeURIComponent(msg.slice(0, 200))}`);
  }
}
