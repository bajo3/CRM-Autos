"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { ALERTS_INVALIDATE_EVENT } from "./alerts.bus";
import { toErrorMessage } from "@/lib/errors";

type Role = "admin" | "seller" | "manager" | null;

export type AlertsCounts = {
  vehiclesPending: number;
  leadsOverdue: number;
  tasksOverdue: number;
  creditsEndingSoonOrOverdue: number;
};

function ymd(d: Date) {
  // YYYY-MM-DD
  return d.toISOString().slice(0, 10);
}

export function useAlerts(params: { userId: string | null; role: Role | null }) {
  const { userId, role } = params;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [counts, setCounts] = useState<AlertsCounts>({
    vehiclesPending: 0,
    leadsOverdue: 0,
    tasksOverdue: 0,
    creditsEndingSoonOrOverdue: 0,
  });

  const refreshRef = useRef<() => void>(() => {});
  const throttleTimer = useRef<any>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setCounts({ vehiclesPending: 0, leadsOverdue: 0, tasksOverdue: 0, creditsEndingSoonOrOverdue: 0 });
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const now = new Date();
      const in2m = new Date(now);
      in2m.setMonth(in2m.getMonth() + 2);

      // Vehicles pending (draft)
      let vq = supabase.from("vehicles").select("id", { count: "exact", head: true }).eq("status", "draft");
      if (role === "seller") vq = vq.eq("created_by", userId);

      // Leads overdue (next_follow_up_at < now)
      let lq = supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .lt("next_follow_up_at", now.toISOString());
      if (role === "seller") lq = lq.eq("assigned_to", userId);

      // Tasks overdue (open + due_at < now)
      const tq = supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("status", "open")
        .lt("due_at", now.toISOString());

      // Credits ending soon or already ended but still active:
      // end_date <= today + 2 months (includes past)
      const cutoff = ymd(in2m);
      const cq = supabase
        .from("credits_with_end_date_v1")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
        .lte("end_date", cutoff)
        .not("end_date", "is", null);

      const [vr, lr, tr, cr] = await Promise.all([vq, lq, tq, cq]);

      const anyErr = vr.error || lr.error || tr.error || cr.error;
      if (anyErr) throw anyErr;

      setCounts({
        vehiclesPending: vr.count ?? 0,
        leadsOverdue: lr.count ?? 0,
        tasksOverdue: tr.count ?? 0,
        creditsEndingSoonOrOverdue: cr.count ?? 0,
      });
    } catch (e) {
      setError(toErrorMessage(e, "No pude cargar alertas"));
    } finally {
      setLoading(false);
    }
  }, [userId, role]);

  refreshRef.current = refresh;

  const total = useMemo(() => {
    return (
      counts.vehiclesPending +
      counts.leadsOverdue +
      counts.tasksOverdue +
      counts.creditsEndingSoonOrOverdue
    );
  }, [counts]);

  // Manual invalidation (after local actions)
  useEffect(() => {
    function onInvalidate() {
      refreshRef.current();
    }
    if (typeof window !== "undefined") {
      window.addEventListener(ALERTS_INVALIDATE_EVENT, onInvalidate);
      return () => window.removeEventListener(ALERTS_INVALIDATE_EVENT, onInvalidate);
    }
  }, []);

  // Realtime (multi-user) — throttled
  useEffect(() => {
    if (!userId) return;

    function scheduleRefresh() {
      if (throttleTimer.current) return;
      throttleTimer.current = setTimeout(() => {
        throttleTimer.current = null;
        refreshRef.current();
      }, 350);
    }

    const ch = supabase
      .channel("alerts-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "vehicles" }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "credits" }, scheduleRefresh)
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
      if (throttleTimer.current) {
        clearTimeout(throttleTimer.current);
        throttleTimer.current = null;
      }
    };
  }, [userId]);

  // initial load + when role changes
  useEffect(() => {
    refresh();
  }, [refresh]);

  return { counts, total, loading, error, refresh };
}
