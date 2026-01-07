"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Route } from "next";
import { Phone, MessageCircle, ArrowLeft, Plus } from "lucide-react";

import { Topbar } from "@/components/app-shell/topbar";
import { useAuth } from "@/features/auth/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

import { LeadFormModal } from "@/features/leads/components/LeadFormModal";
import { LeadStageBadge } from "@/features/leads/components/LeadStageBadge";
import { TaskFormModal } from "@/features/tasks/components/TaskFormModal";
import type { TaskPriority } from "@/features/tasks/tasks.types";
import type { LeadRow, LeadStage } from "@/features/leads/leads.types";
import type { LeadEventRow } from "@/features/leads/leadEvents.types";
import {
  addLeadNoteEvent,
  getLeadById,
  listAssignees,
  listLeadEvents,
  markContactedNow,
  setFollowUp,
  updateLead,
} from "@/features/leads/leads.api";

function digitsOnly(v: string) {
  return (v ?? "").replace(/\D+/g, "");
}

function fmt(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(d);
}

function eventBadge(type: string) {
  const map: Record<string, { label: string; variant: any }> = {
    created: { label: "Creado", variant: "outline" },
    updated: { label: "Actualizado", variant: "outline" },
    stage_changed: { label: "Etapa", variant: "default" },
    assigned: { label: "Asignación", variant: "outline" },
    contacted: { label: "Contacto", variant: "success" },
    followup_set: { label: "Seguimiento", variant: "warning" },
    note: { label: "Nota", variant: "secondary" },
  };
  const v = map[type] ?? { label: type, variant: "outline" };
  return <Badge variant={v.variant}>{v.label}</Badge>;
}

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String((params as any)?.id ?? "");

  const { role, userId } = useAuth();
  const isAdmin = role === "admin";

  const [lead, setLead] = useState<LeadRow | null>(null);
  const [events, setEvents] = useState<LeadEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Asignación
  const [assignees, setAssignees] = useState<{ user_id: string; full_name: string | null; role: string | null }[]>([]);
  const [assignedTo, setAssignedTo] = useState<string>("all");

  // Seguimiento
  const [followUp, setFollowUpLocal] = useState<string>("");

  // Nota
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);

  // Nueva tarea ligada
  const [taskOpen, setTaskOpen] = useState(false);
  const [taskPrefill, setTaskPrefill] = useState<{
    title?: string;
    description?: string | null;
    priority?: TaskPriority;
    dueDate?: string;
    assignedTo?: string;
    entity_type?: any;
    entity_id?: string;
  } | null>(null);

  async function load() {
    if (!id) return;
    setLoading(true);
    setErr(null);
    try {
      const [l, ev] = await Promise.all([getLeadById(id), listLeadEvents(id)]);
      setLead(l);
      setEvents(ev);
      setAssignedTo(l.assigned_to ?? "unassigned");
      setFollowUpLocal(l.next_follow_up_at ?? "");

      if (role === "admin") {
        const a = await listAssignees();
        setAssignees(a);
      }
    } catch (e: any) {
      setErr(e?.message ?? "No se pudo cargar el lead");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const waLink = useMemo(() => {
    const p = digitsOnly(lead?.phone ?? "");
    if (!p) return null;
    const full = p.startsWith("54") ? p : `54${p}`;
    return `https://wa.me/${full}`;
  }, [lead?.phone]);

  const telLink = useMemo(() => {
    const p = digitsOnly(lead?.phone ?? "");
    if (!p) return null;
    return `tel:${p}`;
  }, [lead?.phone]);

  async function saveAssigned(to: string) {
    if (!lead) return;
    setBusy(true);
    setErr(null);
    try {
      const value = to === "unassigned" ? null : to;
      const updated = await updateLead(lead.id, { assigned_to: value } as any);
      setLead(updated);
      setAssignedTo(updated.assigned_to ?? "unassigned");
      const ev = await listLeadEvents(lead.id);
      setEvents(ev);
    } catch (e: any) {
      setErr(e?.message ?? "No se pudo asignar");
    } finally {
      setBusy(false);
    }
  }

  async function saveStage(stage: LeadStage) {
    if (!lead) return;
    setBusy(true);
    setErr(null);
    try {
      const updated = await updateLead(lead.id, { stage } as any);
      setLead(updated);
      const ev = await listLeadEvents(lead.id);
      setEvents(ev);
    } catch (e: any) {
      setErr(e?.message ?? "No se pudo actualizar etapa");
    } finally {
      setBusy(false);
    }
  }

  async function doContactedNow() {
    if (!lead) return;
    setBusy(true);
    setErr(null);
    try {
      const updated = await markContactedNow(lead.id);
      setLead(updated);
      const ev = await listLeadEvents(lead.id);
      setEvents(ev);
    } catch (e: any) {
      setErr(e?.message ?? "No se pudo marcar contactado");
    } finally {
      setBusy(false);
    }
  }

  async function doSaveFollowUp(isoOrNull: string | null) {
    if (!lead) return;
    setBusy(true);
    setErr(null);
    try {
      const updated = await setFollowUp(lead.id, isoOrNull);
      setLead(updated);
      setFollowUpLocal(updated.next_follow_up_at ?? "");
      const ev = await listLeadEvents(lead.id);
      setEvents(ev);
    } catch (e: any) {
      setErr(e?.message ?? "No se pudo actualizar seguimiento");
    } finally {
      setBusy(false);
    }
  }

  async function doAddNote() {
    if (!lead) return;
    const text = note.trim();
    if (!text) return;
    setBusy(true);
    setErr(null);
    try {
      await addLeadNoteEvent(lead.id, text);
      setNote("");
      const ev = await listLeadEvents(lead.id);
      setEvents(ev);
    } catch (e: any) {
      setErr(e?.message ?? "No se pudo agregar nota");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Topbar title="Lead" subtitle="Cargando…" />
        <Card>
          <CardContent className="py-10 text-center text-sm text-slate-600">Cargando…</CardContent>
        </Card>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="space-y-4">
        <Topbar title="Lead" subtitle="No encontrado" />
        <Card>
          <CardContent className="space-y-4">
            {err ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">{err}</div> : null}
            <Button variant="outline" onClick={() => router.push(("/leads" as unknown) as Route)}>
              Volver
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => router.push(("/leads" as unknown) as Route)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Leads
        </Button>
      </div>

      <Topbar title={lead.name} subtitle={lead.interest ?? "Detalle del lead"} />

      {err ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">{err}</div> : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* INFO */}
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <span>{lead.name}</span>
                <LeadStageBadge stage={lead.stage as any} />
              </CardTitle>
              <CardDescription>
                Último contacto: {fmt(lead.last_contact_at)} • Próx. seguimiento: {fmt(lead.next_follow_up_at)}
              </CardDescription>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} disabled={busy}>
                Editar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const now = new Date();
                  const y = now.getFullYear();
                  const m = String(now.getMonth() + 1).padStart(2, "0");
                  const d = String(now.getDate()).padStart(2, "0");
                  setTaskPrefill({
                    title: `Llamar a ${lead.name ?? "cliente"}`,
                    description: lead.interest ? `Interés: ${lead.interest}` : null,
                    priority: "medium",
                    dueDate: `${y}-${m}-${d}`,
                    assignedTo: "team",
                    entity_type: "lead",
                    entity_id: lead.id,
                  });
                  setTaskOpen(true);
                }}
                disabled={busy}
              >
                + Tarea
              </Button>
              <Button size="sm" onClick={doContactedNow} disabled={busy}>
                Contactado hoy
              </Button>

              {waLink ? (
                <Button asChild variant="outline" size="sm">
                  <a href={waLink} target="_blank" rel="noreferrer">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    WhatsApp
                  </a>
                </Button>
              ) : null}

              {telLink ? (
                <Button asChild variant="outline" size="sm">
                  <a href={telLink}>
                    <Phone className="mr-2 h-4 w-4" />
                    Llamar
                  </a>
                </Button>
              ) : null}
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <div className="text-xs font-medium text-slate-700">Teléfono</div>
                <div className="text-sm text-slate-900">{lead.phone ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-slate-700">Interés</div>
                <div className="text-sm text-slate-900">{lead.interest ?? "—"}</div>
              </div>

              <div>
                <div className="text-xs font-medium text-slate-700">Etapa</div>
                <Select value={lead.stage} onChange={(e) => saveStage(e.target.value as LeadStage)} disabled={busy}>
                  <option value="new">new</option>
                  <option value="contacted">contacted</option>
                  <option value="interested">interested</option>
                  <option value="negotiation">negotiation</option>
                  <option value="won">won</option>
                  <option value="lost">lost</option>
                </Select>
              </div>

              <div>
                <div className="text-xs font-medium text-slate-700">Asignado a</div>
                {isAdmin ? (
                  <Select
                    value={assignedTo}
                    onChange={(e) => {
                      setAssignedTo(e.target.value);
                      saveAssigned(e.target.value);
                    }}
                    disabled={busy}
                  >
                    <option value="unassigned">(Sin asignar)</option>
                    {assignees.map((a) => (
                      <option key={a.user_id} value={a.user_id}>
                        {a.full_name ?? a.user_id}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <div className="text-sm text-slate-900">{lead.assigned_to ?? "—"}</div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
              <div className="text-sm font-semibold text-slate-900">Seguimiento</div>
              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <Input
                  type="datetime-local"
                  value={followUp ? new Date(followUp).toISOString().slice(0, 16) : ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (!v) setFollowUpLocal("");
                    else setFollowUpLocal(new Date(v).toISOString());
                  }}
                />
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => doSaveFollowUp(followUp || null)} disabled={busy}>
                    Guardar
                  </Button>
                  <Button variant="outline" onClick={() => doSaveFollowUp(null)} disabled={busy}>
                    Limpiar
                  </Button>
                </div>
              </div>
              <div className="text-xs text-slate-500">Regla típica: poné un seguimiento cada vez que hablás.</div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
              <div className="text-sm font-semibold text-slate-900">Agregar nota</div>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej: pidió fotos / quiere permuta / trae seña" />
              <div className="flex justify-end">
                <Button onClick={doAddNote} disabled={busy || !note.trim()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* TIMELINE */}
        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
            <CardDescription>Historial de acciones sobre este lead</CardDescription>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-600">Sin eventos todavía.</div>
            ) : (
              <div className="space-y-3">
                {events.map((ev) => (
                  <div key={ev.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                    <div className="flex items-center justify-between gap-2">
                      {eventBadge(ev.type)}
                      <div className="text-xs text-slate-500">{fmt(ev.created_at)}</div>
                    </div>
                    {ev.message ? <div className="mt-2 text-sm text-slate-900 whitespace-pre-wrap">{ev.message}</div> : null}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <LeadFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        initial={lead}
        onSubmit={async (payload) => {
          const patch: any = {
            name: payload.name,
            phone: payload.phone,
            interest: payload.interest,
            stage: payload.stage,
            notes: payload.notes,
            next_follow_up_at: payload.next_follow_up_at,
            lost_reason: payload.lost_reason,
          };
          const updated = await updateLead(lead.id, patch);
          setLead(updated);
          const ev = await listLeadEvents(lead.id);
          setEvents(ev);
        }}
      />

      <TaskFormModal
        open={taskOpen}
        onClose={() => {
          setTaskOpen(false);
          setTaskPrefill(null);
        }}
        onSaved={() => {
          setTaskOpen(false);
          setTaskPrefill(null);
        }}
        editing={null}
        myRole={(role ?? "seller") as any}
        userId={userId}
        assignees={assignees as any}
        prefill={(taskPrefill ?? undefined) as any}
      />
    </div>
  );
}
