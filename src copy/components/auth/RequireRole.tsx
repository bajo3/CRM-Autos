"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/AuthProvider";

type Role = "admin" | "manager" | "seller";

export function RequireRole(props: { role: Role | Role[]; children: React.ReactNode }) {
  const { role, loading, session, profileLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const allowed = Array.isArray(props.role) ? props.role : [props.role];

  useEffect(() => {
    if (loading) return;
    if (session) return;
    const next = pathname ? `?next=${encodeURIComponent(pathname)}` : "";
    router.replace(`/login${next}`);
  }, [loading, session, router, pathname]);

  if (loading) {
    return <div className="min-h-screen grid place-items-center text-sm text-slate-600">Cargando…</div>;
  }

  if (!session) {
    return <div className="min-h-screen grid place-items-center text-sm text-slate-600">Redirigiendo…</div>;
  }

  // Si el profile todavía está cargando y no tenemos role, no te niego el acceso todavía.
  if (profileLoading && !role) {
    return <div className="min-h-screen grid place-items-center text-sm text-slate-600">Cargando permisos…</div>;
  }

  if (!role || !allowed.includes(role as any)) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-5 text-sm text-slate-700 shadow-soft">
          <div className="text-base font-semibold text-slate-900">Sin permisos</div>
          <div className="mt-1 text-slate-600">No tenés acceso a esta sección con tu rol actual.</div>
          <button
            className="mt-4 inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2 text-white"
            onClick={() => router.replace("/dashboard")}
          >
            Volver al dashboard
          </button>
        </div>
      </div>
    );
  }

  return <>{props.children}</>;
}
