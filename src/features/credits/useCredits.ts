"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CreditRow, CreditStatus } from "./credits.types";
import { listCredits } from "./credits.api";
import { computeCreditSchedule } from "./credits.utils";

const PAGE_SIZE = 50;

const CREDITS_CACHE_TTL_MS = 30_000;

type CreditsCacheEntry = {
  at: number;
  items: CreditRow[];
  page: number;
  hasMore: boolean;
};

const creditsCache = new Map<string, CreditsCacheEntry>();

function sortCredits(list: CreditRow[]) {
  // Activos primero. Dentro de activos: el que está más cerca de vencer arriba
  // (por cuotas restantes y, como tie-breaker, por fecha de finalización).
  return [...list].sort((a, b) => {
    if (a.status !== b.status) return a.status === "active" ? -1 : 1;

    const sa = computeCreditSchedule(a.start_date, a.installment_count, a.status);
    const sb = computeCreditSchedule(b.start_date, b.installment_count, b.status);

    const ra = sa ? (sa.remaining === 0 ? -1 : sa.remaining) : 9999;
    const rb = sb ? (sb.remaining === 0 ? -1 : sb.remaining) : 9999;
    if (ra !== rb) return ra - rb;

    const ea = sa ? sa.lastDue.getTime() : Number.POSITIVE_INFINITY;
    const eb = sb ? sb.lastDue.getTime() : Number.POSITIVE_INFINITY;
    if (ea !== eb) return ea - eb;

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export function useCredits() {
  const [items, setItems] = useState<CreditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState<CreditStatus | "all">("all");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 350);

  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const cacheKey = useMemo(() => JSON.stringify({ status, search: debouncedSearch }), [status, debouncedSearch]);

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    setError(null);
    try {
      const data = await listCredits({ status, search: debouncedSearch, page: 0, pageSize: PAGE_SIZE });

      const sorted = sortCredits(data);

      setItems(sorted);
      setPage(0);
      setHasMore(sorted.length >= PAGE_SIZE);
      creditsCache.set(cacheKey, { at: Date.now(), items: sorted, page: 0, hasMore: sorted.length >= PAGE_SIZE });
    } catch (e: any) {
      setError(e?.message ?? "Error cargando créditos");
    } finally {
      setLoading(false);
    }
  }, [status, debouncedSearch, cacheKey]);

  useEffect(() => {
    const hit = creditsCache.get(cacheKey);
    if (hit && Date.now() - hit.at < CREDITS_CACHE_TTL_MS) {
      setItems(hit.items);
      setPage(hit.page);
      setHasMore(hit.hasMore);
      setLoading(false);
      refresh({ silent: true });
      return;
    }
    refresh();
  }, [cacheKey, refresh]);

  const counts = useMemo(() => {
    let active = 0;
    let closed = 0;
    for (const c of items) {
      if (c.status === "active") active++;
      if (c.status === "closed") closed++;
    }
    return { all: items.length, active, closed };
  }, [items]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    setError(null);
    setLoading(true);

    try {
      const nextPage = page + 1;
      const data = await listCredits({ status, search: debouncedSearch, page: nextPage, pageSize: PAGE_SIZE });
      const merged = sortCredits([...items, ...data]);

      setItems(merged);
      setPage(nextPage);
      const nextHasMore = data.length >= PAGE_SIZE;
      setHasMore(nextHasMore);
      creditsCache.set(cacheKey, { at: Date.now(), items: merged, page: nextPage, hasMore: nextHasMore });
    } catch (e: any) {
      setError(e?.message ?? "Error cargando créditos");
    } finally {
      setLoading(false);
    }
  }, [cacheKey, debouncedSearch, hasMore, items, loading, page, status]);

  return {
    items,
    setItems,
    loading,
    error,
    refresh,
    loadMore,
    hasMore,
    page,

    filters: { status, search },
    setStatus,
    setSearch,

    counts,
  };
}
