export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Role = "admin" | "manager" | "seller";

function isRole(v: any): v is Role {
  return v === "admin" || v === "seller";
}

function bad(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

export async function POST(req: Request) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return bad("Missing Authorization Bearer token", 401);

    const admin = supabaseAdmin;

    // 1) validar caller
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) return bad("Invalid session", 401);

    const callerId = userData.user.id;

    const { data: callerProfile, error: callerProfErr } = await admin
      .from("profiles")
      .select("dealership_id, role")
      .eq("user_id", callerId)
      .single();

    if (callerProfErr || !callerProfile) return bad("Caller profile not found", 403);

    const callerRole = callerProfile.role as Role | null;
    const callerDealership = callerProfile.dealership_id as string | null;

    if (!callerRole || !callerDealership) return bad("Caller not assigned to a dealership/role", 403);
    if (callerRole !== "admin") return bad("Forbidden", 403);

    // 2) body
    const body = await req.json().catch(() => null);
    if (!body) return bad("Invalid JSON body");

    const email = String(body.email ?? "").trim().toLowerCase();
    const full_name = String(body.full_name ?? "").trim();
    const phone = body.phone ? String(body.phone).trim() : null;
    const role = body.role as Role;

    const mode = (body.mode ?? "create") as "invite" | "create";
    const password = body.password ? String(body.password) : null;

    if (!email || !email.includes("@")) return bad("Email inválido");
    if (!full_name) return bad("Nombre requerido");
    if (!isRole(role)) return bad("Role inválido");

    // Solo Admin crea usuarios.

    // ✅ claims para JWT/RLS y trigger
    const app_metadata = {
      dealership_id: callerDealership,
      role,
    } as const;

    const user_metadata = {
      full_name,
      ...(phone ? { phone } : {}),
    } as const;

    // 3) crear/invitar en Auth
    let createdUserId: string | null = null;

    if (mode === "invite") {
      const redirectTo = process.env.NEXT_PUBLIC_SITE_URL
        ? `${process.env.NEXT_PUBLIC_SITE_URL}/login`
        : undefined;

      // ✅ FIX: pasar metadata en la invitación
      const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo,
        data: user_metadata, // user_metadata
        // app_metadata no siempre está tipado en el SDK para invite, pero Supabase lo acepta.
        // Si TS te protesta, casteá el objeto options a "any".
        app_metadata,
      } as any);

      if (error) return bad(`Invite error: ${error.message}`, 400);
      createdUserId = data.user?.id ?? null;
    } else {
      const pass = password && password.length >= 8 ? password : undefined;
      if (!pass) return bad("Password requerido (mín 8 caracteres) en modo create");

      // ✅ FIX: createUser con app_metadata + user_metadata
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password: pass,
        email_confirm: true,
        app_metadata,
        user_metadata,
      });

      if (error) return bad(`Create user error: ${error.message}`, 400);
      createdUserId = data.user?.id ?? null;
    }

    if (!createdUserId) return bad("No se pudo obtener user_id del usuario creado", 500);

    // 4) upsert en profiles (dejarlo como “seguro”, aunque el trigger ya lo crea)
    const { error: upsertErr } = await admin
      .from("profiles")
      .upsert(
        {
          user_id: createdUserId,
          dealership_id: callerDealership,
          role,
          full_name,
          phone,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (upsertErr) return bad(`Profiles upsert error: ${upsertErr.message}`, 400);

    return NextResponse.json({
      ok: true,
      user_id: createdUserId,
      email,
      role,
      full_name,
      phone,
      mode,
    });
  } catch (e: any) {
    return bad(e?.message ?? "Unexpected error", 500);
  }
}
