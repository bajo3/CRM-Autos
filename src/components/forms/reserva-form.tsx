"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import type { FormState } from "@/app/(app)/reservas/actions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea, Label } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";

type Option = { id: string; label: string };

function Submit() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? "Guardando…" : "Registrar reserva"}</Button>;
}

const hoy = new Date().toISOString().slice(0, 10);

export function ReservaForm({
  action, clientes, vehiculos, clienteId, vehiculoId,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  clientes: Option[]; vehiculos: Option[]; clienteId?: string; vehiculoId?: string;
}) {
  const [state, formAction] = useFormState<FormState, FormData>(action, {});

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
          <div>
            <Label htmlFor="vehiculo_id">Vehículo reservado</Label>
            <Select id="vehiculo_id" name="vehiculo_id" defaultValue={vehiculoId ?? ""}>
              <option value="">— Elegir —</option>
              {vehiculos.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
            </Select>
          </div>
          <div><Label htmlFor="monto_sena">Monto de seña (ARS)</Label><MoneyInput id="monto_sena" name="monto_sena" required /></div>
          <div>
            <Label htmlFor="medio_pago">Medio de pago</Label>
            <Select id="medio_pago" name="medio_pago" defaultValue="">
              <option value="">—</option>
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
            </Select>
          </div>
          <div><Label htmlFor="fecha_reserva">Fecha de reserva</Label><Input id="fecha_reserva" name="fecha_reserva" type="date" required defaultValue={hoy} /></div>
          <div><Label htmlFor="vencimiento">Vencimiento</Label><Input id="vencimiento" name="vencimiento" type="date" /></div>
          <div className="sm:col-span-2">
            <Label htmlFor="observaciones">Observaciones</Label>
            <Textarea id="observaciones" name="observaciones" />
          </div>

          <p className="sm:col-span-2 rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-800">
            Al guardar, el auto pasa a estado <strong>reservado</strong>.
          </p>

          {state.error && <p className="sm:col-span-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}

          <div className="sm:col-span-2 flex justify-end gap-2">
            <Link href="/reservas"><Button type="button" variant="outline">Cancelar</Button></Link>
            <Submit />
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
