"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { Route } from "next";
import { CheckCircle2, MessageCircle, Pencil, Phone } from "lucide-react";

import type { LeadRow, LeadStage } from "../leads.types";
import { LeadStageBadge } from "./LeadStageBadge";
import { cn } from "@/lib/utils";
import { ui } from "@/lib/ui";

const stageOptions: { value: LeadStage; label: string }[] = [
  { value: "new", label: "Nuevo" },
  { value: "contacted", label: "Contactado" },
  { value: "interested", label: "Interesado" },
  { value: "negotiation", label: "Negociación" },
  { value: "won", label: "Ganado" },
  { value: "lost", label: "Perdido" },
];

function fmt(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

function startOfLocalDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function diffDaysLocal(a: Date, b: Date) {
  // a - b en días, normalizado a inicio de día local
  const aa = startOfLocalDay(a).getTime();
  const bb = startOfLocalDay(b).getTime();
  return Math.round((aa - bb) / 86400000);
}



function followUpPill(iso: string | null): { label: string; className: string } {
  if (!iso) {
    return {
      label: "Sin seguimiento",
      className: "border-slate-200 bg-slate-50 text-slate-700",
    };
  }

  const d = new Date(iso);
  const days = diffDaysLocal(d, new Date());

  if (days < 0) {
    return {
      label: "Vencido",
      className: "border-rose-200 bg-rose-50 text-rose-700",
    };
  }
  if (days === 0) {
    return {
      label: "Hoy",
      className: "border-amber-200 bg-amber-50 text-amber-800",
    };
  }
  if (days === 1) {
    return {
      label: "Mañana",
      className: "border-blue-200 bg-blue-50 text-blue-700",
    };
  }
  return {
    label: `En ${days} días`,
    className: "border-slate-200 bg-white text-slate-700",
  };
}

function rowAccent(stage: LeadStage, nextFollowUpIso: string | null) {
  const pill = followUpPill(nextFollowUpIso);
  // Si está vencido, siempre rojo (prioridad operativa)
  if (pill.label === "Vencido") return "border-l-rose-300";
  if (stage === "won") return "border-l-emerald-300";
  if (stage === "lost") return "border-l-slate-200";
  if (stage === "negotiation") return "border-l-fuchsia-200";
  if (stage === "interested") return "border-l-sky-200";
  if (stage === "contacted") return "border-l-amber-200";
  return "border-l-slate-100";
}

function digitsOnly(v: string) {
  return (v ?? "").replace(/\D/g, "");
}

/**
 * Heurística AR para wa.me (sin "+")
 * - Acepta: +54 9..., 54..., 0xxx 15xxxx..., 15..., o directo "2494..."
 * - Siempre devuelve algo del estilo: 549XXXXXXXXXX
 */
function toWhatsAppNumberAR(raw: string | null): string | null {
  if (!raw) return null;
  let d = digitsOnly(raw);
  if (!d) return null;

  // 00 prefijo internacional
  if (d.startsWith("00")) d = d.slice(2);

  // ya viene bien
  if (d.startsWith("549")) return d;

  // +54 (sin el +)
  if (d.startsWith("54")) {
    const rest = d.slice(2);
    if (!rest) return null;
    // Si ya trae el 9 (móvil), dejalo.
    if (rest.startsWith("9")) return `54${rest}`;
    // Si no trae 9, agregalo.
    return `549${rest}`;
  }

  // 0 + área + 15 + número (formato nacional)
  if (d.startsWith("0")) {
    let rest = d.slice(1);
    // En AR el "15" suele ir después del código de área (2-4 dígitos)
    const idx = rest.indexOf("15");
    if (idx >= 2 && idx <= 4) rest = rest.slice(0, idx) + rest.slice(idx + 2);
    return `549${rest}`;
  }

  // Algunos lo pasan como 15xxxxxxxx
  if (d.startsWith("15")) {
    return `549${d.slice(2)}`;
  }

  // Si ya es área+número (ej: 2494621182) o similar
  if (d.length >= 8) return `549${d}`;

  return null;
}

function whatsappUrl(phone: string | null) {
  const num = toWhatsAppNumberAR(phone);
  if (!num) return null;
  return `https://wa.me/${num}`;
}


function daysDiffFromToday(iso: string | null) {
  if (!iso) return null;
  // 0 = hoy, 1 = mañana, -1 = ayer (en días locales)
  return diffDaysLocal(new Date(iso), new Date());
}



function telUrl(raw: string | null) {
  if (!raw) return null;
  const d = digitsOnly(raw);
  if (!d) return null;
  // Si ya viene con prefijo internacional, agregamos +
  if (d.startsWith("54")) return `tel:+${d}`;
  // Formato local: lo dejamos tal cual (en móvil suele funcionar)
  return `tel:${d}`;
}

export function LeadsTable(props: {
  items: LeadRow[];
  loading: boolean;

  // permisos
  isAdmin: boolean;

  // asignación
  assignees: { user_id: string; full_name: string | null }[];
  onAssign: (id: string, userIdOrNull: string | null) => void;

  // edición
  onEdit: (lead: LeadRow) => void;

  onChangeStage: (id: string, stage: LeadStage) => void;
  onMarkContacted: (id: string) => void;
  onSetFollowUp: (id: string, isoOrNull: string | null) => void;
}) {
  const { items, loading, isAdmin, assignees, onAssign, onEdit, onChangeStage, onMarkContacted, onSetFollowUp } = props;

  function assigneeLabel(userId: string | null) {
    if (!userId) return "Sin asignar";
    const a = assignees.find((x) => x.user_id === userId);
    return a?.full_name ?? userId.slice(0, 8);
  }

  function pad2(n: number) {
    return String(n).padStart(2, "0");
  }

  function isoToLocalInput(iso: string | null) {
    if (!iso) return "";
    const d = new Date(iso);
    // datetime-local espera formato local (sin TZ)
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(
      d.getMinutes()
    )}`;
  }

  function localInputToIso(v: string) {
    // v = "YYYY-MM-DDTHH:mm" (local)
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }

  function tomorrowAt10Iso() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    return d.toISOString();
  }

  const waById = useMemo(() => {
    const m = new Map<string, string | null>();
    for (const it of items) m.set(it.id, whatsappUrl(it.phone));
    return m;
  }, [items]);

  if (loading) {
    return <div className={ui.card("p-4 text-sm text-slate-700")}>Cargando…</div>;
  }

  if (items.length === 0) {
    return <div className={ui.card("p-4 text-sm text-slate-700")}>No hay leads con esos filtros.</div>;
  }

  return (
    <>
      {/* TABLE (LG+) — sin scroll horizontal: se achica por diseño */}
      <div className={cn("hidden lg:block", ui.card("overflow-hidden"))}>
        <table className="w-full table-fixed text-sm">
          <thead className={ui.cardHeader("text-slate-600")}>
            <tr>
              <th className="px-4 py-3 text-left font-medium">Lead</th>
              <th className="w-[180px] px-4 py-3 text-left font-medium">Etapa</th>
              <th className="w-[180px] px-4 py-3 text-left font-medium">Asignado</th>
              <th className="w-[300px] px-4 py-3 text-left font-medium">Seguimiento</th>
              <th className="w-[180px] px-4 py-3 text-right font-medium">Acciones</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {items.map((it) => {
              const wa = waById.get(it.id) ?? null;
              const tel = telUrl(it.phone);
              const pill = followUpPill(it.next_follow_up_at);
              const accent = rowAccent(it.stage, it.next_follow_up_at);
              const isOverdue = daysDiffFromToday(it.next_follow_up_at);

              return (
                <tr
                  key={it.id}
                  className={cn(
                    "border-l-4 hover:bg-slate-50/60",
                    accent,
                    isOverdue !== null && isOverdue < 0 ? "bg-red-50/20" : ""
                  )}
                >
                  <td className="px-4 py-3 align-top">
                    <div className="min-w-0">
                      <Link
                        href={(`/leads/${it.id}` as unknown) as Route}
                        className="block min-w-0 truncate text-left font-medium text-slate-900 hover:underline"
                        aria-label={`Abrir lead ${it.name}`}
                      >
                        {it.name}
                      </Link>

                      <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-2 text-xs text-slate-600">
                        <span className="truncate">{it.phone ?? "—"}</span>
                        {it.interest && <span className="hidden xl:inline">•</span>}
                        {it.interest && (
                          <span className="hidden xl:block min-w-0 truncate" title={it.interest}>
                            {it.interest}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3 align-top">
                    <div className="flex flex-col gap-2">
                      <LeadStageBadge stage={it.stage} />
                      <select
                        className="h-8 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-900"
                        value={it.stage}
                        onChange={(e) => onChangeStage(it.id, e.target.value as LeadStage)}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {stageOptions.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                      {it.stage === "lost" && (
                        <div className="text-xs text-slate-600">Motivo: {it.lost_reason ?? "—"}</div>
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-3 align-top">
                    {isAdmin ? (
                      <select
                        className="h-8 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-900"
                        value={it.assigned_to ?? ""}
                        onChange={(e) => onAssign(it.id, e.target.value || null)}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="">Sin asignar</option>
                        {assignees.map((a) => (
                          <option key={a.user_id} value={a.user_id}>
                            {a.full_name ?? a.user_id.slice(0, 8)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="text-xs text-slate-800">{assigneeLabel(it.assigned_to ?? null)}</div>
                    )}
                  </td>

                  <td className="px-4 py-3 align-top">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs", pill.className)}>
                        {pill.label}
                      </span>
                      <span className="text-xs text-slate-700" title={it.next_follow_up_at ?? ""}>
                        {fmt(it.next_follow_up_at)}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className={ui.button("secondary", "h-8 px-2 text-xs rounded-lg")}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSetFollowUp(it.id, tomorrowAt10Iso());
                        }}
                        title="Mañana 10:00"
                      >
                        Mañana
                      </button>

                      <button
                        type="button"
                        className={ui.button("secondary", "h-8 px-2 text-xs rounded-lg")}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSetFollowUp(it.id, null);
                        }}
                        title="Quitar seguimiento"
                      >
                        Limpiar
                      </button>

                      {/* Selector fino solo en pantallas muy grandes (evita romper 1366x768) */}
                      <div className="hidden 2xl:flex items-center gap-2">
                        <input
                          key={`${it.id}-${it.next_follow_up_at ?? ""}`}
                          type="datetime-local"
                          className="h-8 w-[170px] rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-900"
                          defaultValue={isoToLocalInput(it.next_follow_up_at)}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                          }}
                          onBlur={(e) => {
                            const v = e.currentTarget.value;
                            const iso = v ? localInputToIso(v) : null;
                            onSetFollowUp(it.id, iso);
                          }}
                          aria-label={`Próximo seguimiento para ${it.name}`}
                        />
                      </div>
                    </div>

                    <div className="mt-2 hidden xl:block text-xs text-slate-500">Último: {fmt(it.last_contact_at)}</div>
                  </td>

                  <td className="px-4 py-3 align-top">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {wa && (
                        <a
                          href={wa}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(ui.button("secondary", "h-8 w-8 p-0"))}
                          title="WhatsApp"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MessageCircle className="h-4 w-4" />
                        </a>
                      )}

                      {tel && (
                        <a
                          href={tel}
                          className={cn(ui.button("secondary", "h-8 w-8 p-0"))}
                          title="Llamar"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Phone className="h-4 w-4" />
                        </a>
                      )}

                      <button
                        type="button"
                        className={cn(ui.button("secondary", "h-8 w-8 p-0"))}
                        title="Marcar contactado hoy"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMarkContacted(it.id);
                        }}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        className={cn(ui.button("primary", "h-8 w-8 p-0"))}
                        title="Editar"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(it);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MOBILE CARDS */}
      <div className="grid gap-2 lg:hidden">
        {items.map((it) => {
          const wa = waById.get(it.id) ?? null;
          const tel = telUrl(it.phone);
          const pill = followUpPill(it.next_follow_up_at);
          const accent = rowAccent(it.stage, it.next_follow_up_at);
          return (
            <div key={it.id} className={cn("rounded-2xl border border-slate-200 bg-white p-3 border-l-4", accent)}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link
                    href={(`/leads/${it.id}` as unknown) as Route}
                    className="block w-full truncate text-left text-sm font-semibold text-slate-900 hover:underline"
                    aria-label={`Abrir lead ${it.name}`}
                  >
                    {it.name}
                  </Link>

                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                    <span>{it.phone ?? "—"}</span>
                    {wa && (
                      <a
                        href={wa}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 hover:bg-slate-50"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        WhatsApp
                      </a>
                    )}
                    {tel && (
                      <a
                        href={tel}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 hover:bg-slate-50"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Phone className="h-3.5 w-3.5" />
                        Llamar
                      </a>
                    )}
                  </div>
                </div>

                <LeadStageBadge stage={it.stage} />
              </div>

              <div className="mt-2 space-y-1 text-xs text-slate-700">
                <div>
                  <span className="text-slate-500">Interés:</span> {it.interest ?? "—"}
                </div>
                <div>
                  <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs", pill.className)}>
                    {pill.label}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Último:</span> {fmt(it.last_contact_at)}
                </div>
                <div>
                  <span className="text-slate-500">Próximo:</span> {fmt(it.next_follow_up_at)}
                </div>
                {it.stage === "lost" && (
                  <div>
                    <span className="text-slate-500">Motivo:</span> {it.lost_reason ?? "—"}
                  </div>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <select
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
                  value={it.stage}
                  onChange={(e) => onChangeStage(it.id, e.target.value as LeadStage)}
                >
                  {stageOptions.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>

                {isAdmin ? (
                  <select
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
                    value={it.assigned_to ?? ""}
                    onChange={(e) => onAssign(it.id, e.target.value || null)}
                  >
                    <option value="">Sin asignar</option>
                    {assignees.map((a) => (
                      <option key={a.user_id} value={a.user_id}>
                        {a.full_name ?? a.user_id.slice(0, 8)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                    Asignado: <span className="font-medium text-slate-900">{assigneeLabel(it.assigned_to ?? null)}</span>
                  </div>
                )}

                <button
                  type="button"
                  className={ui.button("secondary", "px-3 py-2 text-xs")}
                  onClick={() => onMarkContacted(it.id)}
                >
                  Contactado hoy
                </button>

                <button
                  type="button"
                  className={ui.button("secondary", "px-3 py-2 text-xs")}
                  onClick={() => onSetFollowUp(it.id, null)}
                >
                  Limpiar seguimiento
                </button>

                <button
                  type="button"
                  className={ui.button("secondary", "px-3 py-2 text-xs")}
                  onClick={() => onSetFollowUp(it.id, tomorrowAt10Iso())}
                >
                  Seguimiento mañana
                </button>

                <button
                  type="button"
                  className={ui.button("primary", "ml-auto px-3 py-2 text-xs font-semibold")}
                  onClick={() => onEdit(it)}
                >
                  Editar
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}