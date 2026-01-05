"use client";

import { useMemo, useState } from "react";

import { useLeads } from "@/features/leads/useLeads";
import { useAssignees } from "@/features/leads/useAssignees";
import type { LeadRow, LeadStage } from "@/features/leads/leads.types";
import { createLead, markContactedNow, setFollowUp, updateLead } from "@/features/leads/leads.api";
import { LeadFormModal } from "@/features/leads/components/LeadFormModal";
import { LeadsTable } from "@/features/leads/components/LeadsTable";
import { ui } from "@/lib/ui";
import { Topbar } from "@/components/app-shell/topbar";

const stages: { value: LeadStage | "all"; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "new", label: "Nuevo" },
  { value: "contacted", label: "Contactado" },
  { value: "interested", label: "Interesado" },
  { value: "negotiation", label: "Negociación" },
  { value: "won", label: "Ganado" },
  { value: "lost", label: "Perdido" },
];

export default function LeadsPage() {
  const {
    items,
    loading,
    error,
    refresh,
    myRole,

    // ✅ según tu tipo: useLeads expone filtros “sueltos”, no objeto filters
    stage,
    setStage,
    mine,
    setMine,
    overdue,
    setOverdue,
    search,
    setSearch,
    assignedTo,
    setAssignedTo,

    page,
    hasMore,
    loadMore,

    counts,
  } = useLeads();

  const { assignees, loadingAssignees, assigneesError } = useAssignees();
  const isAdmin = myRole === "admin";

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LeadRow | null>(null);

  const titleRight = useMemo(() => {
    const parts = [
      `Total: ${counts.all}`,
      `Nuevo: ${counts.new}`,
      `Negociación: ${counts.negotiation}`,
      `Ganado: ${counts.won}`,
      `Perdido: ${counts.lost}`,
    ];
    return parts.join(" · ");
  }, [counts]);

  async function handleSubmit(payload: any) {
    if (editing) {
      await updateLead(editing.id, payload);
      setEditing(null);
      await refresh();
      return;
    }

    await createLead(payload);
    await refresh();
  }

  async function handleChangeStage(id: string, next: LeadStage) {
    if (next === "lost") {
      const lead = items.find((x) => x.id === id) ?? null;
      setEditing(lead);
      setModalOpen(true);
      return;
    }

    await updateLead(id, { stage: next, lost_reason: null });
    await refresh();
  }

  async function handleMarkContacted(id: string) {
    await markContactedNow(id);
    await refresh();
  }

  async function handleSetFollowUp(id: string, isoOrNull: string | null) {
    await setFollowUp(id, isoOrNull);
    await refresh();
  }

  async function handleAssign(id: string, userIdOrNull: string | null) {
    if (!isAdmin) return;
    await updateLead(id, { assigned_to: userIdOrNull });
    await refresh();
  }

  function clearFilters() {
    setStage("all");
    setAssignedTo("all");
    if (isAdmin) setMine(false);
    setOverdue(false);
    setSearch("");
  }

  return (
    <div className="mx-auto w-full max-w-6xl p-3 sm:p-6 bg-white text-slate-900">
      <Topbar title="Leads" subtitle={titleRight} />

      <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
        <button type="button" className={ui.button("secondary")} onClick={clearFilters}>
          Limpiar filtros
        </button>

        <button type="button" className={ui.button("secondary")} onClick={() => refresh()}>
          Actualizar
        </button>

        <button
          type="button"
          className={ui.button("primary", "font-semibold")}
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          + Nuevo lead
        </button>
      </div>

      {/* Filtros */}
      <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-12">
        <div className="sm:col-span-3">
          <select className={ui.select("rounded-2xl")} value={stage} onChange={(e) => setStage(e.target.value as any)}>
            {stages.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {isAdmin ? (
          <div className="sm:col-span-3">
            <select
              className={ui.select("rounded-2xl")}
              value={assignedTo}
              onChange={(e) => {
                const v = e.target.value as any;
                setAssignedTo(v);
                if (v !== "all" && mine) setMine(false);
              }}
              disabled={loadingAssignees && assignees.length === 0}
            >
              <option value="all">Asignado: Todos</option>
              <option value="unassigned">Sin asignar</option>
              {assignees.map((a) => (
                <option key={a.user_id} value={a.user_id}>
                  {a.full_name ?? a.user_id.slice(0, 8)}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className={isAdmin ? "sm:col-span-4" : "sm:col-span-7"}>
          <input
            className={ui.input("rounded-2xl")}
            placeholder="Buscar por nombre / teléfono / interés"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="sm:col-span-2 flex items-center gap-2">
          {isAdmin ? (
            <button
              type="button"
              className={ui.chip(mine, "indigo")}
              onClick={() => {
                if (!mine) setAssignedTo("all");
                setMine(!mine);
              }}
            >
              Mis leads
            </button>
          ) : null}


          <button type="button" className={ui.chip(overdue, "neutral")} onClick={() => setOverdue(!overdue)}>
            Vencidos
          </button>
        </div>
      </div>

      {isAdmin && assigneesError ? (
        <div className={ui.card("mb-3 p-3 text-sm text-slate-900")}>
          <span className="text-slate-500">Vendedores:</span> {assigneesError}
        </div>
      ) : null}

      {error && <div className={ui.card("mb-3 p-3 text-sm text-slate-900")}>{error}</div>}

      <LeadsTable
        items={items}
        loading={loading}
        isAdmin={isAdmin}
        assignees={assignees}
        onAssign={handleAssign}
        onEdit={(lead: LeadRow) => {
          setEditing(lead);
          setModalOpen(true);
        }}
        onChangeStage={handleChangeStage}
        onMarkContacted={handleMarkContacted}
        onSetFollowUp={handleSetFollowUp}
      />

      <div className="mt-3 flex items-center justify-between">
        <div className="text-xs text-slate-500">
          Mostrando {items.length} (página {page + 1})
        </div>
        {hasMore ? (
          <button
            type="button"
            onClick={() => loadMore()}
            disabled={loading}
            className={ui.button(loading ? "ghost" : "primary")}
          >
            {loading ? "Cargando…" : "Cargar más"}
          </button>
        ) : (
          <div className="text-xs text-slate-500">No hay más resultados</div>
        )}
      </div>

      <LeadFormModal
        open={modalOpen}
        initial={editing}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSubmit={async (p) => {
          await handleSubmit(p);
          setModalOpen(false);
          setEditing(null);
        }}
      />
    </div>
  );
}
