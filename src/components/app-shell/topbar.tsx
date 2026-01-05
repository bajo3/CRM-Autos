"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";

import { useAuth } from "@/features/auth/AuthProvider";
import { fetchTopbarAlerts, type TopbarAlerts } from "@/components/app-shell/topbar-alerts";

function roleLabel(role: string | null) {
  if (role === "admin") return "Admin";
  if (role === "manager") return "Manager";
  if (role === "seller") return "Seller";
  return "—";
}

function LinkChip({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex h-9 items-center justify-center rounded-2xl border border-slate-200 px-3 text-sm font-medium text-slate-900 hover:bg-slate-50"
    >
      {label}
    </Link>
  );
}

export function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  const { fullName, role, loading, userId } = useAuth();

  const [alerts, setAlerts] = useState<TopbarAlerts | null>(null);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [openAlerts, setOpenAlerts] = useState(false);

  useEffect(() => {
    let alive = true;

    async function run() {
      if (loading) return;
      setAlertsLoading(true);
      try {
        const a = await fetchTopbarAlerts({ role, userId });
        if (!alive) return;
        setAlerts(a);
      } finally {
        if (!alive) return;
        setAlertsLoading(false);
      }
    }

    void run();

    // refresco suave cada 60s
    const t = window.setInterval(() => {
      void run();
    }, 60_000);

    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, [loading, role, userId]);

  const total = useMemo(() => {
    if (!alerts) return 0;
    return (
      (alerts.pendingVehicles ?? 0) +
      (alerts.staleLeads ?? 0) +
      (alerts.reservedStale ?? 0) +
      (alerts.creditsEndingSoon2m ?? 0)
    );
  }, [alerts]);

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
          {subtitle ? <p className="text-sm text-slate-600">{subtitle}</p> : null}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" className="gap-2 relative" onClick={() => setOpenAlerts(true)}>
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notificaciones</span>
            {total > 0 ? (
              <span className="absolute -top-1 -right-1 grid h-5 min-w-[20px] place-items-center rounded-full bg-rose-600 px-1 text-[11px] font-bold text-white">
                {total > 99 ? "99+" : total}
              </span>
            ) : null}
          </Button>

          <Badge variant="secondary">{loading ? "…" : `${fullName ?? "Usuario"} • ${roleLabel(role)}`}</Badge>
        </div>
      </div>

      <Modal open={openAlerts} onClose={() => setOpenAlerts(false)} title="Notificaciones">
        <div className="space-y-3">
          <div className="text-sm text-slate-600">{alertsLoading ? "Actualizando…" : "Resumen de pendientes y vencimientos."}</div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium text-slate-900">Vehículos pendientes</div>
                <div className="text-xs text-slate-500">Pendiente / Ingreso / Preparación.</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{alerts?.pendingVehicles ?? 0}</Badge>
                <LinkChip href="/vehicles" label="Ver" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium text-slate-900">Leads sin tocar</div>
                <div className="text-xs text-slate-500">Leads activos sin contacto en los últimos días.</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{alerts?.staleLeads ?? 0}</Badge>
                <LinkChip href="/leads" label="Ver" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium text-slate-900">Reservados estancados</div>
                <div className="text-xs text-slate-500">Autos reservados hace varios días sin cerrar.</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{alerts?.reservedStale ?? 0}</Badge>
                <LinkChip href="/vehicles" label="Ver" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium text-slate-900">Créditos por finalizar (2 meses)</div>
                <div className="text-xs text-slate-500">Créditos activos que están a 2 meses o menos de terminar.</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{alerts?.creditsEndingSoon2m ?? 0}</Badge>
                <LinkChip href="/credits" label="Ver" />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={() => setOpenAlerts(false)}>
              Cerrar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
