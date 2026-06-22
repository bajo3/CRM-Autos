import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database.types";

type Profile = Database["public"]["Tables"]["profile"]["Row"];
type Empresa = Database["public"]["Tables"]["empresa"]["Row"];

export type SessionContext = {
  userId: string;
  email: string | null;
  profile: Profile | null;
  empresa: Empresa | null;
};

/**
 * Devuelve el usuario autenticado junto con su profile y empresa.
 * Las consultas pasan por RLS, así que solo trae datos de su propia empresa.
 */
export async function getSessionContext(): Promise<SessionContext | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profile")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  let empresa: Empresa | null = null;
  if (profile?.empresa_id) {
    const { data } = await supabase
      .from("empresa")
      .select("*")
      .eq("id", profile.empresa_id)
      .maybeSingle();
    empresa = data;
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    profile: profile ?? null,
    empresa,
  };
}
