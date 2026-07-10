"use client";

import { useCallback, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { crearPresupuesto, type FormState } from "@/app/(app)/presupuestos/actions";
import { FORMAS_PAGO, calcularSaldo } from "@/app/(app)/presupuestos/lib";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input, Select, Textarea, Label } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { formatARS } from "@/lib/format";
import { addDaysISO, businessDateISO } from "@/lib/date";
import { ClienteRapido } from "@/components/presupuestos/cliente-rapido";

type Opt = { id: string; label: string };
type VehiculoOpt = Opt & { precio?: number | null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? "Guardando…" : "Crear presupuesto"}</Button>;
}

export function PresupuestoForm({
  clientes, vehiculos, clienteId, vehiculoId,
}: {
  clientes: Opt[]; vehiculos: VehiculoOpt[]; clienteId?: string; vehiculoId?: string;
}) {
  const [state, action] = useFormState<FormState, FormData>(crearPresupuesto, {});
  const [clienteOptions, setClienteOptions] = useState(clientes);
  const [selectedClienteId, setSelectedClienteId] = useState(clienteId ?? "");
  const [selectedVehiculoId, setSelectedVehiculoId] = useState(vehiculoId ?? "");
  const precioInicial = vehiculos.find((vehiculo) => vehiculo.id === selectedVehiculoId)?.precio ?? 0;
  const [precio, setPrecio] = useState(precioInicial);
  const [anticipo, setAnticipo] = useState(0);
  const [bonificacion, setBonificacion] = useState(0);
  const saldo = calcularSaldo(precio, anticipo, bonificacion);
  const seleccionarClienteCreado = useCallback((cliente: Opt) => {
    setClienteOptions((actuales) => actuales.some((item) => item.id === cliente.id) ? actuales : [cliente, ...actuales]);
    setSelectedClienteId(cliente.id);
  }, []);

  const cambiarVehiculo = (id: string) => {
    setSelectedVehiculoId(id);
    setPrecio(vehiculos.find((vehiculo) => vehiculo.id === id)?.precio ?? 0);
  };

  return (
    <div className="grid gap-3">
      <ClienteRapido onCreated={seleccionarClienteCreado} />
      <form action={action} className="grid gap-5">
      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vehículo y cliente</CardTitle>
          <CardDescription>A quién y sobre qué unidad se cotiza.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 pt-0 sm:grid-cols-2">
          <div>
            <Label htmlFor="cliente_id">Cliente</Label>
            <Select id="cliente_id" name="cliente_id" required value={selectedClienteId} onChange={(event) => setSelectedClienteId(event.target.value)}>
              <option value="">— Elegir cliente —</option>
              {clienteOptions.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </Select>
          </div>
          <div>
            <Label htmlFor="vehiculo_id">Vehículo</Label>
            <Select id="vehiculo_id" name="vehiculo_id" value={selectedVehiculoId} onChange={(event) => cambiarVehiculo(event.target.value)}>
              <option value="">— Sin vehículo —</option>
              {vehiculos.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Condiciones comerciales</CardTitle>
          <CardDescription>Precio, descuentos y el saldo que queda a financiar.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 pt-0">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="precio">Precio *</Label>
              <MoneyInput key={selectedVehiculoId || "sin-vehiculo"} id="precio" name="precio" required defaultValue={precioInicial} onValueChange={setPrecio} />
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Financiación</CardTitle>
          <CardDescription>Cómo se paga y hasta cuándo es válida la cotización.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 pt-0 sm:grid-cols-2">
          <div>
            <Label htmlFor="forma_pago">Forma de pago</Label>
            <Select id="forma_pago" name="forma_pago" defaultValue="">
              <option value="">— Sin especificar —</option>
              {FORMAS_PAGO.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </Select>
          </div>
          <div>
            <Label htmlFor="validez">Válido hasta</Label>
            <Input id="validez" name="validez" type="date" defaultValue={addDaysISO(businessDateISO(), 7)} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="financiacion">Financiación (detalle)</Label>
            <Input id="financiacion" name="financiacion" placeholder="Ej.: 12 cuotas s/interés con prenda" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Extras</CardTitle>
          <CardDescription>Permuta y cualquier aclaración adicional para el cliente.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 pt-0">
          <div>
            <Label htmlFor="permuta">Permuta</Label>
            <Input id="permuta" name="permuta" placeholder="Ej.: toma usado Gol Trend 2015" />
          </div>
          <div>
            <Label htmlFor="observaciones">Observaciones</Label>
            <Textarea id="observaciones" name="observaciones" placeholder="Condiciones, aclaraciones, beneficios incluidos…" />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <SubmitButton />
        <a href="/presupuestos" className="text-sm text-muted-foreground hover:underline">Cancelar</a>
      </div>
      </form>
    </div>
  );
}
