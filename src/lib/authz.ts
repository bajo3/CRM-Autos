import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type AppRole = "admin" | "seller";

export type AuthedContext = {
  user_id: string;
  email: string | null;
  role: AppRole | null;
  dealership_id: string | null;
};

function getBearerToken(req: Request): string | null {
  const h = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!h) return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1] ?? null;
}

export async function getAuthedContext(req: Request): Promise<AuthedContext | null> {
  const token = getBearerToken(req);
  if (!token) return null;

  // Verifica token (no confíes en data enviada por el cliente)
  const { data: u, error: uErr } = await supabaseAdmin.auth.getUser(token);
  if (uErr || !u.user) return null;

  const user_id = u.user.id;
  const email = u.user.email ?? null;

  const { data: p, error: pErr } = await supabaseAdmin
    .from("profiles")
    .select("role, dealership_id")
    .eq("user_id", user_id)
    .maybeSingle();

  if (pErr) return { user_id, email, role: null, dealership_id: null };

  const role = (p?.role ?? null) as AppRole | null;
  const dealership_id = (p?.dealership_id ?? null) as string | null;

  return { user_id, email, role, dealership_id };
}

export async function requireAdmin(req: Request): Promise<AuthedContext> {
  const ctx = await getAuthedContext(req);
  if (!ctx) throw new Error("UNAUTHORIZED");
  if (ctx.role !== "admin") throw new Error("FORBIDDEN");
  if (!ctx.dealership_id) throw new Error("NO_DEALERSHIP");
  return ctx;
}
