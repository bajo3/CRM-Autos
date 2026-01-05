"use client";

import { useEffect, useState } from "react";
import { listAssignees } from "./leads.api";

const ASSIGNEES_CACHE_TTL_MS = 5 * 60_000;
let assigneesCache: { at: number; items: { user_id: string; full_name: string | null; role: string | null }[] } | null = null;

export function useAssignees() {
  const [assignees, setAssignees] = useState<
    { user_id: string; full_name: string | null; role: string | null }[]
  >(() => {
    if (assigneesCache && Date.now() - assigneesCache.at < ASSIGNEES_CACHE_TTL_MS) return assigneesCache.items;
    return [];
  });
  const [loadingAssignees, setLoadingAssignees] = useState(() => {
    return !(assigneesCache && Date.now() - assigneesCache.at < ASSIGNEES_CACHE_TTL_MS);
  });
  const [assigneesError, setAssigneesError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    const fresh = assigneesCache && Date.now() - assigneesCache.at < ASSIGNEES_CACHE_TTL_MS;

    (async () => {
      try {
        const a = await listAssignees();
        if (!alive) return;
        setAssignees(a);
        assigneesCache = { at: Date.now(), items: a };
      } catch (e: any) {
        if (!alive) return;
        // Si ya teníamos cache, no rompas la UI con error
        if (!fresh) setAssigneesError(e?.message ?? "Error cargando vendedores");
      } finally {
        if (!alive) return;
        setLoadingAssignees(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return { assignees, loadingAssignees, assigneesError };
}
