import Link from "next/link";
import { Suspense } from "react";
import {
  UserPlus, CalendarClock, AlertTriangle, CreditCard, HeartHandshake,
  PackageSearch, Car, BookmarkCheck, FileWarning, CheckCircle2,
} from "lucide-react";
import { getDashboardData } from "@/lib/data/dashboard";
import { getSessionContext } from "@/lib/auth/session";
import { StatCard } from "@/components/stat-card";
import { CentroAccionComercial } from "@/components/dashboard/centro-accion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, toneForEstado } from "@/components/ui/badge";
import { formatDate, humanize } from "@/lib/format";
import { rel } from "@/lib/rel";

function CentroAccionSkeleton() {
  return (
    <div className="divide-y rounded-lg border bg-card">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex animate-pulse items-center gap-3 px-4 py-3">
          <div className="h-4 w-4 rounded bg-gray-200" />
          <div className="h-4 flex-1 max-w-xs rounded bg-gray-200" />
        </div>
      ))}
    </div>
  );
}

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [data, ctx] = await Promise.all([getDashboardData(), getSessionContext()]);
  const s = data.stats;
  const nombre = ctx?.profile?.nombre || "";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Hola{nombre ? `, ${nombre}` : ""} 👋
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Resumen del día · {formatDate(new Date())}
        </p>
      </div>

      {/* Centro de acción comercial: a quién contactar hoy */}
      <div className="mb-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Centro de acción comercial · a quién contactar hoy
        </h2>
        <Suspense fallback={<CentroAccionSkeleton />}>
          <CentroAccionComercial />
        </Suspense>
      </div>

      {/* Stock */}
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Stock</h2>
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Disponibles" value={s.autosDisponibles} tone="ok" icon={Car} href="/stock?estado=disponible" />
        <StatCard label="Reservados" value={s.autosReservados} tone="warn" icon={BookmarkCheck} href="/stock?estado=reservado" />
        <StatCard label="Vendidos" value={s.autosVendidos} icon={CheckCircle2} href="/stock?estado=vendido" />
        <StatCard label="Sin publicar" value={s.autosSinPublicar} tone="warn" icon={FileWarning} href="/stock" />
      </div>

      {/* Comercial */}
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Comercial</h2>
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Leads nuevos" value={s.leadsNuevos} tone="ok" icon={UserPlus} href="/clientes?estado=nuevo" />
        <StatCard label="Seguimientos hoy" value={s.seguimientosHoy} tone="warn" icon={CalendarClock} href="/seguimientos" />
        <StatCard label="Seguim. vencidos" value={s.seguimientosVencidos} tone="danger" icon={AlertTriangle} href="/seguimientos" />
        <StatCard label="Encargos activos" value={s.encargosActivos} icon={PackageSearch} href="/encargos" />
      </div>

      {/* Alertas / Postventa */}
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Alertas</h2>
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="VTV por vencer" value={s.vtvPorVencer} tone="warn" icon={AlertTriangle} href="/vtv" />
        <StatCard label="VTV vencidas" value={s.vtvVencidas} tone="danger" icon={AlertTriangle} href="/vtv" />
        <StatCard label="Créditos por terminar" value={s.creditosPorTerminar} tone="warn" icon={CreditCard} href="/creditos" />
        <StatCard label="Postventa pendiente" value={s.postventaPendiente} tone="warn" icon={HeartHandshake} href="/postventa" />
      </div>

      {/* VTV: alerta documental del vehículo, no es contacto comercial con un cliente,
          por eso queda aparte del Centro de acción comercial. */}
      <Card>
        <CardHeader><CardTitle className="text-base">VTV a controlar</CardTitle></CardHeader>
        <CardContent>
          {data.vtvAlertas.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay VTV próximas a vencer.</p>
          ) : (
            <ul className="space-y-2">
              {data.vtvAlertas.map((v) => {
                const veh = rel(v.vehiculo);
                return (
                  <li key={v.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">
                      <span className="font-medium">{veh?.marca} {veh?.modelo}</span>
                      {" · "}{v.patente} · vence {formatDate(v.fecha_vencimiento)}
                    </span>
                    <Badge tone={toneForEstado(v.estado)}>{humanize(v.estado)}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        ¿Falta un módulo? Mirá la{" "}
        <Link href="/stock" className="underline">sección de stock</Link> o el roadmap en{" "}
        <code className="rounded bg-muted px-1">/docs/ROADMAP.md</code>.
      </p>
    </div>
  );
}
