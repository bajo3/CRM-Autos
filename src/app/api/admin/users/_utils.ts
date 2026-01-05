import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type Role = "admin" | "manager" | "seller";

function bearer(req: Request) {
  const h = req.headers.get("authorization") ?? "";
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m?.[1] ?? null;
}

export async function requireAdminOrManager(req: Request) {
  const token = bearer(req);
  if (!token) return { ok: false as const, res: NextResponse.json({ error: "Missing token" }, { status: 401 }) };

  const { data: u, error: uErr } = await supabaseAdmin.auth.getUser(token);
  if (uErr || !u?.user) return { ok: false as const, res: NextResponse.json({ error: "Invalid session" }, { status: 401 }) };

  const userId = u.user.id;

  const { data: p, error: pErr } = await supabaseAdmin
    .from("profiles")
    .select("user_id, dealership_id, role, is_active")
    .eq("user_id", userId)
    .maybeSingle();

  if (pErr || !p?.dealership_id || !p?.role) {
    return { ok: false as const, res: NextResponse.json({ error: "Profile not configured" }, { status: 403 }) };
  }
  if (p.is_active === false) {
    return { ok: false as const, res: NextResponse.json({ error: "User disabled" }, { status: 403 }) };
  }

  const role = String(p.role);
  if (role !== "admin") {
    return { ok: false as const, res: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { ok: true as const, ctx: { userId, dealership_id: String(p.dealership_id), role: role as Role } };
}

export async function requireAdminOnly(req: Request) {
  const gate = await requireAdminOrManager(req);
  if (!gate.ok) return gate;
  if (gate.ctx.role !== "admin") {
    return { ok: false as const, res: NextResponse.json({ error: "Admin only" }, { status: 403 }) };
  }
  return gate;
}

export async function ensureSameDealership(targetUserId: string, dealership_id: string) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("user_id, dealership_id, role")
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (error || !data) return { ok: false as const, target: null };
  if (String(data.dealership_id) !== String(dealership_id)) return { ok: false as const, target: null };
  return { ok: true as const, target: data };
}
