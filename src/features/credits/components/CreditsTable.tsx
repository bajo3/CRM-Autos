"use client";

import { useMemo, useState } from "react";
import type { CreditRow } from "../credits.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { MessageCircle } from "lucide-react";
import { Phone } from "lucide-react";

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

function statusPill(remaining: number | null) {
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
      ? "bg-red-50 text-red-700 border-red-200"
      : remaining <= 3
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-slate-50 text-slate-700 border-slate-200";

  return (
    <span className={cn("inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-[11px]", cls)}>
      Faltan {remaining} cuota{remaining === 1 ? "" : "s"}
    </span>
  );
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
    remainingText: sched ? (sched.remaining === 0 ? "Plan vencido" : `Te quedan ${sched.remaining} cuota${sched.remaining === 1 ? "" : "s"}`) : "—",
    endText: sched ? fmtDate(sched.lastDue) : "—",
  });

  return `https://wa.me/${wa}?text=${encodeURIComponent(msg)}`;
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

  return (
    <div className="overflow-x-auto">
      <Table>
        <THead>
          <TR>
            <TH>Cliente</TH>
            <TH>Vehículo</TH>
            <TH>Cuota</TH>
            <TH>Próximo venc.</TH>
            <TH>Fin</TH>
            <TH>Estado</TH>
            <TH className="text-right">Acciones</TH>
          </TR>
        </THead>

        <TBody>
          {loading ? (
            <TR>
              <TD colSpan={7} className="py-10 text-center text-sm text-slate-600">
                Cargando…
              </TD>
            </TR>
          ) : rows.length === 0 ? (
            <TR>
              <TD colSpan={7} className="py-10 text-center text-sm text-slate-600">
                Sin créditos.
              </TD>
            </TR>
          ) : (
            rows.map((c) => {
              const sched = computeCreditSchedule(c.start_date, c.installment_count, c.status);
              const waHref = whatsAppHref(c);

              const nextDueLabel = sched ? fmtDate(sched.nextDue) : "—";
              const endLabel = sched ? fmtDate(sched.lastDue) : "—";
              const telHref = c.client_phone ? `tel:${String(c.client_phone).replace(/\s+/g, "")}` : null;

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
                    <div className="mt-1">{statusPill(sched?.remaining ?? null)}</div>
                  </TD>

                  <TD>
                    <div className="text-sm text-slate-900">{endLabel}</div>
                    {sched ? (
                      <div className="text-xs text-slate-500">
                        {sched.daysToEnd >= 0 ? `En ${sched.daysToEnd} día${sched.daysToEnd === 1 ? "" : "s"}` : `Hace ${Math.abs(sched.daysToEnd)} día${Math.abs(sched.daysToEnd) === 1 ? "" : "s"}`}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500">—</div>
                    )}
                  </TD>

                  <TD>
                    {c.status === "closed" ? (
                      <Badge variant="outline">⚪ Cerrado</Badge>
                    ) : !sched ? (
                      <Badge variant="muted">—</Badge>
                    ) : sched.daysToEnd < 0 || sched.remaining === 0 ? (
                      <Badge variant="danger">🔴 Vencido</Badge>
                    ) : sched.daysToEnd <= 30 ? (
                      <Badge variant="danger">🔴 ≤ 1 mes</Badge>
                    ) : sched.daysToEnd <= 90 ? (
                      <Badge variant="warning">🟡 ≤ 3 meses</Badge>
                    ) : (
                      <Badge variant="success">🟢 OK</Badge>
                    )}
                  </TD>

                  <TD className="text-right">
                    <div className="flex justify-end gap-2">
                      <a
                        href={telHref ?? "#"}
                        className={cn(
                          "inline-flex h-9 items-center justify-center whitespace-nowrap rounded-2xl border px-3 text-sm font-medium transition",
                          telHref
                            ? "border-slate-200 text-slate-900 hover:bg-slate-50"
                            : "pointer-events-none border-slate-100 text-slate-300"
                        )}
                        onClick={(e) => {
                          if (!telHref) e.preventDefault();
                        }}
                        title={telHref ? "Llamar" : "Sin teléfono"}
                      >
                        <Phone className="mr-2 h-4 w-4" />
                        Llamar
                      </a>

                      <a
                        href={waHref ?? "#"}
                        target={waHref ? "_blank" : undefined}
                        rel={waHref ? "noopener noreferrer" : undefined}
                        className={cn(
                          "inline-flex h-9 items-center justify-center whitespace-nowrap rounded-2xl border px-3 text-sm font-medium transition",
                          waHref
                            ? "border-slate-200 text-slate-900 hover:bg-slate-50"
                            : "pointer-events-none border-slate-100 text-slate-300"
                        )}
                        title={waHref ? "Enviar WhatsApp" : "Sin teléfono"}
                      >
                        <MessageCircle className="mr-2 h-4 w-4" />
                        WhatsApp
                      </a>

                      <Button variant="outline" size="sm" onClick={() => onEdit(c)}>
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
            })
          )}
        </TBody>
      </Table>
    </div>
  );
}
