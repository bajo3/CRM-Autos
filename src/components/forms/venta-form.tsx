"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import type { FormState } from "@/app/(app)/ventas/actions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea, Label } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";

type Option = { id: string; label: string };

function Submit() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? "Guardando…" : "Registrar venta"}</Button>;
}

const hoy = new Date().toISOString().slice(0, 10);

export function VentaForm({
  action, clientes, vehiculos,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  clientes: Option[]; vehiculos: Option[];
}) {
  const [state, formAction] = useFormState<FormState, FormData>(action, {});

  return (
    <form action={formAction}>
      <Card>
        <CardContent className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
          <div>
            <Label htmlFor="cliente_id">Cliente comprador</Label>
            <Select id="cliente_id" name="cliente_id" defaultValue="">
              <option value="">— Elegir —</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </Select>
          </div>
          <div>
            <Label htmlFor="vehiculo_id">Vehículo vendido</Label>
            <Select id="vehiculo_id" name="vehiculo_id" defaultValue="">
              <option value="">— Elegir —</option>
              {vehiculos.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
            </Select>
          </div>
          <div><Label htmlFor="fecha_venta">Fecha de venta</Label><Input id="fecha_venta" name="fecha_venta" type="date" required defaultValue={hoy} /></div>
          <div>
            <Label htmlFor="forma_pago">Forma de pago</Label>
            <Select id="forma_pago" name="forma_pago" defaultValue="efectivo">
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="credito">Crédito</option>
              <option value="mixto">Mixto</option>
              <option value="permuta">Permuta</option>
            </Select>
          </div>
          <div><Label htmlFor="precio_final">Precio final (ARS)</Label><MoneyInput id="precio_final" name="precio_final" required /></div>
          <div><Label htmlFor="sena">Seña (ARS)</Label><MoneyInput id="sena" name="sena" defaultValue={0} /></div>
          <div>
            <Label htmlFor="estado_entrega">Estado de entrega</Label>
            <Select id="estado_entrega" name="estado_entrega" defaultValue="pendiente">
              <option value="pendiente">Pendiente</option>
              <option value="en_preparacion">En preparación</option>
              <option value="listo">Listo para entregar</option>
              <option value="entregado">Entregado</option>
            </Select>
          </div>
          <div><Label htmlFor="cantidad_cuotas">Cant. cuotas (si es crédito)</Label><Input id="cantidad_cuotas" name="cantidad_cuotas" type="number" placeholder="12" /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="tiene_credito" value="true" /> Venta con crédito</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="tiene_permuta" value="true" /> Incluye permuta</label>
          <div className="sm:col-span-2">
            <Label htmlFor="observaciones">Observaciones</Label>
            <Textarea id="observaciones" name="observaciones" />
          </div>

          <p className="sm:col-span-2 rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-800">
            Al guardar: si es crédito se generan las cuotas; si es efectivo se agenda el recontacto de postventa a 6 meses; el auto pasa a <strong>vendido</strong>.
          </p>

          {state.error && <p className="sm:col-span-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}

          <div className="sm:col-span-2 flex justify-end gap-2">
            <Link href="/ventas"><Button type="button" variant="outline">Cancelar</Button></Link>
            <Submit />
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
