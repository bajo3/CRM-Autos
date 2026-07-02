"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { crearPresupuesto, type FormState } from "@/app/(app)/presupuestos/actions";
import { FORMAS_PAGO, calcularSaldo } from "@/app/(app)/presupuestos/lib";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea, Label } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { formatARS } from "@/lib/format";

type Opt = { id: string; label: string };

function SubmitButton() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? "Guardando…" : "Crear presupuesto"}</Button>;
}

export function PresupuestoForm({
  clientes, vehiculos, clienteId, vehiculoId,
}: {
  clientes: Opt[]; vehiculos: Opt[]; clienteId?: string; vehiculoId?: string;
}) {
  const [state, action] = useFormState<FormState, FormData>(crearPresupuesto, {});
  const [precio, setPrecio] = useState(0);
  const [anticipo, setAnticipo] = useState(0);
  const [bonificacion, setBonificacion] = useState(0);
  const saldo = calcularSaldo(precio, anticipo, bonificacion);

  return (
    <form action={action} className="grid gap-4">
      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="cliente_id">Cliente</Label>
          <Select id="cliente_id" name="cliente_id" defaultValue={clienteId ?? ""}>
            <option value="">— Sin cliente —</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </Select>
        </div>
        <div>
          <Label htmlFor="vehiculo_id">Vehículo</Label>
          <Select id="vehiculo_id" name="vehiculo_id" defaultValue={vehiculoId ?? ""}>
            <option value="">— Sin vehículo —</option>
            {vehiculos.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="precio">Precio *</Label>
          <MoneyInput id="precio" name="precio" required onValueChange={setPrecio} />
        </div>
        <div>
          <Label htmlFor="bonificacion">Bonificación</Label>
          <MoneyInput id="bonificacion" name="bonificacion" onValueChange={setBonificacion} />
        </div>
        <div>
          <Label htmlFor="anticipo">Anticipo</Label>
          <MoneyInput id="anticipo" name="anticipo" onValueChange={setAnticipo} />
        </div>
      </div>

      <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
        Saldo a financiar: <span className="font-semibold">{formatARS(saldo)}</span>
        <span className="text-muted-foreground"> (precio − bonificación − anticipo)</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="cantidad_cuotas">Cantidad de cuotas</Label>
          <Input id="cantidad_cuotas" name="cantidad_cuotas" type="number" min="0" step="1" placeholder="0" />
        </div>
        <div>
          <Label htmlFor="valor_cuota">Valor de cuota</Label>
          <MoneyInput id="valor_cuota" name="valor_cuota" />
        </div>
        <div>
          <Label htmlFor="gastos">Gastos</Label>
          <MoneyInput id="gastos" name="gastos" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="forma_pago">Forma de pago</Label>
          <Select id="forma_pago" name="forma_pago" defaultValue="">
            <option value="">— Sin especificar —</option>
            {FORMAS_PAGO.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </Select>
        </div>
        <div>
          <Label htmlFor="validez">Válido hasta</Label>
          <Input id="validez" name="validez" type="date" />
        </div>
        <div>
          <Label htmlFor="financiacion">Financiación (detalle)</Label>
          <Input id="financiacion" name="financiacion" placeholder="Ej.: 12 cuotas s/interés con prenda" />
        </div>
        <div>
          <Label htmlFor="permuta">Permuta</Label>
          <Input id="permuta" name="permuta" placeholder="Ej.: toma usado Gol Trend 2015" />
        </div>
      </div>

      <div>
        <Label htmlFor="observaciones">Observaciones</Label>
        <Textarea id="observaciones" name="observaciones" placeholder="Condiciones, aclaraciones, beneficios incluidos…" />
      </div>

      <div className="flex items-center gap-2">
        <SubmitButton />
        <a href="/presupuestos" className="text-sm text-muted-foreground hover:underline">Cancelar</a>
      </div>
    </form>
  );
}
