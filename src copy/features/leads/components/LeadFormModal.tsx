"use client";

import { useEffect, useMemo, useState } from "react";
import type { LeadInsert, LeadRow, LeadStage } from "../leads.types";
import { cn } from "@/lib/utils";

const stages: { value: LeadStage; label: string }[] = [
  { value: "new", label: "Nuevo" },
  { value: "contacted", label: "Contactado" },
  { value: "interested", label: "Interesado" },
  { value: "negotiation", label: "Negociación" },
  { value: "won", label: "Ganado" },
  { value: "lost", label: "Perdido" },
];

function toLocalInputValue(iso: string) {
  // ISO -> yyyy-MM-ddTHH:mm en hora local
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function localInputToISO(v: string) {
  // yyyy-MM-ddTHH:mm local -> ISO
  const d = new Date(v);
  return d.toISOString();
}

export function LeadFormModal(props: {
  open: boolean;
  onClose: () => void;
  initial?: LeadRow | null;
  onSubmit: (payload: LeadInsert) => Promise<void>;
}) {
  const { open, onClose, initial, onSubmit } = props;
  const isEdit = !!initial;

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [interest, setInterest] = useState("");
  const [stage, setStage] = useState<LeadStage>("new");
  const [notes, setNotes] = useState("");
  const [nextFollowUp, setNextFollowUp] = useState<string>(""); // local input
  const [lostReason, setLostReason] = useState("");

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setErr(null);

    setName(initial?.name ?? "");
    setPhone(initial?.phone ?? "");
    setInterest(initial?.interest ?? "");
    setStage(initial?.stage ?? "new");
    setNotes(initial?.notes ?? "");
    setLostReason(initial?.lost_reason ?? "");

    setNextFollowUp(initial?.next_follow_up_at ? toLocalInputValue(initial.next_follow_up_at) : "");
  }, [open, initial]);

  const showLostReason = useMemo(() => stage === "lost", [stage]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={saving ? undefined : onClose}
      />

      {/* Modal */}
      <div className="absolute inset-x-0 top-10 mx-auto w-[92vw] max-w-xl rounded-2xl border border-slate-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <div className="text-sm font-semibold text-slate-0">
            {isEdit ? "Editar lead" : "Nuevo lead"}
          </div>

          <button
            className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-900"
            onClick={saving ? undefined : onClose}
          >
            ✕
          </button>
        </div>

        <form
          className="space-y-3 p-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setErr(null);

            if (!name.trim()) {
              setErr("El nombre es obligatorio.");
              return;
            }

            if (stage === "lost" && !lostReason.trim()) {
              setErr("Si está Perdido, completá el motivo.");
              return;
            }

            setSaving(true);
            try {
              await onSubmit({
                name: name.trim(),
                phone: phone.trim() ? phone.trim() : null,
                interest: interest.trim() ? interest.trim() : null,
                stage,
                notes: notes.trim() ? notes.trim() : null,
                next_follow_up_at: nextFollowUp ? localInputToISO(nextFollowUp) : null,
                lost_reason: stage === "lost" ? lostReason.trim() : null,
              });
              onClose();
            } catch (e: any) {
              // Dedupe phone => 23505
              const msg =
                e?.code === "23505"
                  ? "Ya existe un lead con ese teléfono en esta agencia."
                  : e?.message ?? "Error guardando lead";
              setErr(msg);
            } finally {
              setSaving(false);
            }
          }}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <div className="text-xs text-slate-900">Nombre *</div>
              <input
                className="w-full rounded-xl border border-slate-800 bg-slate-0 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-600"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Juan Pérez"
              />
            </label>

            <label className="space-y-1">
              <div className="text-xs text-slate-900">Teléfono</div>
              <input
                className="w-full rounded-xl border border-slate-800 bg-slate-0 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-600"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ej: 2494..."
              />
            </label>

            <label className="space-y-1 sm:col-span-2">
              <div className="text-xs text-slate-900">Interés</div>
              <input
                className="w-full rounded-xl border border-slate-800 bg-slate-0 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-600"
                value={interest}
                onChange={(e) => setInterest(e.target.value)}
                placeholder="Ej: Suran 2016 / financiación / permuta"
              />
            </label>

            <label className="space-y-1">
              <div className="text-xs text-slate-900">Etapa</div>
              <select
                className="w-full rounded-xl border border-slate-800 bg-slate-0 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-600"
                value={stage}
                onChange={(e) => setStage(e.target.value as LeadStage)}
              >
                {stages.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <div className="text-xs text-slate-900">Próximo seguimiento</div>
              <input
                type="datetime-local"
                className="w-full rounded-xl border border-slate-800 bg-slate-0 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-600"
                value={nextFollowUp}
                onChange={(e) => setNextFollowUp(e.target.value)}
              />
              <button
                type="button"
                className="mt-2 text-xs text-slate-900 underline underline-offset-4 hover:text-slate-900"
                onClick={() => setNextFollowUp("")}
              >
                Limpiar
              </button>
            </label>

            <label className="space-y-1 sm:col-span-2">
              <div className="text-xs text-slate-900">Notas</div>
              <textarea
                className="min-h-[80px] w-full rounded-xl border border-slate-800 bg-slate-0 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-600"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Detalles, presupuesto, permuta, etc."
              />
            </label>

            {showLostReason && (
              <label className="space-y-1 sm:col-span-2">
                <div className="text-xs text-slate-900">Motivo de pérdida *</div>
                <input
                  className={cn(
                    "w-full rounded-xl border bg-slate-0 px-3 py-2 text-sm text-slate-900 outline-none",
                    "border-slate-800 focus:border-slate-600"
                  )}
                  value={lostReason}
                  onChange={(e) => setLostReason(e.target.value)}
                  placeholder="Ej: precio / no respondió / compró otro"
                />
              </label>
            )}
          </div>

          {err && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
              {err}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 hover:bg-slate-0"
              onClick={saving ? undefined : onClose}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-100 hover:bg-white disabled:opacity-60"
              disabled={saving}
            >
              {saving ? "Guardando..." : isEdit ? "Guardar" : "Crear"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
