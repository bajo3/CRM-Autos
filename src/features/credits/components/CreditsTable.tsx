"use client";

import { useMemo, useState } from "react";
import type { CreditRow } from "../credits.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { MessageCircle, Phone, Pencil, XCircle } from "lucide-react";

import {
  buildWhatsAppMessage,
  computeCreditSchedule,
  fmtDate,
  moneyArs,
  normalizeArPhoneToWhatsApp,
} from "../credits.utils";

function vehicleLabel(c: CreditRow) {
  const parts: string[] = [];
  if (c.vehicle_model) parts.push(c.vehicle_model);
  if (c.vehicle_version) parts.push(c.vehicle_version);
  if (c.vehicle_year) parts.push(String(c.vehicle_year));
  return parts.join(" ");
}

function remainingPill(remaining: number | null) {
  if (remaining == null) return null;

  if (remaining === 0) {
    return (
      <span className="inline-flex w-fit items-center rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] text-rose-700">
        Vencido
      </span>
    );
  }

  const cls =
    remaining <= 1
      ? "bg-rose-50 text-rose-700 border-rose-200"
      : remaining <= 3
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-slate-50 text-slate-700 border-slate-200";

  return (
    <span className={cn("inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-[11px]", cls)}>
      Faltan {remaining} cuota{remaining === 1 ? "" : "s"}
    </span>
  );
}

function urgencyBadge(c: CreditRow) {
  const sched = computeCreditSchedule(c.start_date, c.installment_count, c.status);
  if (c.status === "closed") return <Badge variant="outline">Cerrado</Badge>;
  if (!sched) return <Badge variant="muted">—</Badge>;
  if (sched.daysToEnd < 0 || sched.remaining === 0) return <Badge variant="danger">🔴 Vencido</Badge>;
  if (sched.daysToEnd <= 30) return <Badge variant="danger">🔴 ≤ 1 mes</Badge>;
  if (sched.daysToEnd <= 90) return <Badge variant="warning">🟡 ≤ 3 meses</Badge>;
  return <Badge variant="success">🟢 OK</Badge>;
}

function whatsAppHref(c: CreditRow) {
  const wa = normalizeArPhoneToWhatsApp(c.client_phone);
  if (!wa) return null;

  const sched = computeCreditSchedule(c.start_date, c.installment_count, c.status);
  const vehicle = vehicleLabel(c);

  const msg = buildWhatsAppMessage({
    clientName: c.client_name,
    vehicleLabel: vehicle,
    installmentAmountArs: moneyArs(c.installment_amount),
    nextDueText: sched ? fmtDate(sched.nextDue) : "—",
    remainingText: sched
      ? sched.remaining === 0
        ? "Plan vencido"
        : `Te quedan ${sched.remaining} cuota${sched.remaining === 1 ? "" : "s"}`
      : "—",
    endText: sched ? fmtDate(sched.lastDue) : "—",
  });

  return `https://wa.me/${wa}?text=${encodeURIComponent(msg)}`;
}

function telHref(phone: string | null) {
  if (!phone) return null;
  return `tel:${String(phone).replace(/\s+/g, "")}`;
}

export function CreditsTable(props: {
  items: CreditRow[];
  loading?: boolean;
  onEdit: (row: CreditRow) => void;
  onClose: (id: string) => Promise<void>;
}) {
  const { items, loading, onEdit, onClose } = props;
  const [busyId, setBusyId] = useState<string | null>(null);

  const rows = useMemo(() => items, [items]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">Cargando créditos…</div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="text-sm font-medium text-slate-900">No hay créditos para mostrar</div>
        <div className="mt-1 text-sm text-slate-600">
          Creá un crédito cuando el cliente entra en plan, para que el equipo tenga alertas de vencimiento y seguimiento.
        </div>
      </div>
    );
  }

  return (
    <>
      {/* TABLE (MD+) */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <THead>
            <TR>
              <TH>Cliente</TH>
              <TH>Vehículo</TH>
              <TH>Cuota</TH>
              <TH>Próximo venc.</TH>
              <TH>Fin</TH>
              <TH>Prioridad</TH>
              <TH className="text-right">Acciones</TH>
            </TR>
          </THead>

          <TBody>
            {rows.map((c) => {
              const sched = computeCreditSchedule(c.start_date, c.installment_count, c.status);
              const wa = whatsAppHref(c);
              const tel = telHref(c.client_phone);

              const nextDueLabel = sched ? fmtDate(sched.nextDue) : "—";
              const endLabel = sched ? fmtDate(sched.lastDue) : "—";

              return (
                <TR key={c.id}>
                  <TD>
                    <div className="font-medium text-slate-900">{c.client_name}</div>
                    <div className="text-xs text-slate-500">{c.client_phone ?? "—"}</div>
                  </TD>

                  <TD>
                    <div className="text-sm text-slate-900">{c.vehicle_model ?? "—"}</div>
                    <div className="text-xs text-slate-500">
                      {c.vehicle_version ?? ""}
                      {c.vehicle_year ? ` · ${c.vehicle_year}` : ""}
                      {c.vehicle_kms ? ` · ${c.vehicle_kms.toLocaleString("es-AR")} km` : ""}
                    </div>
                  </TD>

                  <TD>
                    <div className="text-sm text-slate-900">{moneyArs(c.installment_amount)}</div>
                    <div className="text-xs text-slate-500">{c.installment_count} cuotas</div>
                  </TD>

                  <TD>
                    <div className="text-sm text-slate-900">{nextDueLabel}</div>
                    <div className="mt-1">{remainingPill(sched?.remaining ?? null)}</div>
                  </TD>

                  <TD>
                    <div className="text-sm text-slate-900">{endLabel}</div>
                    {sched ? (
                      <div className="text-xs text-slate-500">
                        {sched.daysToEnd >= 0
                          ? `En ${sched.daysToEnd} día${sched.daysToEnd === 1 ? "" : "s"}`
                          : `Hace ${Math.abs(sched.daysToEnd)} día${Math.abs(sched.daysToEnd) === 1 ? "" : "s"}`}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500">—</div>
                    )}
                  </TD>

                  <TD>{urgencyBadge(c)}</TD>

                  <TD className="text-right">
                    <div className="flex justify-end gap-2">
                      <a
                        href={tel ?? "#"}
                        className={cn(
                          "inline-flex h-9 items-center justify-center whitespace-nowrap rounded-2xl border px-3 text-sm font-medium transition",
                          tel
                            ? "border-slate-200 text-slate-900 hover:bg-slate-50"
                            : "pointer-events-none border-slate-100 text-slate-300"
                        )}
                        onClick={(e) => {
                          if (!tel) e.preventDefault();
                        }}
                        title={tel ? "Llamar" : "Sin teléfono"}
                      >
                        <Phone className="mr-2 h-4 w-4" />
                        Llamar
                      </a>

                      <a
                        href={wa ?? "#"}
                        target={wa ? "_blank" : undefined}
                        rel={wa ? "noopener noreferrer" : undefined}
                        className={cn(
                          "inline-flex h-9 items-center justify-center whitespace-nowrap rounded-2xl border px-3 text-sm font-medium transition",
                          wa
                            ? "border-slate-200 text-slate-900 hover:bg-slate-50"
                            : "pointer-events-none border-slate-100 text-slate-300"
                        )}
                        title={wa ? "Enviar WhatsApp" : "Sin teléfono"}
                      >
                        <MessageCircle className="mr-2 h-4 w-4" />
                        WhatsApp
                      </a>

                      <Button variant="outline" size="sm" onClick={() => onEdit(c)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </Button>

                      {c.status === "active" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === c.id}
                          onClick={async () => {
                            try {
                              setBusyId(c.id);
                              await onClose(c.id);
                            } finally {
                              setBusyId(null);
                            }
                          }}
                        >
                          {busyId === c.id ? "Cerrando…" : "Cerrar"}
                        </Button>
                      ) : null}
                    </div>
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      </div>

      {/* MOBILE CARDS */}
      <div className="grid gap-2 md:hidden">
        {rows.map((c) => {
          const sched = computeCreditSchedule(c.start_date, c.installment_count, c.status);
          const wa = whatsAppHref(c);
          const tel = telHref(c.client_phone);

          const nextDueLabel = sched ? fmtDate(sched.nextDue) : "—";
          const endLabel = sched ? fmtDate(sched.lastDue) : "—";

          return (
            <div key={c.id} className="rounded-2xl border border-slate-200 bg-white p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-900">{c.client_name}</div>
                  <div className="mt-0.5 text-xs text-slate-600">{c.client_phone ?? "—"}</div>
                </div>
                {urgencyBadge(c)}
              </div>

              <div className="mt-2 space-y-1 text-xs text-slate-700">
                <div>
                  <span className="text-slate-500">Vehículo:</span> {vehicleLabel(c) || "—"}
                </div>
                <div>
                  <span className="text-slate-500">Cuota:</span> {moneyArs(c.installment_amount)} · {c.installment_count} cuotas
                </div>
                <div>
                  <span className="text-slate-500">Próximo venc.:</span> {nextDueLabel}
                </div>
                <div className="flex items-center gap-2">
                  {remainingPill(sched?.remaining ?? null)}
                  <span className="text-slate-500">Fin:</span> {endLabel}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button asChild size="sm" variant="outline" disabled={!tel}>
                  <a href={tel ?? "#"} onClick={(e) => (!tel ? e.preventDefault() : null)}>
                    <Phone className="mr-2 h-4 w-4" />
                    Llamar
                  </a>
                </Button>

                <Button asChild size="sm" variant="outline" disabled={!wa}>
                  <a href={wa ?? "#"} target={wa ? "_blank" : undefined} rel={wa ? "noopener noreferrer" : undefined}>
                    <MessageCircle className="mr-2 h-4 w-4" />
                    WhatsApp
                  </a>
                </Button>

                <Button size="sm" variant="secondary" onClick={() => onEdit(c)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </Button>

                {c.status === "active" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="ml-auto"
                    disabled={busyId === c.id}
                    onClick={async () => {
                      try {
                        setBusyId(c.id);
                        await onClose(c.id);
                      } finally {
                        setBusyId(null);
                      }
                    }}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    {busyId === c.id ? "Cerrando…" : "Cerrar"}
                  </Button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
