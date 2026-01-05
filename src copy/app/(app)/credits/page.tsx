"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Topbar } from "@/components/app-shell/topbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

import type { CreditRow, CreditStatus } from "@/features/credits/credits.types";
import { closeCredit, createCredit, updateCredit } from "@/features/credits/credits.api";
import { useCredits } from "@/features/credits/useCredits";
import { CreditFormModal } from "@/features/credits/components/CreditFormModal";
import { CreditsTable } from "@/features/credits/components/CreditsTable";

export default function CreditsPage() {
  const { items, loading, error, refresh, filters, setSearch, setStatus, page, hasMore, loadMore } = useCredits();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CreditRow | null>(null);

  return (
    <div className="space-y-6">
      <Topbar title="Créditos" subtitle="Seguimiento de cuotas y vencimientos" />

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Listado</CardTitle>
            <CardDescription>Admin ve todo • Seller ve lo que creó (por RLS)</CardDescription>
          </div>

          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nuevo crédito
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <Input
              value={filters.search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por cliente, teléfono o vehículo…"
            />
            <Select
              value={filters.status}
              onChange={(e) => setStatus(e.target.value as CreditStatus | "all")}
              className="md:w-[200px]"
            >
              <option value="all">Todos</option>
              <option value="active">Activos</option>
              <option value="closed">Cerrados</option>
            </Select>
          </div>

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">{error}</div>
          ) : null}

          <CreditsTable
            items={items}
            loading={loading}
            onEdit={(c) => {
              setEditing(c);
              setOpen(true);
            }}
            onClose={async (id) => {
              await closeCredit(id);
              await refresh();
            }}
          />

          <div className="mt-3 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Mostrando {items.length} (página {page + 1})
            </div>
            {hasMore ? (
              <Button onClick={() => loadMore()} disabled={loading} variant="secondary">
                {loading ? "Cargando…" : "Cargar más"}
              </Button>
            ) : (
              <div className="text-xs text-slate-500">No hay más resultados</div>
            )}
          </div>
        </CardContent>
      </Card>

      <CreditFormModal
        open={open}
        onClose={() => setOpen(false)}
        initial={editing}
        onSubmit={async (payload) => {
          if (editing) {
            await updateCredit(editing.id, payload as any);
          } else {
            await createCredit(payload as any);
          }
          setOpen(false);
          await refresh();
        }}
      />
    </div>
  );
}
