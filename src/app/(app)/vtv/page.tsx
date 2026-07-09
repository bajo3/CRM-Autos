import Link from "next/link";
import { XCircle, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate, daysUntil } from "@/lib/format";
import { rel, type Rel } from "@/lib/rel";
import { vtvSeveridad, vtvSeveridadLabel, vtvSeveridadTone } from "@/lib/data/vtv";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const MESES = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

type Row = {
  id: string; patente: string | null; ultimo_digito: string | null;
  jurisdiccion: string | null; mes_sugerido: number | null;
  fecha_vencimiento: string | null; estado: string; vehiculo_id: string | null;
  vehiculo: Rel<{ marca: string; modelo: string }>;
};

const FILTROS = ["vencidas", "30", "60", "ok"] as const;
type Filtro = (typeof FILTROS)[number];

function filtroBucket(dias: number | null): Filtro {
  if (dias == null) return "ok";
  if (dias < 0) return "vencidas";
  if (dias <= 30) return "30";
  if (dias <= 60) return "60";
  return "ok";
}

const FILTRO_CONFIG: Record<Filtro, { label: string; icon: typeof XCircle; text: string; bg: string; ring: string }> = {
  vencidas: { label: "Vencidas", icon: XCircle, text: "text-danger", bg: "bg-red-50", ring: "ring-danger" },
  "30": { label: "Vencen en ≤30 días", icon: AlertTriangle, text: "text-warn", bg: "bg-amber-50", ring: "ring-warn" },
  "60": { label: "Vencen en 31–60 días", icon: Clock, text: "text-yellow-600", bg: "bg-yellow-50", ring: "ring-yellow-500" },
  ok: { label: "Al día", icon: CheckCircle2, text: "text-ok", bg: "bg-green-50", ring: "ring-ok" },
};

const SEV_TEXT: Record<ReturnType<typeof vtvSeveridadTone>, string> = {
  danger: "text-danger",
  warn: "text-warn",
  info: "text-blue-700",
  ok: "text-ok",
  neutral: "text-muted-foreground",
};

export default async function VtvPage({ searchParams }: { searchParams: { filtro?: string } }) {
  const sb = createClient();
  const [ctx, { data }] = await Promise.all([
    getSessionContext(),
    sb
      .from("vtv")
      .select("id,patente,ultimo_digito,jurisdiccion,mes_sugerido,fecha_vencimiento,estado,vehiculo_id,vehiculo:vehiculo_id(marca,modelo)")
      .order("fecha_vencimiento", { ascending: true })
      .returns<Row[]>(),
  ]);

  const todas = data ?? [];
  const filtro = FILTROS.includes(searchParams.filtro as Filtro) ? (searchParams.filtro as Filtro) : undefined;

  const counts: Record<Filtro, number> = { vencidas: 0, "30": 0, "60": 0, ok: 0 };
  for (const v of todas) {
    counts[filtroBucket(daysUntil(v.fecha_vencimiento))]++;
  }

  const rows = filtro ? todas.filter((v) => filtroBucket(daysUntil(v.fecha_vencimiento)) === filtro) : todas;

  return (
    <div>
      <PageHeader
        title="VTV por patente"
        description={`Vencimientos según el último dígito de la patente. Jurisdicción configurable por empresa (actual: ${ctx?.empresa?.provincia ?? "Buenos Aires"}). Tocá una tarjeta para filtrar por urgencia.`}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {FILTROS.map((key) => {
          const cfg = FILTRO_CONFIG[key];
          const Icon = cfg.icon;
          const active = filtro === key;
          return (
            <Link
              key={key}
              href={`/vtv?filtro=${key}`}
              className={cn(
                "flex items-center justify-between rounded-xl border border-border/70 bg-card p-4 shadow-elevate transition-shadow hover:shadow-elevate-hover",
                active && `ring-2 ring-offset-1 ${cfg.ring}`,
              )}
            >
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{cfg.label}</p>
                <p className={cn("mt-1 text-2xl font-semibold", cfg.text)}>{counts[key]}</p>
              </div>
              <div className={cn("rounded-lg p-2", cfg.bg, cfg.text)}>
                <Icon className="h-5 w-5" />
              </div>
            </Link>
          );
        })}
      </div>

      {filtro && (
        <div className="mb-4">
          <Link href="/vtv" className="text-sm text-muted-foreground hover:underline">
            ← Quitar filtro
          </Link>
        </div>
      )}

      {todas.length === 0 ? (
        <EmptyState title="No hay VTV registradas" description="Cargá la VTV de cada unidad para recibir alertas 60/30/7 días antes del vencimiento." />
      ) : rows.length === 0 ? (
        <EmptyState title="No hay VTV en este filtro" description="Probá con otra tarjeta o quitá el filtro para ver todas." />
      ) : (
        <div className="rounded-xl border border-border/70 bg-card shadow-elevate">
          <Table>
            <THead><TR><TH>Vehículo</TH><TH>Patente</TH><TH>Últ. dígito</TH><TH>Mes sugerido</TH><TH>Vencimiento</TH><TH>Faltan</TH><TH>Alerta</TH></TR></THead>
            <TBody>
              {rows.map((v) => {
                const veh = rel(v.vehiculo);
                const d = daysUntil(v.fecha_vencimiento);
                const sev = vtvSeveridad(d);
                const nombreVehiculo = `${veh?.marca ?? ""} ${veh?.modelo ?? ""}`.trim() || "—";
                return (
                  <TR key={v.id}>
                    <TD className="font-medium">
                      {v.vehiculo_id ? (
                        <Link href={`/stock/${v.vehiculo_id}`} className="hover:underline">
                          {nombreVehiculo}
                        </Link>
                      ) : (
                        nombreVehiculo
                      )}
                    </TD>
                    <TD className="font-mono text-xs">{v.patente}</TD>
                    <TD>{v.ultimo_digito ?? "—"}</TD>
                    <TD>{v.mes_sugerido ? MESES[v.mes_sugerido] : "—"}</TD>
                    <TD>{formatDate(v.fecha_vencimiento)}</TD>
                    <TD className={cn("font-medium", SEV_TEXT[vtvSeveridadTone(sev)])}>
                      {d == null ? "—" : d < 0 ? `Vencida hace ${-d}d` : `${d} días`}
                    </TD>
                    <TD><Badge tone={vtvSeveridadTone(sev)}>{vtvSeveridadLabel(sev)}</Badge></TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </div>
      )}
    </div>
  );
}
