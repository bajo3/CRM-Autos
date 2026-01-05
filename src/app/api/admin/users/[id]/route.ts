export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Role = "admin" | "manager" | "seller";
function isRole(v: any): v is Role {
  return v === "admin" || v === "manager" || v === "seller";
}

function bad(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

function bearer(req: Request) {
  const h = req.headers.get("authorization") ?? "";
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m?.[1] ?? null;
}

// ✅ Next.js 15: params es Promise, no objeto directo
type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;

  const token = bearer(req);
  if (!token) return bad("Missing token", 401);

  // caller (quien está haciendo el cambio)
  const { data: u, error: uErr } = await supabaseAdmin.auth.getUser(token);
  if (uErr || !u?.user) return bad("Invalid session", 401);

  const callerId = u.user.id;

  const { data: caller, error: callerErr } = await supabaseAdmin
    .from("profiles")
    .select("user_id, dealership_id, role")
    .eq("user_id", callerId)
    .maybeSingle();

  if (callerErr || !caller) return bad("Caller profile not found", 403);

  const callerRole = caller.role as Role | null;
  const callerDealership = caller.dealership_id as string | null;

  if (!callerRole || !callerDealership) return bad("Caller not assigned to a dealership/role", 403);
  if (callerRole !== "admin") return bad("Forbidden", 403);

  // target (a quién editás)
  const targetUserId = String(id ?? "").trim();
  if (!targetUserId) return bad("Missing target id", 400);

  const { data: target, error: targetErr } = await supabaseAdmin
    .from("profiles")
    .select("user_id, dealership_id, role")
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (targetErr || !target) return bad("Target profile not found", 404);
  if (String(target.dealership_id) !== String(callerDealership)) return bad("Forbidden", 403);

  const body = await req.json().catch(() => null);
  if (!body) return bad("Invalid JSON");

  // construimos patch
  const patch: any = { updated_at: new Date().toISOString() };

  if (body.full_name !== undefined) patch.full_name = String(body.full_name ?? "").trim() || null;
  if (body.phone !== undefined) patch.phone = String(body.phone ?? "").trim() || null;

  // role: solo admin
  if (body.role !== undefined) {
    if (callerRole !== "admin") {
      patch.role = "seller";
    } else {
      if (!isRole(body.role)) return bad("Rol inválido", 400);
      patch.role = body.role;
    }
  }

  // is_active: no permitir desactivarse a sí mismo
  if (body.is_active !== undefined) {
    const next = Boolean(body.is_active);
    if (targetUserId === callerId && next === false) {
      return bad("No podés desactivarte a vos mismo", 400);
    }

    patch.is_active = next;
    patch.deactivated_at = next ? null : new Date().toISOString();

    // cortar login (ban)
    const ban_duration = next ? "none" : "100y";
    const { error: banErr } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
      ban_duration,
    } as any);

    if (banErr) return bad(banErr.message, 400);
  }

  const { error: updErr } = await supabaseAdmin.from("profiles").update(patch).eq("user_id", targetUserId);
  if (updErr) return bad(updErr.message, 400);

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;

  const token = bearer(req);
  if (!token) return bad("Missing token", 401);

  const { data: u, error: uErr } = await supabaseAdmin.auth.getUser(token);
  if (uErr || !u?.user) return bad("Invalid session", 401);

  const callerId = u.user.id;

  const { data: caller, error: callerErr } = await supabaseAdmin
    .from("profiles")
    .select("user_id, dealership_id, role")
    .eq("user_id", callerId)
    .maybeSingle();

  if (callerErr || !caller) return bad("Caller profile not found", 403);

  const callerRole = (caller.role as Role | null) ?? null;
  const callerDealership = (caller.dealership_id as string | null) ?? null;

  if (!callerRole || !callerDealership) return bad("Caller not assigned to a dealership/role", 403);
  if (callerRole !== "admin") return bad("Forbidden", 403);

  const targetUserId = String(id ?? "").trim();
  if (!targetUserId) return bad("Missing target id", 400);
  if (targetUserId === callerId) return bad("No podés eliminarte a vos mismo", 400);

  const { data: target, error: targetErr } = await supabaseAdmin
    .from("profiles")
    .select("user_id, dealership_id")
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (targetErr || !target) return bad("Target profile not found", 404);
  if (String(target.dealership_id) !== String(callerDealership)) return bad("Forbidden", 403);

  // desasignar leads dentro del tenant
  await supabaseAdmin
    .from("leads")
    .update({ assigned_to: null })
    .eq("dealership_id", callerDealership)
    .eq("assigned_to", targetUserId);

  const { error: delAuthErr } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
  if (delAuthErr) return bad(delAuthErr.message, 400);

  // por las dudas, limpiar profile si quedó
  await supabaseAdmin.from("profiles").delete().eq("user_id", targetUserId);

  return NextResponse.json({ ok: true });
}
