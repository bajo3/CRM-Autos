"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import type { FormState } from "@/app/(app)/tasaciones/actions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, Textarea, Label } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { formatARS } from "@/lib/format";

type Option = { id: string; label: string };

function Submit() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? "Guardando…" : "Registrar tasación"}</Button>;
}

export function TasacionForm({
  action, clientes, clienteId,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  clientes: Option[]; clienteId?: string;
}) {
  const [state, formAction] = useFormState<FormState, FormData>(action, {});
  const [compra, setCompra] = useState(0);
  const [venta, setVenta] = useState(0);
  const [gastos, setGastos] = useState(0);
  const margen = venta - compra - gastos;

  return (
    <form action={formAction}>
      <Card>
        <CardContent className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
          <div>
            <Label htmlFor="cliente_id">Cliente</Label>
            <Select id="cliente_id" name="cliente_id" defaultValue={clienteId ?? ""}>
              <option value="">— Elegir —</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="descripcion">Vehículo a tasar</Label>
            <Textarea id="descripcion" name="descripcion" required placeholder="Ej.: VW Gol Trend 2017, 1.6, 90.000 km, buen estado" />
          </div>
          <div>
            <Label htmlFor="precio_compra_estimado">Precio de compra estimado</Label>
            <MoneyInput id="precio_compra_estimado" name="precio_compra_estimado" onValueChange={setCompra} />
          </div>
          <div>
            <Label htmlFor="precio_venta_estimado">Precio de venta estimado</Label>
            <MoneyInput id="precio_venta_estimado" name="precio_venta_estimado" onValueChange={setVenta} />
          </div>
          <div>
            <Label htmlFor="gastos_estimados">Gastos estimados</Label>
            <MoneyInput id="gastos_estimados" name="gastos_estimados" onValueChange={setGastos} />
          </div>
          <div className="flex items-end">
            <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
              Margen estimado: <span className="font-semibold">{formatARS(margen)}</span>
            </div>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="observaciones">Observaciones</Label>
            <Textarea id="observaciones" name="observaciones" placeholder="Detalles adicionales, documentación, etc." />
          </div>

          {state.error && <p className="sm:col-span-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}

          <div className="sm:col-span-2 flex justify-end gap-2">
            <Link href="/tasaciones"><Button type="button" variant="outline">Cancelar</Button></Link>
            <Submit />
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
