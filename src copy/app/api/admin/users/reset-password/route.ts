export const runtime = "nodejs";

import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdminOrManager, ensureSameDealership } from "../_utils";

function genTemp() {
  return `Tmp-${crypto.randomBytes(9).toString("base64url")}`;
}

export async function POST(req: Request) {
  const gate = await requireAdminOrManager(req);
  if (!gate.ok) return gate.res;
  const { ctx } = gate;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const user_id = String(body.user_id ?? "").trim();
  const mode = String(body.mode ?? "temp"); // "temp" | "recovery"

  if (!user_id) return NextResponse.json({ error: "user_id requerido" }, { status: 400 });

  const same = await ensureSameDealership(user_id, ctx.dealership_id);
  if (!same.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (mode === "recovery") {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(user_id);
    if (error || !data?.user?.email) {
      return NextResponse.json({ error: error?.message ?? "No se pudo obtener email" }, { status: 400 });
    }

    const email = data.user.email;

    // Si tu versión no trae generateLink, eliminá este bloque y usá solo temp password.
    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email,
    } as any);

    if (linkErr) return NextResponse.json({ error: linkErr.message }, { status: 400 });

    const action_link =
      (linkData as any)?.properties?.action_link ?? (linkData as any)?.action_link ?? null;

    if (!action_link) return NextResponse.json({ error: "No action_link en respuesta" }, { status: 400 });

    return NextResponse.json({ ok: true, email, action_link });
  }

  const password = String(body.password ?? "").trim() || genTemp();

  const { error: upErr } = await supabaseAdmin.auth.admin.updateUserById(user_id, { password });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 });

  return NextResponse.json({ ok: true, temp_password: password });
}
