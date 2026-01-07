"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Route } from "next";
import { ArrowLeft, RefreshCcw, Pencil } from "lucide-react";

import { supabase } from "@/lib/supabaseBrowser";
import { Topbar } from "@/components/app-shell/topbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { ui } from "@/lib/ui";

import { EditVehicleModal, type VehicleRow, type VehicleStatus } from "@/features/vehicles/edit-vehicle-modal";
import { useAuth } from "@/features/auth/AuthProvider";
import { useAssignees } from "@/features/leads/useAssignees";
import { TaskFormModal } from "@/features/tasks/components/TaskFormModal";
import type { TaskPriority } from "@/features/tasks/tasks.types";

type VehicleEventRow = {
  id: string;
  event_type: string;
  actor_user_id: string | null;
  payload: any;
  created_at: string;
};

function statusBadge(status: VehicleStatus) {
  if (status === "published") return <Badge variant="success">Disponible</Badge>;
  if (status === "reserved") return <Badge variant="warning">Reservado</Badge>;
  if (status === "sold") return <Badge variant="danger">Vendido</Badge>;
  return <Badge variant="outline">Pendiente</Badge>;
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(d);
}

function formatArs(v: number | null) {
  if (v === null || v === undefined) return "—";
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(v);
}

export default function VehicleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String((params as any)?.id ?? "");

  const { role, userId } = useAuth();
  const isAdmin = role === "admin" || role === "manager";

  const { assignees } = useAssignees();

  const [vehicle, setVehicle] = useState<VehicleRow | null>(null);
  const [events, setEvents] = useState<VehicleEventRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);

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
      const { data: v, error: vErr } = await supabase
        .from("vehicles")
        .select("id,title,brand,model,version,year,km,price_ars,color,transmission,plate,vin,status,created_by,created_at,updated_at")
        .eq("id", id)
        .maybeSingle();
      if (vErr) throw vErr;
      if (!v) {
        setVehicle(null);
        setEvents([]);
        setLoading(false);
        return;
      }
      setVehicle(v as any);

      const { data: ev, error: eErr } = await supabase
        .from("vehicle_events")
        .select("id,event_type,actor_user_id,payload,created_at")
        .eq("vehicle_id", id)
        .order("created_at", { ascending: false })
        .range(0, 99);
      if (eErr) throw eErr;
      const rows = (ev ?? []) as any[];
      setEvents(rows as any);

      // map actor names
      const actorIds = Array.from(new Set(rows.map((r) => r.actor_user_id).filter(Boolean))) as string[];
      if (actorIds.length) {
        const { data: p, error: pErr } = await supabase.from("profiles").select("user_id, full_name").in("user_id", actorIds);
        if (!pErr && p) {
          const map: Record<string, string> = {};
          for (const x of p as any[]) map[x.user_id] = x.full_name ?? x.user_id.slice(0, 8);
          setProfiles(map);
        }
      }
    } catch (e: any) {
      setErr(e?.message ?? "No se pudo cargar el vehículo");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const canPublish = useMemo(() => {
    if (!vehicle) return false;
    return isAdmin && vehicle.status === "draft";
  }, [vehicle, isAdmin]);

  async function setStatus(next: VehicleStatus) {
    if (!vehicle) return;
    const { error } = await supabase.from("vehicles").update({ status: next }).eq("id", vehicle.id);
    if (error) {
      setErr(error.message);
      return;
    }
    await load();
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Topbar title="Vehículo" subtitle="Cargando…" />
        <Card>
          <CardContent className="py-10 text-center text-sm text-slate-600">Cargando…</CardContent>
        </Card>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="space-y-4">
        <Topbar title="Vehículo" subtitle="No encontrado" />
        <Card>
          <CardContent className="py-10 text-center text-sm text-slate-600">
            No existe o no tenés acceso.
            <div className="mt-4">
              <Button variant="outline" onClick={() => router.replace(("/vehicles" as unknown) as Route)}>Volver</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Topbar title="Vehículo" subtitle="Detalle + historial" />

      <div className="mx-auto w-full max-w-6xl p-3 sm:p-6 bg-white text-slate-900">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          <Button variant="outline" onClick={() => load()}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
          <Button onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const now = new Date();
              const y = now.getFullYear();
              const m = String(now.getMonth() + 1).padStart(2, "0");
              const d = String(now.getDate()).padStart(2, "0");
              setTaskPrefill({
                title: `Seguimiento: ${vehicle.title}`,
                description: null,
                priority: "medium",
                dueDate: `${y}-${m}-${d}`,
                assignedTo: "team",
                entity_type: "vehicle",
                entity_id: vehicle.id,
              });
              setTaskOpen(true);
            }}
          >
            + Tarea
          </Button>
          {canPublish ? (
            <button className={ui.button("primary")} onClick={() => setStatus("published")}>
              Aprobar y publicar
            </button>
          ) : null}
        </div>

        {err ? <div className="mb-3 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">{err}</div> : null}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {vehicle.title} {statusBadge(vehicle.status)}
            </CardTitle>
            <CardDescription>
              Actualizado: {fmtDate((vehicle as any).updated_at ?? null)} · Creado: {fmtDate((vehicle as any).created_at ?? null)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <div>
                <div className="text-xs text-slate-500">Marca</div>
                <div className="text-sm text-slate-900">{vehicle.brand ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Modelo</div>
                <div className="text-sm text-slate-900">{vehicle.model ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Versión</div>
                <div className="text-sm text-slate-900">{vehicle.version ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Precio</div>
                <div className="text-sm text-slate-900">{formatArs(vehicle.price_ars)}</div>
              </div>

              <div>
                <div className="text-xs text-slate-500">Año</div>
                <div className="text-sm text-slate-900">{vehicle.year ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">KM</div>
                <div className="text-sm text-slate-900">{vehicle.km ? vehicle.km.toLocaleString("es-AR") : "—"}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Color</div>
                <div className="text-sm text-slate-900">{vehicle.color ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Caja</div>
                <div className="text-sm text-slate-900">{vehicle.transmission ?? "—"}</div>
              </div>

              <div>
                <div className="text-xs text-slate-500">Patente</div>
                <div className="text-sm text-slate-900">{vehicle.plate ?? "—"}</div>
              </div>
              <div className="sm:col-span-2">
                <div className="text-xs text-slate-500">VIN</div>
                <div className="text-sm text-slate-900 break-all">{vehicle.vin ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Estado</div>
                <div className="mt-1">
                  <select
                    className={ui.select("rounded-2xl")}
                    value={vehicle.status}
                    onChange={(e) => setStatus(e.target.value as VehicleStatus)}
                    disabled={!isAdmin && vehicle.status === "draft"}
                  >
                    {(isAdmin ? ["draft", "published", "reserved", "sold"] : vehicle.status === "draft" ? ["draft"] : ["published", "reserved", "sold"]).map(
                      (s) => (
                        <option key={s} value={s}>
                          {s === "draft" ? "Por ingresar (Pendiente)" : s === "published" ? "Disponible" : s === "reserved" ? "Reservado" : "Vendido"}
                        </option>
                      )
                    )}
                  </select>
                  {!isAdmin && vehicle.status === "draft" ? (
                    <div className="mt-1 text-xs text-slate-500">Pendiente de verificación: solo admin/manager puede aprobar.</div>
                  ) : null}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6">
          <div className="mb-2 text-sm font-semibold text-slate-900">Historial</div>
          <div className={ui.card("overflow-x-auto")}
          >
            <Table>
              <THead>
                <TR>
                  <TH>Fecha</TH>
                  <TH>Tipo</TH>
                  <TH>Actor</TH>
                  <TH>Detalle</TH>
                </TR>
              </THead>
              <TBody>
                {events.length ? (
                  events.map((e) => (
                    <TR key={e.id}>
                      <TD className="text-sm text-slate-700">{fmtDate(e.created_at)}</TD>
                      <TD className="text-sm text-slate-900">{e.event_type}</TD>
                      <TD className="text-sm text-slate-700">
                        {e.actor_user_id ? profiles[e.actor_user_id] ?? e.actor_user_id.slice(0, 8) : "—"}
                      </TD>
                      <TD className="text-xs text-slate-700">
                        <pre className="whitespace-pre-wrap break-words">{JSON.stringify(e.payload ?? {}, null, 2)}</pre>
                      </TD>
                    </TR>
                  ))
                ) : (
                  <TR>
                    <TD colSpan={4}>
                      <div className="p-4 text-sm text-slate-500">Sin eventos.</div>
                    </TD>
                  </TR>
                )}
              </TBody>
            </Table>
          </div>
        </div>
      </div>

      <EditVehicleModal open={editOpen} onClose={() => setEditOpen(false)} vehicle={vehicle} onSaved={load} />

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
