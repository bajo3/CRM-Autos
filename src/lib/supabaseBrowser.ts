import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 👇 SOLO para debug local (no lo uses en prod)
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  (window as any).supabase = supabase;
}
  