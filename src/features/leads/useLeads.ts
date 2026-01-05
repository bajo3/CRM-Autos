"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LeadRow, LeadStage } from "./leads.types";
import { listLeads } from "./leads.api";
import { useAuth } from "@/features/auth/AuthProvider";

const LEADS_CACHE_TTL_MS = 30_000;
const PAGE_SIZE = 50;

const leadsCache = new Map<string, { at: number; items: LeadRow[]; page: number; hasMore: boolean }>();

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(t);
  }, [value, delayMs]);

  return debounced;
}

export function useLeads() {
  const { userId, role, loading: authLoading } = useAuth();

  const [items, setItems] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [stage, setStage] = useState<LeadStage | "all">("all");
  const [mine, setMine] = useState(false);
  const [overdue, setOverdue] = useState(false);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 350);

  const [assignedTo, setAssignedTo] = useState<"all" | "unassigned" | string>("all");

  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const lastReq = useRef(0);

  const cacheKey = useMemo(() => {
    const r = role ?? "seller";
    const effectiveMine = r === "seller" ? true : mine;
    const effectiveAssignedTo = r === "seller" ? "all" : assignedTo;
    return JSON.stringify({ r, userId, stage, mine: effectiveMine, overdue, search: debouncedSearch, assignedTo: effectiveAssignedTo });
  }, [assignedTo, debouncedSearch, mine, overdue, role, stage, userId]);

  // Set defaults for seller once role is known
  useEffect(() => {
    if (authLoading) return;
    if (role === "seller") {
      setMine(true);
      setAssignedTo("all");
    }
  }, [authLoading, role]);

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    const reqId = ++lastReq.current;
    if (!opts?.silent) setLoading(true);
    setError(null);

    try {
      if (authLoading) {
        setItems([]);
        return;
      }

      const r = role ?? "seller";

      if (r === "seller" && !userId) {
        setItems([]);
        return;
      }

      const effectiveMine = r === "seller" ? true : mine;
      const effectiveAssignedTo = r === "seller" ? "all" : assignedTo;

      const data = await listLeads({
        page: 0,
        pageSize: PAGE_SIZE,
        stage,
        mine: effectiveMine,
        overdue,
        search: debouncedSearch,
        userId,
        assignedTo: effectiveAssignedTo,
      });

      if (reqId !== lastReq.current) return;
      setItems(data);
      setPage(0);
      setHasMore(data.length >= PAGE_SIZE);
      leadsCache.set(cacheKey, { at: Date.now(), items: data, page: 0, hasMore: data.length >= PAGE_SIZE });
    } catch (e: any) {
      if (reqId !== lastReq.current) return;
      setError(e?.message ?? "Error cargando leads");
    } finally {
      if (reqId === lastReq.current) setLoading(false);
    }
  }, [assignedTo, authLoading, cacheKey, debouncedSearch, mine, overdue, role, stage, userId]);

  useEffect(() => {
    const hit = leadsCache.get(cacheKey);
    if (hit && Date.now() - hit.at < LEADS_CACHE_TTL_MS) {
      setItems(hit.items);
      setPage(hit.page);
      setHasMore(hit.hasMore);
      setLoading(false);
      refresh({ silent: true });
      return;
    }
    refresh();
  }, [cacheKey, refresh]);


  const loadMore = useCallback(async () => {
    if (authLoading) return;
    if (!userId) return;
    if (!hasMore) return;

    const reqId = ++lastReq.current;
    setError(null);
    setLoading(true);

    try {
      const r = role ?? "seller";
      const effectiveMine = r === "seller" ? true : mine;
      const effectiveAssignedTo = r === "seller" ? "all" : assignedTo;

      const nextPage = page + 1;

      const data = await listLeads({
        stage,
        mine: effectiveMine,
        overdue,
        search: debouncedSearch,
        userId,
        assignedTo: effectiveAssignedTo,
        page: nextPage,
        pageSize: PAGE_SIZE,
      });

      if (reqId !== lastReq.current) return;

      setItems((prev) => {
        const merged = [...prev, ...data];
        leadsCache.set(cacheKey, {
          at: Date.now(),
          items: merged,
          page: nextPage,
          hasMore: data.length >= PAGE_SIZE,
        });
        return merged;
      });

      setPage(nextPage);
      setHasMore(data.length >= PAGE_SIZE);
    } catch (e: any) {
      if (reqId !== lastReq.current) return;
      setError(e?.message ?? "Error cargando leads");
    } finally {
      if (reqId === lastReq.current) setLoading(false);
    }
  }, [assignedTo, authLoading, cacheKey, debouncedSearch, hasMore, mine, overdue, page, role, stage, userId]);

  const counts = useMemo(() => {
    const base = {
      all: items.length,
      new: 0,
      contacted: 0,
      interested: 0,
      negotiation: 0,
      won: 0,
      lost: 0,
    } as const;

    const c: any = { ...base };
    for (const it of items) c[it.stage] = (c[it.stage] ?? 0) + 1;
    return c as typeof base & Record<string, number>;
  }, [items]);

  return {
    items,
    loading,
    error,
    refresh,

    myRole: (role ?? "seller") as "admin" | "seller",

    stage,
    setStage,
    mine,
    setMine,
    overdue,
    setOverdue,

    search,
    setSearch,

    assignedTo,
    setAssignedTo,

    page,
    hasMore,
    loadMore,

    counts,
  };
}