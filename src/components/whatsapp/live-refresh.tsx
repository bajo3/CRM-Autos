"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Refresca el árbol de Server Components cada `ms` sin recargar la página.
 * Reemplaza WebSockets/Realtime: no hay infraestructura nueva, y el costo
 * es una query liviana cada 5s solo mientras la bandeja está abierta.
 */
export function LiveRefresh({ ms = 5000 }: { ms?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), ms);
    return () => clearInterval(id);
  }, [router, ms]);
  return null;
}
