"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { useAuth } from "@/features/auth/AuthProvider";
import { RequireRole } from "@/components/auth/RequireRole";
import { Topbar } from "@/components/app-shell/topbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";

type Role = "admin" | "manager" | "seller";

type ProfileRow = {
  user_id: string;
  full_name: string | null;
  phone: string | null;
  role: Role | null;
  is_active?: boolean | null;
};

function roleLabel(r: Role | null) {
  if (r === "admin") return "Admin";
  return "Seller";
}

export default function UsersPage() {
  const { session } = useAuth();
  const [rows, setRows] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function authedFetch(url: string, init: RequestInit) {
    const token = session?.access_token;
    return fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(init.headers ?? {}),
      },
    });
  }

  async function load() {
    setErr(null);
    setMsg(null);

    if (!session?.user?.id) {
      setErr("Sin sesión");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, full_name, phone, role, is_active")
      .order("full_name", { ascending: true });

    if (error) {
      setErr(error.message);
      setRows([]);
    } else {
      setRows((data ?? []) as any);
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [session?.user?.id]);

  const isAdmin = true; // esta página está protegida por <RequireRole role="admin" />

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) => {
      const hay = `${r.full_name ?? ""} ${r.phone ?? ""} ${r.role ?? ""}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [rows, q]);

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [cEmail, setCEmail] = useState("");
  const [cPassword, setCPassword] = useState("");
  const [cFullName, setCFullName] = useState("");
  const [cPhone, setCPhone] = useState("");
  const [cRole, setCRole] = useState<Role>("seller");

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<ProfileRow | null>(null);
  const [eFullName, setEFullName] = useState("");
  const [ePhone, setEPhone] = useState("");
  const [eRole, setERole] = useState<Role>("seller");
  const [eActive, setEActive] = useState(true);

  // Reset modal
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState<ProfileRow | null>(null);
  const [rManual, setRManual] = useState("");
  const [rTemp, setRTemp] = useState<string | null>(null);
  const [rLink, setRLink] = useState<string | null>(null);

  function openEdit(r: ProfileRow) {
    setEditing(r);
    setEFullName(r.full_name ?? "");
    setEPhone(r.phone ?? "");
    setERole((r.role ?? "seller") as Role);
    setEActive(r.is_active !== false);
    setEditOpen(true);
  }

  function openReset(r: ProfileRow) {
    setResetting(r);
    setRManual("");
    setRTemp(null);
    setRLink(null);
    setResetOpen(true);
  }

  async function doCreate() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const role = cRole;

      const res = await authedFetch("/api/admin/users/create", {
        method: "POST",
        body: JSON.stringify({
          email: cEmail.trim(),
          password: cPassword,
          full_name: cFullName.trim() || null,
          phone: cPhone.trim() || null,
          role,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "No se pudo crear");

      setMsg("Usuario creado.");
      setCreateOpen(false);
      setCEmail("");
      setCPassword("");
      setCFullName("");
      setCPhone("");
      setCRole("seller");
      await load();
    } catch (e: any) {
      setErr(e?.message ?? "Error");
    } finally {
      setBusy(false);
    }
  }

  async function doSaveEdit() {
    if (!editing) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const payload: any = {
        user_id: editing.user_id,
        full_name: eFullName.trim() || null,
        phone: ePhone.trim() || null,
        is_active: eActive,
      };

      if (isAdmin) payload.role = eRole; // solo admin cambia roles

      const res = await authedFetch("/api/admin/users/update", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "No se pudo guardar");

      setMsg("Usuario actualizado. El usuario deberá cerrar sesión y volver a entrar para que se apliquen permisos.");
      setEditOpen(false);
      setEditing(null);
      await load();
    } catch (e: any) {
      setErr(e?.message ?? "Error");
    } finally {
      setBusy(false);
    }
  }

  async function doDelete(user_id: string) {
    if (!isAdmin) return;

    const ok = confirm(
      "Esto elimina el usuario (Auth + profile). Sus leads quedan sin asignar.\n\n¿Confirmás?"
    );
    if (!ok) return;

    setBusy(true);
    setErr(null);
    setMsg(null);

    try {
      const res = await authedFetch(`/api/admin/users/${user_id}`, {
        method: "DELETE",
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "No se pudo eliminar");

      setMsg("Usuario eliminado.");
      await load();
    } catch (e: any) {
      setErr(e?.message ?? "Error");
    } finally {
      setBusy(false);
    }
  }


  async function resetTemp() {
    if (!resetting) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    setRTemp(null);
    setRLink(null);
    try {
      const res = await authedFetch("/api/admin/users/reset-password", {
        method: "POST",
        body: JSON.stringify({ mode: "temp", user_id: resetting.user_id, password: rManual || undefined }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "No se pudo resetear");
      setRTemp(json.temp_password ?? null);
    } catch (e: any) {
      setErr(e?.message ?? "Error");
    } finally {
      setBusy(false);
    }
  }

  async function resetRecoveryLink() {
    if (!resetting) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    setRTemp(null);
    setRLink(null);
    try {
      const res = await authedFetch("/api/admin/users/reset-password", {
        method: "POST",
        body: JSON.stringify({ mode: "recovery", user_id: resetting.user_id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "No se pudo generar link");
      setRLink(json.action_link ?? null);
    } catch (e: any) {
      setErr(e?.message ?? "Error");
    } finally {
      setBusy(false);
    }
  }

  async function copy(txt: string) {
    try {
      await navigator.clipboard.writeText(txt);
    } catch { }
  }

  return (
    <RequireRole role="admin">
    <div className="space-y-6">
      <Topbar title="Usuarios" subtitle="Crear, editar, desactivar, eliminar y resetear password" />

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Listado</CardTitle>
            <CardDescription>Los usuarios se leen desde profiles (RLS tenant).</CardDescription>
          </div>

          <div className="flex gap-2">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" className="md:w-[260px]" />
            <Button onClick={() => setCreateOpen(true)} disabled={busy}>Nuevo</Button>
          </div>
        </CardHeader>

        <CardContent>
          {err ? <div className="mb-3 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">{err}</div> : null}
          {msg ? <div className="mb-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{msg}</div> : null}

          {loading ? (
            <div className="py-10 text-center text-sm text-slate-600">Cargando…</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <THead>
                  <TR>
                    <TH>Nombre</TH>
                    <TH>Teléfono</TH>
                    <TH>Rol</TH>
                    <TH>Estado</TH>
                    <TH className="text-right">Acciones</TH>
                  </TR>
                </THead>
                <TBody>
                  {filtered.map((r) => {
                    const active = r.is_active !== false;
                    return (
                      <TR key={r.user_id}>
                        <TD>
                          <div className="font-medium text-slate-900">{r.full_name ?? "—"}</div>
                          <div className="text-xs text-slate-500">{r.user_id}</div>
                        </TD>
                        <TD>{r.phone ?? "—"}</TD>
                        <TD>{roleLabel(r.role)}</TD>
                        <TD>
                          <Badge variant={active ? "success" : "outline"}>{active ? "Activo" : "Desactivado"}</Badge>
                        </TD>
                        <TD>
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => openEdit(r)} disabled={busy}>
                              Editar
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => openReset(r)} disabled={busy}>
                              Reset
                            </Button>
                            {isAdmin ? (
                              <Button variant="destructive" size="sm" onClick={() => doDelete(r.user_id)} disabled={busy}>
                                Eliminar
                              </Button>
                            ) : null}
                          </div>
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CREATE */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Nuevo usuario">
        <div className="space-y-3">
          <Input placeholder="Email" value={cEmail} onChange={(e) => setCEmail(e.target.value)} />
          <Input placeholder="Password (mín 6)" type="password" value={cPassword} onChange={(e) => setCPassword(e.target.value)} />
          <Input placeholder="Nombre" value={cFullName} onChange={(e) => setCFullName(e.target.value)} />
          <Input placeholder="Teléfono" value={cPhone} onChange={(e) => setCPhone(e.target.value)} />

          <div>
            <div className="mb-1 text-sm font-medium text-slate-700">Rol</div>
            <Select value={cRole} onChange={(e) => setCRole(e.target.value as Role)} disabled={!isAdmin}>
              <option value="seller">seller</option>
              <option value="admin">admin</option>
            </Select>
            {!isAdmin ? <div className="mt-1 text-xs text-slate-500">Solo Admin crea usuarios.</div> : null}
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={busy}>Cancelar</Button>
            <Button onClick={doCreate} disabled={busy}>Crear</Button>
          </div>
        </div>
      </Modal>

      {/* EDIT */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Editar usuario">
        {editing ? (
          <div className="space-y-3">
            <Input placeholder="Nombre" value={eFullName} onChange={(e) => setEFullName(e.target.value)} />
            <Input placeholder="Teléfono" value={ePhone} onChange={(e) => setEPhone(e.target.value)} />

            <div>
              <div className="mb-1 text-sm font-medium text-slate-700">Rol</div>
              <Select value={isAdmin ? eRole : "seller"} onChange={(e) => setERole(e.target.value as Role)} disabled={!isAdmin}>
                <option value="seller">seller</option>
                <option value="admin">admin</option>
              </Select>
              {!isAdmin ? <div className="mt-1 text-xs text-slate-500">Solo Admin cambia roles.</div> : null}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={eActive ? "destructive" : "secondary"}
                onClick={() => setEActive((v) => !v)}
                disabled={busy}
              >
                {eActive ? "Desactivar" : "Reactivar"}
              </Button>

              <div className="flex-1" />

              <Button variant="outline" onClick={() => setEditOpen(false)} disabled={busy}>Cancelar</Button>
              <Button onClick={doSaveEdit} disabled={busy}>Guardar</Button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* RESET */}
      <Modal open={resetOpen} onClose={() => setResetOpen(false)} title="Reset password">
        {resetting ? (
          <div className="space-y-3">
            <div className="text-sm text-slate-700">
              Usuario: <span className="font-medium text-slate-900">{resetting.full_name ?? "—"}</span>
            </div>

            <Input
              placeholder="Password manual (opcional). Si vacío, genera una."
              value={rManual}
              onChange={(e) => setRManual(e.target.value)}
            />

            <div className="flex gap-2">
              <Button onClick={resetTemp} disabled={busy}>Password temporal</Button>
              <Button variant="outline" onClick={resetRecoveryLink} disabled={busy}>Link recovery</Button>
            </div>

            {rTemp ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <div className="text-xs text-slate-500">Contraseña temporal</div>
                <div className="mt-1 flex gap-2">
                  <Input value={rTemp} readOnly />
                  <Button variant="outline" onClick={() => copy(rTemp)}>Copiar</Button>
                </div>
              </div>
            ) : null}

            {rLink ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <div className="text-xs text-slate-500">Link de recuperación</div>
                <div className="mt-1 flex gap-2">
                  <Input value={rLink} readOnly />
                  <Button variant="outline" onClick={() => copy(rLink)}>Copiar</Button>
                </div>
              </div>
            ) : null}

            <div className="pt-2 flex justify-end">
              <Button variant="outline" onClick={() => setResetOpen(false)} disabled={busy}>Cerrar</Button>
            </div>
          </div>
        ) : null}
      </Modal>
      </div>
    </RequireRole>
  );
}
