"use client";

import { Pencil, Trash2, CheckCircle2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import type { TaskRow } from "../tasks.types";
import { completeTask, deleteTask, reopenTask } from "../tasks.api";
import { toErrorMessage } from "@/lib/errors";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("es-AR", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function prioBadge(p: string) {
  if (p === "high") return <Badge variant="destructive">Alta</Badge>;
  if (p === "medium") return <Badge variant="secondary">Media</Badge>;
  return <Badge variant="outline">Baja</Badge>;
}

function statusBadge(s: string) {
  if (s === "done") return <Badge variant="secondary">Hecha</Badge>;
  return <Badge variant="outline">Abierta</Badge>;
}

type Props = {
  items: TaskRow[];
  loading: boolean;
  myRole: "admin" | "seller" | null;
  userId: string;
  assignees: { user_id: string; full_name: string | null }[];
  onEdit: (t: TaskRow) => void;
  onChanged: () => void;
  onActionError?: (msg: string) => void;
};

export function TasksTable({ items, loading, myRole, userId, assignees, onEdit, onChanged, onActionError }: Props) {
  const canSeeAll = myRole === "admin";
  const canEdit = (t: TaskRow) => canSeeAll || t.created_by === userId;
  const canDelete = (t: TaskRow) => canSeeAll || t.created_by === userId;

  const nameById = new Map<string, string>();
  for (const a of assignees) {
    nameById.set(a.user_id, a.full_name ?? a.user_id.slice(0, 8));
  }

  async function onComplete(t: TaskRow) {
    try {
      await completeTask(t.id);
      onChanged();
    } catch (e) {
      onActionError?.(toErrorMessage(e, "No pude completar la tarea"));
      console.error(e);
    }
  }

  async function onReopen(t: TaskRow) {
    try {
      await reopenTask(t.id);
      onChanged();
    } catch (e) {
      onActionError?.(toErrorMessage(e, "No pude reabrir la tarea"));
      console.error(e);
    }
  }

  async function onDelete(t: TaskRow) {
    if (!confirm("¿Eliminar esta tarea?")) return;
    try {
      await deleteTask(t.id);
      onChanged();
    } catch (e) {
      onActionError?.(toErrorMessage(e, "No pude eliminar la tarea"));
      console.error(e);
    }
  }

  if (loading) {
    return <div className="py-10 text-center text-sm text-slate-600">Cargando tareas…</div>;
  }

  if (!items.length) {
    return <div className="py-10 text-center text-sm text-slate-600">Sin tareas.</div>;
  }

  return (
    <Table>
      <THead>
        <TR>
          <TH>Título</TH>
          <TH className="hidden md:table-cell">Prioridad</TH>
          <TH className="hidden md:table-cell">Vence</TH>
          <TH className="hidden lg:table-cell">Asignada</TH>
          <TH>Estado</TH>
          <TH className="text-right">Acciones</TH>
        </TR>
      </THead>
      <TBody>
        {items.map((t) => {
          const allowEdit = canEdit(t);
          const allowDelete = canDelete(t);
          const assignee = t.assigned_to ? nameById.get(t.assigned_to) : "—";

          return (
            <TR key={t.id}>
              <TD className="font-medium">{t.title}</TD>
              <TD className="hidden md:table-cell">{prioBadge(t.priority)}</TD>
              <TD className="hidden md:table-cell">{formatDate(t.due_at)}</TD>
              <TD className="hidden lg:table-cell">{assignee}</TD>
              <TD>{statusBadge(t.status)}</TD>
              <TD className="text-right">
                <div className="inline-flex items-center gap-1">
                  {allowEdit ? (
                    t.status !== "done" ? (
                      <Button size="sm" variant="ghost" onClick={() => onComplete(t)} title="Completar">
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => onReopen(t)} title="Reabrir">
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    )
                  ) : null}

                  {allowEdit ? (
                    <Button size="sm" variant="ghost" onClick={() => onEdit(t)} title="Editar">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  ) : null}

                  {allowDelete ? (
                    <Button size="sm" variant="ghost" onClick={() => onDelete(t)} title="Eliminar">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              </TD>
            </TR>
          );
        })}
      </TBody>
    </Table>
  );
}
