"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { getDealership, updateDealership } from "./dealership.api";
import type { DealershipRow, DealershipUpdate } from "./dealership.types";
import { toErrorMessage } from "@/lib/errors";

const cache = new Map<string, { at: number; row: DealershipRow }>();
const TTL = 30_000;

export function useDealership() {
  const { dealershipId, role, profileLoading } = useAuth();

  const [row, setRow] = useState<DealershipRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const req = useRef(0);

  const canEdit = role === "admin";

  const load = useCallback(async () => {
    if (!dealershipId) {
      setRow(null);
      setLoading(false);
      return;
    }

    const cached = cache.get(dealershipId);
    if (cached && Date.now() - cached.at < TTL) {
      setRow(cached.row);
      setLoading(false);
      return;
    }

    const myReq = ++req.current;
    setLoading(true);
    setError(null);

    try {
      const data = await getDealership(dealershipId);
      if (myReq !== req.current) return;
      cache.set(dealershipId, { at: Date.now(), row: data });
      setRow(data);
    } catch (e) {
      if (myReq !== req.current) return;
      setError(toErrorMessage(e, "No pude cargar los datos de la agencia"));
    } finally {
      if (myReq === req.current) setLoading(false);
    }
  }, [dealershipId]);

  useEffect(() => {
    if (profileLoading) return;
    load();
  }, [profileLoading, load]);

  const save = useCallback(
    async (patch: DealershipUpdate) => {
      if (!dealershipId) return;
      if (!canEdit) return;

      setSaving(true);
      setError(null);
      try {
        const updated = await updateDealership(dealershipId, patch);
        cache.set(dealershipId, { at: Date.now(), row: updated });
        setRow(updated);
      } catch (e) {
        setError(toErrorMessage(e, "No pude guardar los cambios"));
        // No rethrow: evitamos Unhandled Rejection en el UI; el error ya queda en estado.
        return;
      } finally {
        setSaving(false);
      }
    },
    [canEdit, dealershipId]
  );

  return useMemo(
    () => ({ row, loading, saving, error, reload: load, save, canEdit }),
    [row, loading, saving, error, load, save, canEdit]
  );
}
