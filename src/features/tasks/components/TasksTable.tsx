"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useMemo, useState } from "react";
import { MessageCircle, Phone, Pencil, Trash2, CheckCircle2, RotateCcw, Clock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import type { TaskRow } from "../tasks.types";
import { cancelTask, completeTask, deleteTask, reopenTask, updateTask } from "../tasks.api";
import { toErrorMessage } from "@/lib/errors";
import { supabase } from "@/lib/supabaseBrowser";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function parseIso(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function fmtShort(iso: string | null) {
  if (!iso) return "—";
  const d = parseIso(iso);
  if (!d) return "—";
  return d.toLocaleDateString("es-AR", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function dueLabel(iso: string | null) {
  if (!iso) return "Sin vencimiento";
  const d = parseIso(iso);
  if (!d) return "—";
  const today = startOfDay(new Date());
  const due = startOfDay(d);
  const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Mañana";
  if (diffDays === -1) return "Ayer";
  if (diffDays > 1) return `En ${diffDays} días`;
  return `Vencida hace ${Math.abs(diffDays)} días`;
}

function prioBadge(p: string) {
  if (p === "high") return <Badge variant="danger">Alta</Badge>;
  if (p === "medium") return <Badge variant="warning">Media</Badge>;
  return <Badge variant="outline">Baja</Badge>;
}

function statusBadge(t: TaskRow) {
  const due = t.due_at ? parseIso(t.due_at) : null;
  const isOverdue = t.status === "open" && due && startOfDay(due).getTime() < startOfDay(new Date()).getTime();

  if (t.status === "done") return <Badge variant="success">✅ Hecha</Badge>;
  if (t.status === "canceled") return <Badge variant="muted">✖ Cancelada</Badge>;
  if (isOverdue) return <Badge variant="danger">🔴 Vencida</Badge>;
  return <Badge variant="outline">🟢 Abierta</Badge>;
}

function entityHref(t: TaskRow) {
  if (!t.entity_type || !t.entity_id) return null;
  if (t.entity_type === "lead") return `/leads/${t.entity_id}`;
  if (t.entity_type === "vehicle") return `/vehicles/${t.entity_id}`;
  if (t.entity_type === "credit") return `/credits/${t.entity_id}`;
  if (t.entity_type === "client") return `/clients/${t.entity_id}`;
  return null;
}

function entityLabel(t: TaskRow) {
  if (!t.entity_type) return null;
  if (t.entity_type === "lead") return "Lead";
  if (t.entity_type === "vehicle") return "Vehículo";
  if (t.entity_type === "credit") return "Crédito";
  if (t.entity_type === "client") return "Cliente";
  return null;
}

function digitsOnly(v: string) {
  return (v ?? "").replace(/\D+/g, "");
}

function waLink(phone: string | null | undefined) {
  const p = digitsOnly(phone ?? "");
  if (!p) return null;
  const full = p.startsWith("54") ? p : `54${p}`;
  return `https://wa.me/${full}`;
}

function telLink(phone: string | null | undefined) {
  const p = digitsOnly(phone ?? "");
  if (!p) return null;
  return `tel:${p}`;
}

type Props = {
  items: TaskRow[];
  loading: boolean;
  myRole: "admin" | "manager" | "seller" | null;
  userId: string;
  assignees: { user_id: string; full_name: string | null }[];
  onEdit: (t: TaskRow) => void;
  onChanged: () => void;
  onActionError?: (msg: string) => void;
};

export function TasksTable({ items, loading, myRole, userId, assignees, onEdit, onChanged, onActionError }: Props) {
  const [leadMeta, setLeadMeta] = useState<Record<string, { name: string | null; phone: string | null }>>({});
  const [vehicleMeta, setVehicleMeta] = useState<Record<string, { title: string | null }>>({});

  const leadIds = useMemo(
    () => Array.from(new Set(items.filter((t) => t.entity_type === "lead" && t.entity_id).map((t) => t.entity_id as string))),
    [items]
  );
  const vehicleIds = useMemo(
    () => Array.from(new Set(items.filter((t) => t.entity_type === "vehicle" && t.entity_id).map((t) => t.entity_id as string))),
    [items]
  );

  useEffect(() => {
    let alive = true;

    async function loadLeadMeta() {
      if (leadIds.length === 0) {
        if (alive) setLeadMeta({});
        return;
      }
      const { data, error } = await supabase.from("leads").select("id,name,phone").in("id", leadIds);
      if (!alive) return;
      if (error) return; // silent
      const map: Record<string, { name: string | null; phone: string | null }> = {};
      for (const r of (data ?? []) as any[]) {
        map[r.id] = { name: r.name ?? null, phone: r.phone ?? null };
      }
      setLeadMeta(map);
    }

    async function loadVehicleMeta() {
      if (vehicleIds.length === 0) {
        if (alive) setVehicleMeta({});
        return;
      }
      const { data, error } = await supabase.from("vehicles").select("id,title").in("id", vehicleIds);
      if (!alive) return;
      if (error) return; // silent
      const map: Record<string, { title: string | null }> = {};
      for (const r of (data ?? []) as any[]) {
        map[r.id] = { title: r.title ?? null };
      }
      setVehicleMeta(map);
    }

    void loadLeadMeta();
    void loadVehicleMeta();

    return () => {
      alive = false;
    };
  }, [leadIds, vehicleIds]);

  async function run<T>(action: () => Promise<T>) {
    try {
      await action();
      onChanged();
    } catch (e) {
      onActionError?.(toErrorMessage(e));
    }
  }

  async function postpone(t: TaskRow, days: number) {
    const base = t.due_at ? parseIso(t.due_at) : null;
    const d = base ?? new Date();
    d.setDate(d.getDate() + days);
    await updateTask({ id: t.id, due_at: d.toISOString() });
  }

  return (
    <Table>
      <THead>
        <TR>
          <TH>Estado</TH>
          <TH>Tarea</TH>
          <TH>Vence</TH>
          <TH>Prioridad</TH>
          <TH>Asignado</TH>
          <TH className="text-right">Acciones</TH>
        </TR>
      </THead>

      <TBody>
        {loading ? (
          <TR>
            <TD colSpan={6}>Cargando…</TD>
          </TR>
        ) : items.length === 0 ? (
          <TR>
            <TD colSpan={6}>Sin tareas.</TD>
          </TR>
        ) : (
          items.map((t) => {
            const assignee = assignees.find((a) => a.user_id === t.assigned_to);
            const href = entityHref(t);
            const label = entityLabel(t);

            const leadInfo = t.entity_type === "lead" && t.entity_id ? leadMeta[t.entity_id] : undefined;
            const vehicleInfo = t.entity_type === "vehicle" && t.entity_id ? vehicleMeta[t.entity_id] : undefined;
            const wa = leadInfo?.phone ? waLink(leadInfo.phone) : null;
            const tel = leadInfo?.phone ? telLink(leadInfo.phone) : null;

            return (
              <TR key={t.id}>
                <TD>{statusBadge(t)}</TD>

                <TD>
                  <div className="flex items-start gap-2">
                    {href ? (
                      <Link className="font-medium hover:underline" href={(href as unknown) as Route}>
                        {t.title}
                      </Link>
                    ) : (
                      <div className="font-medium">{t.title}</div>
                    )}
                  </div>
                  {href && label ? (
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{label}</Badge>
                      {t.entity_type === "lead" && leadInfo?.name ? (
                        <span className="text-xs text-slate-600">{leadInfo.name}</span>
                      ) : null}
                      {t.entity_type === "vehicle" && vehicleInfo?.title ? (
                        <span className="text-xs text-slate-600">{vehicleInfo.title}</span>
                      ) : null}
                    </div>
                  ) : null}
                  {t.description ? <div className="text-xs text-slate-600 mt-1 line-clamp-2">{t.description}</div> : null}
                </TD>

                <TD>
                  <div className="text-sm">{fmtShort(t.due_at)}</div>
                  <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <Clock className="h-3.5 w-3.5" />
                    {dueLabel(t.due_at)}
                  </div>
                </TD>

                <TD>{prioBadge(t.priority)}</TD>

                <TD className="text-sm">
                  {assignee?.full_name ?? (t.assigned_to ? t.assigned_to.slice(0, 8) : "—")}
                </TD>

                <TD className="text-right">
                  <div className="inline-flex flex-wrap justify-end gap-2">
                    {wa ? (
                      <Button asChild size="sm" variant="outline" title="WhatsApp">
                        <a href={wa} target="_blank" rel="noreferrer">
                          <MessageCircle className="h-4 w-4" />
                        </a>
                      </Button>
                    ) : null}

                    {tel ? (
                      <Button asChild size="sm" variant="outline" title="Llamar">
                        <a href={tel}>
                          <Phone className="h-4 w-4" />
                        </a>
                      </Button>
                    ) : null}

                    {t.status === "open" ? (
                      <Button size="sm" variant="secondary" onClick={() => run(() => completeTask(t.id))} title="Marcar hecha">
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button size="sm" variant="secondary" onClick={() => run(() => reopenTask(t.id))} title="Reabrir">
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    )}

                    {t.status === "open" ? (
                      <>
                        <Button size="sm" variant="outline" onClick={() => run(() => postpone(t, 1))} title="Posponer 1 día">
                          +1d
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => run(() => postpone(t, 7))} title="Posponer 1 semana">
                          +7d
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => onEdit(t)} title="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => run(() => cancelTask(t.id))} title="Cancelar">
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </>
                    ) : null}

                    {(myRole === "admin" || t.created_by === userId) ? (
                      <Button size="sm" variant="destructive" onClick={() => run(() => deleteTask(t.id))} title="Eliminar">
                        <Trash2 className="h-4 w-4" />
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
  );
}