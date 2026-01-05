"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { useAuth } from "@/features/auth/AuthProvider";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export type VehicleStatus = "draft" | "published" | "reserved" | "sold";

export type VehicleRow = {
  id: string;
  title: string;
  brand: string | null;
  model: string | null;
  version: string | null;
  year: number | null;
  km: number | null;
  price_ars: number | null;
  color: string | null;
  transmission: string | null;
  plate: string | null;
  vin: string | null;
  status: VehicleStatus;
  created_by: string | null;
};

export function EditVehicleModal({
  open,
  onClose,
  vehicle,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  vehicle: VehicleRow | null;
  onSaved: () => void;
}) {
  const { role, userId } = useAuth();
  const isAdmin = role === "admin" || role === "manager";

  const [title, setTitle] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [version, setVersion] = useState("");
  const [year, setYear] = useState<string>("");
  const [km, setKm] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [color, setColor] = useState("");
  const [transmission, setTransmission] = useState("");
  const [plate, setPlate] = useState("");
  const [vin, setVin] = useState("");
  const [status, setStatus] = useState<VehicleStatus>("draft");

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const canEditDraft = isAdmin || (vehicle?.created_by && userId && vehicle.created_by === userId);
  const canEdit = useMemo(() => {
    if (!vehicle) return false;
    if (vehicle.status === "draft") return !!canEditDraft;
    return true; // published/reserved/sold: cualquiera del dealership puede editar básicos
  }, [vehicle, canEditDraft]);

  const canChangeStatus = useMemo(() => {
    if (!vehicle) return false;
    if (vehicle.status === "draft") return isAdmin;
    return true; // no-draft: cualquiera puede cambiar entre published/reserved/sold
  }, [vehicle, isAdmin]);

  const statusOptions = useMemo(() => {
    if (!vehicle) return [] as VehicleStatus[];
    if (isAdmin) return ["draft", "published", "reserved", "sold"];
    // seller
    if (vehicle.status === "draft") return ["draft"];
    return ["published", "reserved", "sold"];
  }, [vehicle, isAdmin]);

  function syncFromVehicle(v: VehicleRow | null) {
    setTitle(v?.title ?? "");
    setBrand(v?.brand ?? "");
    setModel(v?.model ?? "");
    setVersion(v?.version ?? "");
    setYear(v?.year ? String(v.year) : "");
    setKm(v?.km ? String(v.km) : "");
    setPrice(v?.price_ars ? String(v.price_ars) : "");
    setColor(v?.color ?? "");
    setTransmission(v?.transmission ?? "");
    setPlate(v?.plate ?? "");
    setVin(v?.vin ?? "");
    setStatus(v?.status ?? "draft");
    setMsg(null);
  }

  // Cuando abre o cambia vehicle
  useEffect(() => {
    if (open) syncFromVehicle(vehicle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, vehicle?.id]);

  const currentYear = new Date().getFullYear();

  function validate(): string | null {
    const t = title.trim();
    if (t.length < 3) return "El título debe tener al menos 3 caracteres.";

    const yearNum = year.trim() ? Number(year) : null;
    if (yearNum !== null) {
      if (!Number.isFinite(yearNum) || !Number.isInteger(yearNum)) return "Año inválido.";
      if (yearNum < 1950 || yearNum > currentYear + 1) return "Año fuera de rango.";
    }

    const kmNum = km.trim() ? Number(km) : null;
    if (kmNum !== null) {
      if (!Number.isFinite(kmNum) || kmNum < 0) return "KM inválidos.";
    }

    const priceNum = price.trim() ? Number(price) : null;
    if (priceNum !== null) {
      if (!Number.isFinite(priceNum) || priceNum < 0) return "Precio inválido.";
    }

    return null;
  }

  async function save() {
    if (!vehicle || busy) return;
    setMsg(null);

    if (!canEdit) {
      setMsg("No tenés permisos para editar este vehículo.");
      return;
    }

    const vErr = validate();
    if (vErr) {
      setMsg(vErr);
      return;
    }

    setBusy(true);

    const patch: any = {
      title: title.trim(),
      brand: brand.trim() || null,
      model: model.trim() || null,
      version: version.trim() || null,
      year: year.trim() ? Number(year) : null,
      km: km.trim() ? Number(km) : null,
      color: color.trim() || null,
      transmission: transmission.trim() || null,
      plate: plate.trim() || null,
      vin: vin.trim() || null,
    };

    if (isAdmin) {
      patch.price_ars = price.trim() ? Number(price) : null;
    }

    if (canChangeStatus) {
      patch.status = status;
    }

    const { error } = await supabase.from("vehicles").update(patch).eq("id", vehicle.id);

    setBusy(false);

    if (error) {
      setMsg(error.message);
      return;
    }

    onClose();
    onSaved();
  }

  const titleLabel = vehicle?.status === "draft" ? "Editar (Pendiente)" : "Editar vehículo";

  return (
    <Modal open={open} onClose={onClose} title={titleLabel}>
      {!vehicle ? null : (
        <div className="space-y-3">
          {!canEdit ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Este vehículo está en <b>Pendiente</b> y solo lo puede editar el creador o un admin/manager.
            </div>
          ) : null}

          <div>
            <div className="mb-1 text-sm font-medium text-slate-700">Título *</div>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} disabled={!canEdit || busy} />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 text-sm font-medium text-slate-700">Marca</div>
              <Input value={brand} onChange={(e) => setBrand(e.target.value)} disabled={!canEdit || busy} />
            </div>
            <div>
              <div className="mb-1 text-sm font-medium text-slate-700">Modelo</div>
              <Input value={model} onChange={(e) => setModel(e.target.value)} disabled={!canEdit || busy} />
            </div>
          </div>

          <div>
            <div className="mb-1 text-sm font-medium text-slate-700">Versión</div>
            <Input value={version} onChange={(e) => setVersion(e.target.value)} disabled={!canEdit || busy} />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <div className="mb-1 text-sm font-medium text-slate-700">Año</div>
              <Input value={year} onChange={(e) => setYear(e.target.value)} inputMode="numeric" disabled={!canEdit || busy} />
            </div>
            <div>
              <div className="mb-1 text-sm font-medium text-slate-700">KM</div>
              <Input value={km} onChange={(e) => setKm(e.target.value)} inputMode="numeric" disabled={!canEdit || busy} />
            </div>
            <div>
              <div className="mb-1 text-sm font-medium text-slate-700">Precio (ARS)</div>
              <Input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                inputMode="numeric"
                disabled={!isAdmin || busy}
                placeholder={!isAdmin ? "Solo admin/manager" : ""}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 text-sm font-medium text-slate-700">Color</div>
              <Input value={color} onChange={(e) => setColor(e.target.value)} disabled={!canEdit || busy} />
            </div>
            <div>
              <div className="mb-1 text-sm font-medium text-slate-700">Caja</div>
              <Input value={transmission} onChange={(e) => setTransmission(e.target.value)} disabled={!canEdit || busy} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 text-sm font-medium text-slate-700">Patente</div>
              <Input value={plate} onChange={(e) => setPlate(e.target.value)} disabled={!canEdit || busy} />
            </div>
            <div>
              <div className="mb-1 text-sm font-medium text-slate-700">VIN</div>
              <Input value={vin} onChange={(e) => setVin(e.target.value)} disabled={!canEdit || busy} />
            </div>
          </div>

          <div>
            <div className="mb-1 text-sm font-medium text-slate-700">Estado</div>
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value as VehicleStatus)}
              disabled={!canChangeStatus || busy}
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s === "draft" ? "Por ingresar (Pendiente)" : s === "published" ? "Disponible" : s === "reserved" ? "Reservado" : "Vendido"}
                </option>
              ))}
            </Select>
            {!canChangeStatus ? (
              <div className="mt-1 text-xs text-slate-500">
                {vehicle.status === "draft" ? "Solo admin/manager puede aprobar." : ""}
              </div>
            ) : null}
          </div>

          {msg ? <div className="text-sm text-rose-600">{msg}</div> : null}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={busy}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={save} disabled={busy || !canEdit}>
              {busy ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
