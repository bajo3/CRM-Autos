"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TaskRow, TaskStatus } from "./tasks.types";
import { listTasks } from "./tasks.api";
import { useAuth } from "@/features/auth/AuthProvider";

const TASKS_CACHE_TTL_MS = 20_000;
const PAGE_SIZE = 50;

type Filters = {
  status: TaskStatus | "all";
  assignedTo: "all" | "team" | "unassigned" | string;
  search: string;
};

const tasksCache = new Map<string, { at: number; items: TaskRow[]; page: number; hasMore: boolean }>();

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export function useTasks(filters: Filters) {
  const { userId, role, loading: authLoading } = useAuth();

  const [items, setItems] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const debouncedSearch = useDebouncedValue(filters.search, 300);

  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const lastReq = useRef(0);

  const cacheKey = useMemo(() => {
    const r = role ?? "seller";
    // Por permisos, si no sos admin ignoramos filtros de asignación.
    const effAssignedTo = r === "admin" ? filters.assignedTo : "all";
    return JSON.stringify({ userId, r, status: filters.status, assignedTo: effAssignedTo, search: debouncedSearch });
  }, [debouncedSearch, filters.assignedTo, filters.status, role, userId]);

  const refresh = useCallback(
    async (opts?: { silent?: boolean }) => {
      const reqId = ++lastReq.current;
      if (!opts?.silent) setLoading(true);
      setError(null);

      try {
        if (authLoading) {
          setItems([]);
          return;
        }
        if (!userId) {
          setItems([]);
          return;
        }

        const r = role ?? "seller";
        const effAssignedTo = r === "admin" ? filters.assignedTo : "all";

        const data = await listTasks({
          page: 0,
          pageSize: PAGE_SIZE,
          status: filters.status,
          assignedTo: effAssignedTo,
          search: debouncedSearch,
        });

        if (reqId !== lastReq.current) return;
        setItems(data);
        setPage(0);
        setHasMore(data.length >= PAGE_SIZE);
        tasksCache.set(cacheKey, { at: Date.now(), items: data, page: 0, hasMore: data.length >= PAGE_SIZE });
      } catch (e: any) {
        if (reqId !== lastReq.current) return;
        setError(e?.message ?? "Error cargando tareas");
      } finally {
        if (reqId === lastReq.current) setLoading(false);
      }
    },
    [authLoading, cacheKey, debouncedSearch, filters.assignedTo, filters.status, role, userId]
  );

  useEffect(() => {
    const hit = tasksCache.get(cacheKey);
    if (hit && Date.now() - hit.at < TASKS_CACHE_TTL_MS) {
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
      const effAssignedTo = r === "admin" ? filters.assignedTo : "all";
      const nextPage = page + 1;

      const data = await listTasks({
        status: filters.status,
        assignedTo: effAssignedTo,
        search: debouncedSearch,
        page: nextPage,
        pageSize: PAGE_SIZE,
      });

      if (reqId !== lastReq.current) return;

      setItems((prev) => {
        const merged = [...prev, ...data];
        tasksCache.set(cacheKey, {
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
      setError(e?.message ?? "Error cargando tareas");
    } finally {
      if (reqId === lastReq.current) setLoading(false);
    }
  }, [authLoading, cacheKey, debouncedSearch, filters.assignedTo, filters.status, hasMore, page, role, userId]);

  return {
    items,
    loading,
    error,
    refresh,
    loadMore,
    hasMore,
    page,
    // compat con UI actual
    role: (role ?? "seller") as "admin" | "seller",
    userId,
  };
}
