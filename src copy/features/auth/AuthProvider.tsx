"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseBrowser";
import { toErrorMessage } from "@/lib/errors";

type Role = "admin" | "manager" | "seller" | null;

type AuthState = {
  // ✅ Solo bootstrap inicial (evita que el menú “flickee” en token refresh / focus)
  loading: boolean;
  // ✅ Carga/refresco del profile (puede ser background)
  profileLoading: boolean;
  session: Session | null;
  userId: string | null;
  role: Role;
  dealershipId: string | null;
  fullName: string | null;
};

type Profile = { role: Role; dealershipId: string | null; fullName: string | null };

const Ctx = createContext<AuthState>({
  loading: true,
  profileLoading: false,
  session: null,
  userId: null,
  role: null,
  dealershipId: null,
  fullName: null,
});

const LS_KEY = (uid: string) => `crm_profile_${uid}`;

function readCachedProfile(uid: string): Profile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LS_KEY(uid));
    if (!raw) return null;
    const parsed: any = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return {
      role: (parsed.role ?? null) as Role,
      dealershipId: (parsed.dealershipId ?? null) as string | null,
      fullName: (parsed.fullName ?? null) as string | null,
    };
  } catch {
    return null;
  }
}

function writeCachedProfile(uid: string, prof: Profile) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_KEY(uid), JSON.stringify(prof));
  } catch {
    // ignore
  }
}

function clearCachedProfile(uid: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LS_KEY(uid));
  } catch {
    // ignore
  }
}

async function fetchProfile(uid: string): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .select("role, dealership_id, full_name")
    .eq("user_id", uid)
    .maybeSingle();

  if (error) throw new Error(toErrorMessage(error, "No pude cargar tu perfil"));

  return {
    role: (data?.role ?? null) as Role,
    dealershipId: (data?.dealership_id ?? null) as string | null,
    fullName: (data?.full_name ?? null) as string | null,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [bootLoading, setBootLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [dealershipId, setDealershipId] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);

  const loadedForUid = useRef<string | null>(null);

  // ✅ Type-safe: o hay request en vuelo, o no hay nada
  const inFlight = useRef<{ uid: string; promise: Promise<Profile> } | null>(null);

  // ✅ “latest wins” para evitar races (token refresh/focus)
  const reqId = useRef(0);

  useEffect(() => {
    let alive = true;

    async function loadProfile(uid: string, opts?: { background?: boolean }) {
      const myReq = ++reqId.current;

      // background = no bloquear UI
      if (!opts?.background) setProfileLoading(true);
      else setProfileLoading((v) => v || true);

      try {
        // dedupe real + type-safe
        let entry = inFlight.current;
        if (!entry || entry.uid !== uid) {
          entry = { uid, promise: fetchProfile(uid) };
          inFlight.current = entry;
        }

        const prof = await entry.promise; // prof: Profile (nunca null)

        if (!alive || myReq !== reqId.current) return;

        loadedForUid.current = uid;
        setRole(prof.role);
        setDealershipId(prof.dealershipId);
        setFullName(prof.fullName);
        writeCachedProfile(uid, prof);
      } catch {
        if (!alive || myReq !== reqId.current) return;
        // Si falla, mantenemos lo que haya (cache o estado previo)
      } finally {
        // limpiar inFlight solo si este request sigue siendo el último
        if (myReq === reqId.current) inFlight.current = null;

        if (!alive || myReq !== reqId.current) return;
        setProfileLoading(false);
      }
    }

    async function hydrate(sess: Session | null) {
      if (!alive) return;

      setSession(sess);
      const uid = sess?.user?.id ?? null;

      if (!uid) {
        const prev = loadedForUid.current;
        if (prev) clearCachedProfile(prev);

        loadedForUid.current = null;
        inFlight.current = null;

        setRole(null);
        setDealershipId(null);
        setFullName(null);
        setProfileLoading(false);
        setBootLoading(false);
        return;
      }

      // 1) Cache instantáneo (no bloquea la UI)
      const cached = readCachedProfile(uid);
      if (cached) {
        loadedForUid.current = uid;
        setRole(cached.role);
        setDealershipId(cached.dealershipId);
        setFullName(cached.fullName);
      }

      // bootstrap listo: no bloqueamos más el shell
      setBootLoading(false);

      // 2) Refresco silencioso (por si cambió rol/dealership)
      //    No bloquea el menú.
      void loadProfile(uid, { background: true });

      // Nota: no hacemos “early return” porque el refresh ya es background.
    }

    supabase.auth.getSession().then(({ data }) => hydrate(data.session ?? null));

    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      if (event === "SIGNED_OUT") {
        const prev = loadedForUid.current;
        if (prev) clearCachedProfile(prev);
      }
      hydrate(sess ?? null);
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthState>(() => {
    const userId = session?.user?.id ?? null;
    return {
      loading: bootLoading,
      profileLoading,
      session,
      userId,
      role,
      dealershipId,
      fullName,
    };
  }, [bootLoading, profileLoading, session, role, dealershipId, fullName]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  return useContext(Ctx);
}
