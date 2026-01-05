export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdminOnly, ensureSameDealership } from "../_utils";

export async function POST(req: Request) {
  const gate = await requireAdminOnly(req);
  if (!gate.ok) return gate.res;
  const { ctx } = gate;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const user_id = String(body.user_id ?? "").trim();
  if (!user_id) return NextResponse.json({ error: "user_id requerido" }, { status: 400 });

  if (user_id === ctx.userId) {
    return NextResponse.json({ error: "No podés eliminarte a vos mismo" }, { status: 400 });
  }

  const same = await ensureSameDealership(user_id, ctx.dealership_id);
  if (!same.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // 1) Desasignar leads del tenant (para no dejar assigned_to colgando / FK)
  await supabaseAdmin
    .from("leads")
    .update({ assigned_to: null } as any)
    .eq("dealership_id", ctx.dealership_id)
    .eq("assigned_to", user_id);

  // 2) Borrar profile
  await supabaseAdmin.from("profiles").delete().eq("user_id", user_id);

  // 3) Borrar usuario Auth
  const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(user_id);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
