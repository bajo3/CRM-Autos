"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/AuthProvider";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { loading, session } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (session) return;

    const next = pathname && pathname !== "/login" ? `?next=${encodeURIComponent(pathname)}` : "";
    router.replace(`/login${next}`);
  }, [loading, session, router, pathname]);

  // Durante el bootstrap inicial (una sola vez), mostramos un loader liviano.
  if (loading) {
    return <div className="min-h-screen grid place-items-center text-sm text-slate-600">Cargando…</div>;
  }

  // Si no hay sesión, el useEffect va a redirigir.
  if (!session) {
    return <div className="min-h-screen grid place-items-center text-sm text-slate-600">Redirigiendo…</div>;
  }

  return <>{children}</>;
}
