"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { TaskPriority, TaskRow } from "../tasks.types";
import { createTask, updateTask } from "../tasks.api";

function toDateInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function toIsoFromDateInput(dateStr: string) {
  if (!dateStr) return null;
  // Mediodía local para evitar problemas de timezone (no cambia el día).
  const [y, m, d] = dateStr.split("-").map((x) => Number(x));
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
  return dt.toISOString();
}

export function TaskFormModal({
  open,
  onClose,
  onSaved,
  editing,
  myRole,
  userId,
  assignees,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing: TaskRow | null;

  myRole: "admin" | "manager" | "seller";
  userId: string | null;

  assignees: { user_id: string; full_name: string | null; role: string | null }[];
}) {
  const isEditing = !!editing;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState(""); // YYYY-MM-DD
  const [assignedTo, setAssignedTo] = useState<string>("team"); // admin: "team" | user_id
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const assigneeOptions = useMemo(() => {
    const base = [{ value: "team", label: "Todos (equipo)" }];
    const users = assignees
      .filter((a) => (a.role ?? "") === "seller" || (a.role ?? "") === "admin")
      .map((a) => ({
        value: a.user_id,
        label: a.full_name ? a.full_name : a.user_id.slice(0, 8),
      }));
    return [...base, ...users];
  }, [assignees]);

  useEffect(() => {
    if (!open) return;

    if (editing) {
      setTitle(editing.title ?? "");
      setDescription(editing.description ?? "");
      setPriority(editing.priority ?? "medium");
      setDueDate(toDateInput(editing.due_at));
      setAssignedTo(editing.audience === "team" ? "team" : (editing.assigned_to ?? "team"));
    } else {
      setTitle("");
      setDescription("");
      setPriority("medium");
      setDueDate("");
      setAssignedTo("team");
    }

    setErr(null);
    setSaving(false);
  }, [open, editing]);

  async function submit() {
    setErr(null);
    if (!title.trim()) {
      setErr("El título es obligatorio.");
      return;
    }
    if (!userId) {
      setErr("Sin sesión.");
      return;
    }

    setSaving(true);
    try {
      const due_at = toIsoFromDateInput(dueDate);

      if (isEditing && editing) {
        await updateTask({
          id: editing.id,
          title: title.trim(),
          description: description.trim() ? description.trim() : null,
          priority,
          due_at,
          ...(myRole === "admin"
            ? { audience: assignedTo === "team" ? "team" : "private", assigned_to: assignedTo === "team" ? null : assignedTo }
            : {}),
        });
      } else {
        await createTask({
          title: title.trim(),
          description: description.trim() ? description.trim() : null,
          priority,
          due_at,
          audience: myRole === "admin" && assignedTo === "team" ? "team" : "private",
          assigned_to: myRole === "admin" ? (assignedTo === "team" ? null : assignedTo) : userId,
        });
      }

      onClose();
      onSaved();
    } catch (e: any) {
      setErr(e?.message ?? "Error guardando");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? "Editar tarea" : "Nueva tarea"}>
      <div className="space-y-4">
        {err ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{err}</div>
        ) : null}

        <div className="grid gap-2">
          <div className="text-xs font-medium text-slate-700">Título *</div>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Llamar a Juan por la financiación" />
        </div>

        <div className="grid gap-2">
          <div className="text-xs font-medium text-slate-700">Descripción</div>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detalle (opcional)" className="w-full min-h-[80px] rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="grid gap-2">
            <div className="text-xs font-medium text-slate-700">Prioridad</div>
            <Select value={priority} onChange={(e) => setPriority(e.target.value as any)}>
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
            </Select>
          </div>

          <div className="grid gap-2">
            <div className="text-xs font-medium text-slate-700">Vence</div>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>

          {myRole === "admin" ? (
            <div className="grid gap-2">
              <div className="text-xs font-medium text-slate-700">Asignar a</div>
              <Select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
                {assigneeOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
          ) : (
            <div className="hidden md:block" />
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
