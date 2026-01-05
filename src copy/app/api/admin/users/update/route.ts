export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdminOrManager, ensureSameDealership, type Role } from "../_utils";

function isRole(v: any): v is Role {
  return v === "admin" || v === "seller";
}

export async function PATCH(req: Request) {
  const gate = await requireAdminOrManager(req);
  if (!gate.ok) return gate.res;
  const { ctx } = gate;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const user_id = String(body.user_id ?? "").trim();
  if (!user_id) return NextResponse.json({ error: "user_id requerido" }, { status: 400 });

  if (user_id === ctx.userId && body.is_active === false) {
    return NextResponse.json({ error: "No podés desactivarte a vos mismo" }, { status: 400 });
  }

  const same = await ensureSameDealership(user_id, ctx.dealership_id);
  if (!same.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const patch: any = { updated_at: new Date().toISOString() };

  if (body.full_name !== undefined) patch.full_name = String(body.full_name ?? "").trim() || null;
  if (body.phone !== undefined) patch.phone = String(body.phone ?? "").trim() || null;

  // Role: solo admin.
  if (body.role !== undefined) {
    if (ctx.role !== "admin") {
      patch.role = "seller";
    } else {
      const r = body.role;
      if (!isRole(r)) return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
      patch.role = r;
    }
  }

  // Soft disable
  if (body.is_active !== undefined) {
    const next = Boolean(body.is_active);
    patch.is_active = next;
    patch.deactivated_at = next ? null : new Date().toISOString();

    // Ban en Auth para cortar login
    const ban_duration = next ? "none" : "100y";
    const { error: banErr } = await supabaseAdmin.auth.admin.updateUserById(user_id, { ban_duration } as any);
    if (banErr) return NextResponse.json({ error: banErr.message }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("profiles").update(patch).eq("user_id", user_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
