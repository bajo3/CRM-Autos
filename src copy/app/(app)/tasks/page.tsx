"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";

import { Topbar } from "@/components/app-shell/topbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

import type { TaskRow, TaskStatus } from "@/features/tasks/tasks.types";
import { useTasks } from "@/features/tasks/useTasks";
import { useAssignees } from "@/features/leads/useAssignees";
import { TaskFormModal } from "@/features/tasks/components/TaskFormModal";
import { TasksTable } from "@/features/tasks/components/TasksTable";

export default function TasksPage() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TaskRow | null>(null);

  const [status, setStatus] = useState<TaskStatus | "all">("open");
  const [assignedTo, setAssignedTo] = useState<"all" | "team" | string>("all");
  const [search, setSearch] = useState("");

  const [actionError, setActionError] = useState<string | null>(null);

  const { items, loading, error, refresh, role: myRole, userId } = useTasks({ status, assignedTo, search });
  const { assignees } = useAssignees();

  const statusOptions = useMemo(
    () => [
      { value: "open", label: "Abiertas" },
      { value: "done", label: "Hechas" },
      { value: "all", label: "Todas" },
    ],
    []
  );

  const assignedOptions = useMemo(() => {
    const base = [
      { value: "all", label: "Todas" },
      { value: "team", label: "Mi equipo" },
      { value: "unassigned", label: "Sin asignar" },
    ];
    const users = (assignees ?? []).map((a) => ({ value: a.user_id, label: a.full_name ?? a.user_id.slice(0, 8) }));
    return [...base, ...users];
  }, [assignees]);

  function onEdit(t: TaskRow) {
    setEditing(t);
    setOpen(true);
  }

  return (
    <div className="space-y-6">
      <Topbar title="Tareas" subtitle="Seguimientos y recordatorios del equipo" />

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Listado</CardTitle>
            <CardDescription>Filtrá y marcá tareas como hechas.</CardDescription>
          </div>
          <Button onClick={() => { setEditing(null); setOpen(true); }} className="gap-2">
            <Plus className="h-4 w-4" />
            Nueva
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
            <div className="md:col-span-3">
              <Select value={status} onChange={(e) => setStatus(e.target.value as any)}>
                {statusOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>

            {myRole === "admin" ? (
              <div className="md:col-span-3">
                <Select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value as any)}>
                  {assignedOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </div>
            ) : (
              <div className="hidden md:block md:col-span-3" />
            )}

            <div className="md:col-span-6">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por título o descripción…"
              />
            </div>

            <div className="md:col-span-12 flex items-center justify-end">
              <Button
                variant="ghost"
                onClick={() => {
                  setActionError(null);
                  refresh();
                }}
              >
                Actualizar
              </Button>
            </div>
          </div>

          {actionError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              {actionError}
            </div>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
          ) : null}

          <div className="rounded-3xl border border-slate-200 overflow-hidden">
            <TasksTable
              items={items}
              loading={loading}
              myRole={myRole}
              userId={userId ?? ""}
              assignees={assignees}
              onEdit={onEdit}
              onChanged={refresh}
              onActionError={(msg) => setActionError(msg)}
            />
          </div>
        </CardContent>
      </Card>

      <TaskFormModal
        open={open}
        onClose={() => setOpen(false)}
        onSaved={() => {
          setActionError(null);
          refresh();
        }}
        editing={editing}
        myRole={myRole}
        userId={userId ?? ""}
        assignees={assignees}
      />
    </div>
  );
}
