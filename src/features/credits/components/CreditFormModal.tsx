"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { CreditRow } from "../credits.types";

type Form = {
  client_name: string;
  client_phone: string;
  vehicle_model: string;
  vehicle_version: string;
  vehicle_year: string;
  vehicle_kms: string;
  installment_amount: string;
  installment_count: string;
  start_date: string; // yyyy-mm-dd
};

export function CreditFormModal(props: {
  open: boolean;
  onClose: () => void;
  initial?: CreditRow | null;
  onSubmit: (payload: {
    client_name: string;
    client_phone: string | null;
    vehicle_model: string | null;
    vehicle_version: string | null;
    vehicle_year: number | null;
    vehicle_kms: number | null;
    installment_amount: number;
    installment_count: number;
    start_date: string;
  }) => Promise<void>;
}) {
  const { open, onClose, initial, onSubmit } = props;
  const isEdit = !!initial;

  const [f, setF] = useState<Form>({
    client_name: "",
    client_phone: "",
    vehicle_model: "",
    vehicle_version: "",
    vehicle_year: "",
    vehicle_kms: "",
    installment_amount: "",
    installment_count: "",
    start_date: "",
  });

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setErr(null);
    setF({
      client_name: initial?.client_name ?? "",
      client_phone: initial?.client_phone ?? "",
      vehicle_model: initial?.vehicle_model ?? "",
      vehicle_version: initial?.vehicle_version ?? "",
      vehicle_year: initial?.vehicle_year ? String(initial.vehicle_year) : "",
      vehicle_kms: initial?.vehicle_kms ? String(initial.vehicle_kms) : "",
      installment_amount: initial?.installment_amount ? String(initial.installment_amount) : "",
      installment_count: initial?.installment_count ? String(initial.installment_count) : "",
      start_date: initial?.start_date ?? "",
    });
  }, [open, initial]);

  const canSave = useMemo(() => {
    if (!f.client_name.trim()) return false;
    const amt = Number(f.installment_amount);
    const cnt = Number(f.installment_count);
    if (!Number.isFinite(amt) || amt <= 0) return false;
    if (!Number.isInteger(cnt) || cnt <= 0) return false;
    if (!f.start_date) return false;
    return true;
  }, [f]);

  if (!open) return null;

  return (
    <Modal open={open} onClose={saving ? () => {} : onClose} title={isEdit ? "Editar crédito" : "Nuevo crédito"}>
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!canSave || saving) return;
          setErr(null);
          setSaving(true);
          try {
            await onSubmit({
              client_name: f.client_name.trim(),
              client_phone: f.client_phone.trim() ? f.client_phone.trim() : null,
              vehicle_model: f.vehicle_model.trim() ? f.vehicle_model.trim() : null,
              vehicle_version: f.vehicle_version.trim() ? f.vehicle_version.trim() : null,
              vehicle_year: f.vehicle_year.trim() ? Number(f.vehicle_year) : null,
              vehicle_kms: f.vehicle_kms.trim() ? Number(f.vehicle_kms) : null,
              installment_amount: Number(f.installment_amount),
              installment_count: Number(f.installment_count),
              start_date: f.start_date,
            });
            onClose();
          } catch (e: any) {
            setErr(e?.message ?? "Error guardando crédito");
          } finally {
            setSaving(false);
          }
        }}
      >
        <div>
          <div className="mb-1 text-sm font-medium text-slate-700">Cliente *</div>
          <Input value={f.client_name} onChange={(e) => setF({ ...f, client_name: e.target.value })} placeholder="Ej: Juan Pérez" />
        </div>

        <div>
          <div className="mb-1 text-sm font-medium text-slate-700">Teléfono</div>
          <Input value={f.client_phone} onChange={(e) => setF({ ...f, client_phone: e.target.value })} placeholder="Ej: 2494..." />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <div className="mb-1 text-sm font-medium text-slate-700">Modelo</div>
            <Input value={f.vehicle_model} onChange={(e) => setF({ ...f, vehicle_model: e.target.value })} placeholder="Ej: Suran" />
          </div>
          <div>
            <div className="mb-1 text-sm font-medium text-slate-700">Versión</div>
            <Input value={f.vehicle_version} onChange={(e) => setF({ ...f, vehicle_version: e.target.value })} placeholder="Comfortline" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <div className="mb-1 text-sm font-medium text-slate-700">Año</div>
            <Input value={f.vehicle_year} onChange={(e) => setF({ ...f, vehicle_year: e.target.value })} inputMode="numeric" placeholder="2016" />
          </div>
          <div>
            <div className="mb-1 text-sm font-medium text-slate-700">KM</div>
            <Input value={f.vehicle_kms} onChange={(e) => setF({ ...f, vehicle_kms: e.target.value })} inputMode="numeric" placeholder="98000" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <div className="mb-1 text-sm font-medium text-slate-700">Monto cuota *</div>
            <Input value={f.installment_amount} onChange={(e) => setF({ ...f, installment_amount: e.target.value })} inputMode="numeric" placeholder="165000" />
          </div>
          <div>
            <div className="mb-1 text-sm font-medium text-slate-700">Cantidad cuotas *</div>
            <Input value={f.installment_count} onChange={(e) => setF({ ...f, installment_count: e.target.value })} inputMode="numeric" placeholder="36" />
          </div>
        </div>

        <div>
          <div className="mb-1 text-sm font-medium text-slate-700">Inicio (fecha) *</div>
          <Input type="date" value={f.start_date} onChange={(e) => setF({ ...f, start_date: e.target.value })} />
        </div>

        {err ? <div className="text-sm text-rose-600">{err}</div> : null}

        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" type="button" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button className="flex-1" type="submit" disabled={!canSave || saving}>
            {saving ? "Guardando..." : isEdit ? "Guardar" : "Crear"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
