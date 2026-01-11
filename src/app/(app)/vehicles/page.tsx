"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { cn } from "@/lib/utils";
import { Topbar } from "@/components/app-shell/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Plus, RefreshCw } from "lucide-react";
import { NewVehicleModal } from "@/features/vehicles/new-vehicle-modal";
import { useAuth } from "@/features/auth/AuthProvider";
import { Modal } from "@/components/ui/modal";
import { logCrmEvent } from "@/features/events/events.api";

type VehicleStatus = "draft" | "incoming" | "preparing" | "published" | "reserved" | "sold";

type VehicleRow = {
  id: string;
  title: string;
  brand: string | null;
  model: string | null;
  version: string | null;
  year: number | null;
  km: number | null;
  price_ars: number | null;
  status: VehicleStatus;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

const STATUS_LABEL: Record<VehicleStatus, string> = {
  draft: "Pendiente",
  incoming: "Por ingresar",
  preparing: "En preparación",
  published: "Disponible",
  reserved: "Reservado",
  sold: "Vendido",
};

function statusBadge(status: VehicleStatus) {
  const label = STATUS_LABEL[status];
  if (status === "published") return <Badge variant="success">🟢 {label}</Badge>;
  if (status === "reserved") return <Badge variant="warning">🟡 {label}</Badge>;
  if (status === "sold") return <Badge variant="danger">🔴 {label}</Badge>;

  // estados operativos
  if (status === "incoming") return <Badge variant="outline">🔵 {label}</Badge>;
  if (status === "preparing") return <Badge variant="secondary">🟠 {label}</Badge>;
  return <Badge variant="muted">⚪ {label}</Badge>;
}

type Tab = "all" | VehicleStatus;

export default function VehiclesPage() {
  const { role, userId } = useAuth();
  const isAdmin = role === "admin" || role === "manager";

  const [openNew, setOpenNew] = useState(false);

  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [brand, setBrand] = useState("");
  const [yearMin, setYearMin] = useState("");
  const [yearMax, setYearMax] = useState("");

  const [order, setOrder] = useState<"updated_desc" | "price_desc" | "price_asc" | "year_desc" | "year_asc">(
    "updated_desc"
  );

  const [items, setItems] = useState<VehicleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  // created_by -> full_name
  const [nameByUserId, setNameByUserId] = useState<Record<string, string>>({});

  // Edit price modal
  const [priceModal, setPriceModal] = useState<{ open: boolean; id: string | null; price: string }>({
    open: false,
    id: null,
    price: "",
  });

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length, draft: 0, published: 0, reserved: 0, sold: 0 };
    for (const v of items) c[v.status] = (c[v.status] ?? 0) + 1;
    return c as Record<"all" | VehicleStatus, number>;
  }, [items]);

  async function load() {
    setLoading(true);
    setMsg(null);
    try {
      let q = supabase
        .from("vehicles")
        .select(
          "id,title,brand,model,version,year,km,price_ars,status,created_at,updated_at,created_by"
        )
        .limit(200);

      if (tab !== "all") q = q.eq("status", tab);

      const s = search.trim();
      if (s) {
        const esc = s.replace(/,/g, "");
        q = q.or(
          `title.ilike.%${esc}%,brand.ilike.%${esc}%,model.ilike.%${esc}%,version.ilike.%${esc}%`
        );
      }

      if (brand.trim()) q = q.ilike("brand", `%${brand.trim()}%`);

      const ymn = yearMin.trim() ? Number(yearMin) : null;
      const ymx = yearMax.trim() ? Number(yearMax) : null;
      if (Number.isFinite(ymn as any)) q = q.gte("year", ymn as number);
      if (Number.isFinite(ymx as any)) q = q.lte("year", ymx as number);

      if (order === "updated_desc") q = q.order("updated_at", { ascending: false });
      if (order === "price_desc") q = q.order("price_ars", { ascending: false, nullsFirst: false });
      if (order === "price_asc") q = q.order("price_ars", { ascending: true, nullsFirst: false });
      if (order === "year_desc") q = q.order("year", { ascending: false, nullsFirst: false });
      if (order === "year_asc") q = q.order("year", { ascending: true, nullsFirst: false });

      const { data, error } = await q;
      if (error) throw error;

      const rows = (data ?? []) as any as VehicleRow[];
      setItems(rows);

      // resolve created_by names (best-effort)
      const ids = Array.from(new Set(rows.map((r) => r.created_by).filter(Boolean))) as string[];
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("user_id, full_name").in("user_id", ids);
        const map: Record<string, string> = {};
        for (const p of profs ?? []) {
          if (p.user_id) map[p.user_id] = p.full_name ?? p.user_id;
        }
        setNameByUserId(map);
      } else {
        setNameByUserId({});
      }
    } catch (e: any) {
      setMsg(e?.message ?? "No pude cargar vehículos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, order]);

  // filtros: recarga manual (no cada tecla)
  const canApplyFilters = true;

  function canSellerChangeStatusFrom(current: VehicleStatus) {
    // seller: no puede tocar Pendiente/Ingreso/Preparación (no aprueba ni vuelve atrás)
    return current !== "draft" && current !== "incoming" && current !== "preparing";
  }

  function allowedStatusOptions(v: VehicleRow): VehicleStatus[] {
    if (isAdmin) return ["draft", "incoming", "preparing", "published", "reserved", "sold"];
    // seller: solo publicado/reservado/vendido
    return ["published", "reserved", "sold"];
  }

  async function updateStatus(id: string, next: VehicleStatus) {
    setMsg(null);
    // optimista: actualiza UI y revierte si falla
    const prev = items;
    setItems((cur) => cur.map((v) => (v.id === id ? { ...v, status: next } : v)));
    const { error } = await supabase.from("vehicles").update({ status: next }).eq("id", id);
    if (error) {
      setItems(prev);
      setMsg(error.message);
    } else {
      void logCrmEvent({ entity_type: "vehicle", entity_id: id, type: "vehicle_status", payload: { status: next } });
      // refrescar para asegurarnos counts/orden
      void load();
    }
  }

  async function openEditPrice(v: VehicleRow) {
    setPriceModal({ open: true, id: v.id, price: v.price_ars ? String(v.price_ars) : "" });
  }

  async function savePrice() {
    if (!priceModal.id) return;
    const p = priceModal.price.trim() ? Number(priceModal.price) : null;
    if (p != null && !Number.isFinite(p)) {
      setMsg("Precio inválido");
      return;
    }
    setMsg(null);
    const { error } = await supabase.from("vehicles").update({ price_ars: p }).eq("id", priceModal.id);
    if (error) {
      setMsg(error.message);
      return;
    }
    void logCrmEvent({ entity_type: "vehicle", entity_id: priceModal.id, type: "vehicle_price", payload: { price_ars: p } });
    setPriceModal({ open: false, id: null, price: "" });
    void load();
  }

  return (
    <div className="p-4 space-y-4">
      <Topbar title="Vehicles" subtitle="Stock, pendientes y estados" />

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => setOpenNew(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Nuevo
        </Button>
        <Button variant="secondary" onClick={load} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Refrescar
        </Button>

        <div className="ml-auto flex w-full flex-nowrap gap-2 overflow-x-auto pb-1 md:w-auto md:overflow-visible">
          {(["all", "draft", "incoming", "preparing", "published", "reserved", "sold"] as const).map((t) => (
            <Button
              key={t}
              variant={tab === t ? "default" : "secondary"}
              onClick={() => setTab(t)}
              className="gap-2 shrink-0"
            >
              {t === "all" ? "Todos" : STATUS_LABEL[t]}
              <Badge variant="secondary">{counts[t] ?? 0}</Badge>
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <div className="md:col-span-2">
              <div className="mb-1 text-sm font-medium text-slate-700">Buscar</div>
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Título / marca / modelo" />
            </div>
            <div>
              <div className="mb-1 text-sm font-medium text-slate-700">Marca</div>
              <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Volkswagen" />
            </div>
            <div>
              <div className="mb-1 text-sm font-medium text-slate-700">Año min</div>
              <Input value={yearMin} onChange={(e) => setYearMin(e.target.value)} inputMode="numeric" />
            </div>
            <div>
              <div className="mb-1 text-sm font-medium text-slate-700">Año max</div>
              <Input value={yearMax} onChange={(e) => setYearMax(e.target.value)} inputMode="numeric" />
            </div>
            <div>
              <div className="mb-1 text-sm font-medium text-slate-700">Orden</div>
              <Select value={order} onChange={(e) => setOrder(e.target.value as any)}>
                <option value="updated_desc">Últimos actualizados</option>
                <option value="price_desc">Precio (alto→bajo)</option>
                <option value="price_asc">Precio (bajo→alto)</option>
                <option value="year_desc">Año (nuevo→viejo)</option>
                <option value="year_asc">Año (viejo→nuevo)</option>
              </Select>
            </div>
<div className="md:col-span-2 flex items-end gap-2">
              <Button variant="secondary" onClick={load} disabled={!canApplyFilters || loading}>
                Aplicar filtros
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setBrand("");
                  setYearMin("");
                  setYearMax("");
                  void load();
                }}
              >
                Limpiar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {msg ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{msg}</div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Stock</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-slate-600">Cargando…</div>
          ) : (
            <>
              {/* Desktop/tablet */}
              <div className="hidden lg:block overflow-auto">
                <Table>
                  <THead>
                    <TR>
                      <TH>Unidad</TH>
                      <TH>Año</TH>
                      <TH>KM</TH>
                      <TH>Precio</TH>
                      <TH>Estado</TH>
                      <TH>Cargado por</TH>
                      <TH className="text-right">Acciones</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {items.length === 0 ? (
                      <TR>
                        <TD colSpan={7} className="text-center text-sm text-slate-500 py-10">
                          No hay unidades para mostrar con esos filtros.
                        </TD>
                      </TR>
                    ) : null}

                    {items.map((v) => {
                      const creator = v.created_by ? nameByUserId[v.created_by] : null;
                      const sellerCanChange = !isAdmin && canSellerChangeStatusFrom(v.status);
                      const disabledStatus = !isAdmin && !sellerCanChange;
                      const options = allowedStatusOptions(v);

                      return (
                        <TR key={v.id}>
                          <TD className="min-w-[260px]">
                            <div className="font-medium">{v.title}</div>
                            <div className="text-xs text-slate-500">
                              {(v.brand ?? "—") + " " + (v.model ?? "") + (v.version ? " • " + v.version : "")}
                            </div>
                          </TD>
                          <TD>{v.year ?? "—"}</TD>
                          <TD>{v.km != null ? v.km.toLocaleString("es-AR") : "—"}</TD>
                          <TD>
                            {v.price_ars != null ? (
                              <span>
                                {new Intl.NumberFormat("es-AR", {
                                  style: "currency",
                                  currency: "ARS",
                                  maximumFractionDigits: 0,
                                }).format(v.price_ars)}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </TD>
                          <TD>
                            {disabledStatus ? (
                              <div className="flex items-center gap-2">
                                {statusBadge(v.status)}
                                <span className="text-xs text-slate-500">Solo admin/manager</span>
                              </div>
                            ) : (
                              <Select value={v.status} onChange={(e) => updateStatus(v.id, e.target.value as VehicleStatus)}>
                                {options.map((st) => (
                                  <option key={st} value={st}>
                                    {STATUS_LABEL[st]}
                                  </option>
                                ))}
                              </Select>
                            )}
                          </TD>
                          <TD className="text-sm text-slate-700">{creator ?? (v.created_by ?? "—")}</TD>
                          <TD className="text-right">
                            {isAdmin ? (
                              <Button variant="secondary" onClick={() => openEditPrice(v)}>
                                Editar precio
                              </Button>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </TD>
                        </TR>
                      );
                    })}
                  </TBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <div className="grid gap-3 lg:hidden">
                {items.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-sm font-medium text-slate-900">No hay unidades</div>
                    <div className="mt-1 text-sm text-slate-600">Probá limpiar filtros o cambiar de pestaña de estado.</div>
                  </div>
                ) : null}

                {items.map((v) => {
                  const creator = v.created_by ? nameByUserId[v.created_by] : null;
                  const sellerCanChange = !isAdmin && canSellerChangeStatusFrom(v.status);
                  const disabledStatus = !isAdmin && !sellerCanChange;
                  const options = allowedStatusOptions(v);
                  const priceLabel = v.price_ars != null
                    ? new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(v.price_ars)
                    : "—";

                  return (
                    <div key={v.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-slate-900">{v.title}</div>
                          <div className="mt-0.5 text-xs text-slate-600">
                            {(v.brand ?? "—") + " " + (v.model ?? "") + (v.version ? " • " + v.version : "")}
                          </div>
                        </div>
                        <div className="shrink-0">{statusBadge(v.status)}</div>
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                          <div className="text-slate-500">Año</div>
                          <div className="font-medium text-slate-900">{v.year ?? "—"}</div>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                          <div className="text-slate-500">KM</div>
                          <div className="font-medium text-slate-900">{v.km != null ? v.km.toLocaleString("es-AR") : "—"}</div>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                          <div className="text-slate-500">Precio</div>
                          <div className={cn("font-medium", v.price_ars != null ? "text-slate-900" : "text-slate-400")}>{priceLabel}</div>
                        </div>
                      </div>

                      <div className="mt-3 text-xs text-slate-600">
                        <span className="text-slate-500">Cargado por:</span> {creator ?? (v.created_by ?? "—")}
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {disabledStatus ? (
                          <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                            Estado: <span className="font-medium text-slate-900">{STATUS_LABEL[v.status]}</span> <span className="text-slate-400">· Solo admin/manager</span>
                          </div>
                        ) : (
                          <Select value={v.status} onChange={(e) => updateStatus(v.id, e.target.value as VehicleStatus)}>
                            {options.map((st) => (
                              <option key={st} value={st}>
                                {STATUS_LABEL[st]}
                              </option>
                            ))}
                          </Select>
                        )}

                        {isAdmin ? (
                          <Button size="sm" variant="secondary" onClick={() => openEditPrice(v)} className="ml-auto">
                            Editar precio
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <NewVehicleModal open={openNew} onClose={() => setOpenNew(false)} onCreated={load} />

      <Modal
        open={priceModal.open}
        onClose={() => setPriceModal({ open: false, id: null, price: "" })}
        title="Editar precio"
      >
        <div className="space-y-3">
          <div>
            <div className="mb-1 text-sm font-medium text-slate-700">Precio (ARS)</div>
            <Input value={priceModal.price} onChange={(e) => setPriceModal((s) => ({ ...s, price: e.target.value }))} inputMode="numeric" />
            <div className="mt-1 text-xs text-slate-500">Solo admin/manager puede modificar precio.</div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setPriceModal({ open: false, id: null, price: "" })}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={savePrice}>
              Guardar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}