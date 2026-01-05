"use client";

import { useEffect, useMemo, useState } from "react";
import { Topbar } from "@/components/app-shell/topbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SalesChart } from "@/components/charts/sales-chart";
import { Car, Users, Banknote, ListChecks } from "lucide-react";
import { fetchDashboardStats, fetchSellerActivity } from "@/features/dashboard/dashboard.api";
import type { DashboardStats, SellerActivityRow } from "@/features/dashboard/dashboard.api";
import { toErrorMessage } from "@/lib/errors";

function stageLabel(stage: string) {
  if (stage === "new") return "Nuevo";
  if (stage === "contacted") return "Contactado";
  if (stage === "interested") return "Interesado";
  if (stage === "negotiation") return "Negociación";
  if (stage === "won") return "Ganado";
  if (stage === "lost") return "Perdido";
  return stage;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<SellerActivityRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [s, a] = await Promise.all([fetchDashboardStats(), fetchSellerActivity()]);
      setStats(s);
      setActivity(a);
    } catch (e) {
      setError(toErrorMessage(e, "No pude cargar el dashboard"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const leadsStages = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.leadsByStage).map(([k, v]) => ({ stage: k, value: v as number }));
  }, [stats]);

  return (
    <div className="space-y-6">
      <Topbar title="Dashboard" subtitle="Resumen del negocio (datos reales)" />

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" /> Vehículos
            </CardTitle>
            <CardDescription>Stock y estado</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{loading ? "…" : stats?.vehiclesTotal ?? 0}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="secondary">Publicados: {loading ? "…" : stats?.vehiclesPublished ?? 0}</Badge>
              <Badge variant="outline">Reservados: {loading ? "…" : stats?.vehiclesReserved ?? 0}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" /> Leads
            </CardTitle>
            <CardDescription>En gestión</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{loading ? "…" : stats?.leadsActive ?? 0}</div>
            <div className="mt-2 text-sm text-slate-600">
              Nuevos últimos 7 días: <span className="font-medium">{loading ? "…" : stats?.leadsCreated7d ?? 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5" /> Créditos
            </CardTitle>
            <CardDescription>Seguimiento de cuotas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{loading ? "…" : stats?.creditsActive ?? 0}</div>
            <div className="mt-2 text-sm text-slate-600">
              Por finalizar (≤2 meses): <span className="font-medium">{loading ? "…" : stats?.creditsEndingSoon2m ?? 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="h-5 w-5" /> Tareas
            </CardTitle>
            <CardDescription>Equipo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{loading ? "…" : stats?.tasksOpen ?? 0}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="outline">Vencidas: {loading ? "…" : stats?.tasksOverdue ?? 0}</Badge>
              <Badge variant="secondary">Hechas (7d): {loading ? "…" : stats?.tasksDone7d ?? 0}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Actividad por usuario</CardTitle>
          <CardDescription>Para ordenar el día (sin “espionar”)</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-slate-600">Cargando…</div>
          ) : !activity || activity.length === 0 ? (
            <div className="text-sm text-slate-600">Sin datos.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[720px] w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="py-2">Usuario</th>
                    <th className="py-2">Rol</th>
                    <th className="py-2">Leads tocados hoy</th>
                    <th className="py-2">Seguimientos vencidos</th>
                    <th className="py-2">Movimientos de vehículos (7d)</th>
                  </tr>
                </thead>
                <tbody>
                  {activity.map((a) => (
                    <tr key={a.user_id} className="border-t border-slate-100">
                      <td className="py-2 font-medium text-slate-900">{a.full_name ?? a.user_id.slice(0, 8)}</td>
                      <td className="py-2 text-slate-700">{a.role ?? "—"}</td>
                      <td className="py-2">
                        <Badge variant={a.leadsTouchedToday > 0 ? "success" : "muted"}>{a.leadsTouchedToday}</Badge>
                      </td>
                      <td className="py-2">
                        <Badge variant={a.followupsOverdue > 0 ? "warning" : "muted"}>{a.followupsOverdue}</Badge>
                      </td>
                      <td className="py-2">
                        <Badge variant={a.vehiclesMoved7d > 0 ? "secondary" : "muted"}>{a.vehiclesMoved7d}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Ventas estimadas</CardTitle>
            <CardDescription>Leads ganados por mes (últimos 6 meses)</CardDescription>
          </CardHeader>
          <CardContent>
            <SalesChart data={stats?.wonPerMonth ?? []} valueLabel="Ganados" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Leads por etapa</CardTitle>
            <CardDescription>Distribución actual</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <div className="text-sm text-slate-600">Cargando…</div>
            ) : (
              leadsStages.map((s) => (
                <div key={s.stage} className="flex items-center justify-between rounded-2xl border border-slate-200 px-3 py-2">
                  <span className="text-sm text-slate-700">{stageLabel(s.stage)}</span>
                  <span className="text-sm font-semibold text-slate-900">{s.value}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <button
          className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          onClick={load}
        >
          Actualizar
        </button>
      </div>
    </div>
  );
}
