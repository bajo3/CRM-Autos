import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { rel, type Rel } from "@/lib/rel";
import type { Database } from "@/lib/types/database.types";

type Profile = Database["public"]["Tables"]["profile"]["Row"];
type Empresa = Database["public"]["Tables"]["empresa"]["Row"];
type ProfileConEmpresa = Profile & { empresa: Rel<Empresa> };

export type SessionContext = {
  userId: string;
  email: string | null;
  profile: Profile | null;
  empresa: Empresa | null;
};

/**
 * Devuelve el usuario autenticado junto con su profile y empresa, en un solo
 * round-trip a Supabase (getClaims valida el JWT localmente sin red — ver
 * src/lib/supabase/middleware.ts — y profile+empresa se traen con un embed).
 * Envuelto en React.cache: layout, página y componentes de un mismo request
 * comparten una sola ejecución.
 */
export const getSessionContext = cache(async (): Promise<SessionContext | null> => {
  const supabase = createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return null;

  const { data: profile } = await supabase
    .from("profile")
    .select("*, empresa(*)")
    .eq("id", claims.sub)
    .maybeSingle<ProfileConEmpresa>();

  return {
    userId: claims.sub,
    email: (claims.email as string | undefined) ?? null,
    profile: profile ?? null,
    empresa: profile ? rel(profile.empresa) : null,
  };
});
