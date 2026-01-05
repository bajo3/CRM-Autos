"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/AuthProvider";

type VehicleStatus = "draft" | "incoming" | "preparing" | "published" | "reserved" | "sold";

export function NewVehicleModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { role } = useAuth();
  const isAdmin = role === "admin" || role === "manager";

  const [title, setTitle] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [version, setVersion] = useState("");
  const [year, setYear] = useState("");
  const [km, setKm] = useState("");
  const [price, setPrice] = useState("");

  // sellers: siempre draft (pendiente). admins: pueden elegir.
  const [status, setStatus] = useState<VehicleStatus>("draft");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const canSave = useMemo(() => {
    return title.trim().length > 0;
  }, [title]);

  function reset() {
    setTitle("");
    setBrand("");
    setModel("");
    setVersion("");
    setYear("");
    setKm("");
    setPrice("");
    setStatus("draft");
    setMsg(null);
  }

  async function save() {
    setMsg(null);
    setLoading(true);
    try {
      const y = year.trim() ? Number(year) : null;
      const k = km.trim() ? Number(km) : null;

      // Precio: solo admin/manager (y backend también lo blinda)
      const p = isAdmin && price.trim() ? Number(price) : null;

      // Status: seller siempre draft (pendiente)
      const st: VehicleStatus = isAdmin ? status : "draft";

      const { error } = await supabase.from("vehicles").insert([
        {
          title: title.trim(),
          brand: brand.trim() || null,
          model: model.trim() || null,
          version: version.trim() || null,
          year: Number.isFinite(y as any) ? y : null,
          km: Number.isFinite(k as any) ? k : null,
          price_ars: Number.isFinite(p as any) ? p : null,
          status: st,
          source: "manual",
        },
      ]);

      if (error) throw error;

      reset();
      onClose();
      onCreated();
    } catch (e: any) {
      setMsg(e?.message ?? "No pude guardar el vehículo");
    } finally {
      setLoading(false);
    }
  }

  // cuando abre, limpia mensaje
  useEffect(() => {
    if (open) {
      setMsg(null);
      if (!isAdmin) setStatus("draft");
    }
  }, [open, isAdmin]);

  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }} title="Nuevo vehículo">
      <div className="space-y-3">
        <div>
          <div className="mb-1 text-sm font-medium text-slate-700">Título *</div>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VENTO 2015" />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <div className="mb-1 text-sm font-medium text-slate-700">Marca</div>
            <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Volkswagen" />
          </div>
          <div>
            <div className="mb-1 text-sm font-medium text-slate-700">Modelo</div>
            <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Vento" />
          </div>
        </div>

        <div>
          <div className="mb-1 text-sm font-medium text-slate-700">Versión</div>
          <Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="2.0 Trendline" />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <div className="mb-1 text-sm font-medium text-slate-700">Año</div>
            <Input value={year} onChange={(e) => setYear(e.target.value)} placeholder="2016" inputMode="numeric" />
          </div>
          <div>
            <div className="mb-1 text-sm font-medium text-slate-700">KM</div>
            <Input value={km} onChange={(e) => setKm(e.target.value)} placeholder="98000" inputMode="numeric" />
          </div>

          <div>
            <div className="mb-1 text-sm font-medium text-slate-700">Precio (ARS)</div>
            <Input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder={isAdmin ? "12800000" : "Solo admin"}
              inputMode="numeric"
              disabled={!isAdmin}
            />
            {!isAdmin ? <div className="mt-1 text-xs text-slate-500">Queda pendiente y el precio lo carga el admin.</div> : null}
          </div>
        </div>

        <div>
          <div className="mb-1 text-sm font-medium text-slate-700">Estado</div>
          {isAdmin ? (
            <Select value={status} onChange={(e) => setStatus(e.target.value as VehicleStatus)}>
              <option value="draft">Pendiente</option>
              <option value="incoming">Ingreso</option>
              <option value="preparing">Preparación</option>
              <option value="published">Disponible</option>
              <option value="reserved">Reservado</option>
              <option value="sold">Vendido</option>
            </Select>
          ) : (
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              Pendiente de verificación (draft)
            </div>
          )}
        </div>

        {msg ? <div className="text-sm text-rose-600">{msg}</div> : null}

        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={() => { reset(); onClose(); }} disabled={loading}>
            Cancelar
          </Button>
          <Button className="flex-1" onClick={save} disabled={!canSave || loading}>
            {loading ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
