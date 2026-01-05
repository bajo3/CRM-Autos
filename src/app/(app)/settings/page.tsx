"use client";

import { useEffect, useMemo, useState } from "react";
import { Topbar } from "@/components/app-shell/topbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/auth/logout-button";
import Link from "next/link";
import type { Route } from "next";
import { useDealership } from "@/features/dealership/useDealership";

const currencyOptions = [
  { value: "ARS", label: "ARS" },
  { value: "USD", label: "USD" },
];

export default function SettingsPage() {
  const { row, loading, saving, error, save, canEdit, reload } = useDealership();

  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [currency, setCurrency] = useState("ARS");
  const [logoUrl, setLogoUrl] = useState("");

  const dirty = useMemo(() => {
    if (!row) return false;
    return (
      name !== (row.name ?? "") ||
      city !== (row.city ?? "") ||
      currency !== (row.currency ?? "ARS") ||
      logoUrl !== (row.logo_url ?? "")
    );
  }, [row, name, city, currency, logoUrl]);

  useEffect(() => {
    if (!row) return;
    setName(row.name ?? "");
    setCity(row.city ?? "");
    setCurrency(row.currency ?? "ARS");
    setLogoUrl(row.logo_url ?? "");
  }, [row]); // solo cuando cambia de agencia

  async function onSave() {
    if (!row) return;
    await save({
      name: name.trim() || row.name,
      city: city.trim() || null,
      currency,
      logo_url: logoUrl.trim() || null,
    });
  }

  return (
    <div className="space-y-6">
      <Topbar title="Ajustes" subtitle="Configuración de la agencia" />

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Agencia</CardTitle>
            <CardDescription>Datos generales</CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            <div>
              <div className="mb-1 text-xs font-medium text-slate-700">Nombre</div>
              <Input value={name} onChange={(e) => setName(e.target.value)} disabled={!canEdit || loading || saving} />
            </div>

            <div>
              <div className="mb-1 text-xs font-medium text-slate-700">Ciudad</div>
              <Input value={city} onChange={(e) => setCity(e.target.value)} disabled={!canEdit || loading || saving} />
            </div>

            <div>
              <div className="mb-1 text-xs font-medium text-slate-700">Moneda</div>
              <Select value={currency} onChange={(e) => setCurrency(e.target.value)} disabled={!canEdit || loading || saving}>
                {currencyOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <div className="mb-1 text-xs font-medium text-slate-700">Logo (URL)</div>
              <Input
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://…"
                disabled={!canEdit || loading || saving}
              />
              {!canEdit ? (
                <div className="mt-1 text-xs text-slate-500">Solo Admin puede modificar estos datos.</div>
              ) : null}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button onClick={onSave} disabled={!canEdit || loading || saving || !dirty}>
                {saving ? "Guardando…" : "Guardar"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => reload()}
                disabled={loading || saving}
              >
                Recargar
              </Button>

              {dirty ? <span className="text-xs text-slate-500">Cambios sin guardar</span> : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usuarios</CardTitle>
            <CardDescription>Roles y accesos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-600">
              Administrá vendedores, reseteo de contraseña y activación.
            </p>
            <Link
              href={("/settings/users" as unknown) as Route}
              className="inline-flex rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Abrir usuarios
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="pt-4">
        <LogoutButton />
      </div>
    </div>
  );
}
