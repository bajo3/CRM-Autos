"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import type { FormState } from "@/app/(app)/consignados/actions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea, Label } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";

type Option = { id: string; label: string };
type ClienteOption = Option & { telefono?: string };

function Submit() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? "Guardando…" : "Registrar consignación"}</Button>;
}

export function ConsignacionForm({
  action, vehiculos, clientes, vehiculoId,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  vehiculos: Option[]; clientes: ClienteOption[]; vehiculoId?: string;
}) {
  const [state, formAction] = useFormState<FormState, FormData>(action, {});
  const [clienteId, setClienteId] = useState("");
  const [duenoNombre, setDuenoNombre] = useState("");
  const [duenoContacto, setDuenoContacto] = useState("");

  function alElegirCliente(id: string) {
    setClienteId(id);
    const c = clientes.find((x) => x.id === id);
    if (!c) return;
    setDuenoNombre(c.label);
    setDuenoContacto(c.telefono ?? "");
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="cliente_id" value={clienteId} />
      <Card>
        <CardContent className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="vehiculo_id">Vehículo consignado *</Label>
            <Select id="vehiculo_id" name="vehiculo_id" required defaultValue={vehiculoId ?? ""}>
              <option value="">— Elegir —</option>
              {vehiculos.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="dueno_cliente">Dueño (si ya es cliente del CRM)</Label>
            <Select id="dueno_cliente" value={clienteId} onChange={(e) => alElegirCliente(e.target.value)}>
              <option value="">— Es un dueño nuevo, no está cargado —</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </Select>
          </div>
          <div>
            <Label htmlFor="dueno_nombre">Dueño *</Label>
            <Input id="dueno_nombre" name="dueno_nombre" required placeholder="Nombre y apellido" value={duenoNombre} onChange={(e) => setDuenoNombre(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="dueno_contacto">Contacto del dueño</Label>
            <Input id="dueno_contacto" name="dueno_contacto" placeholder="Teléfono o email" value={duenoContacto} onChange={(e) => setDuenoContacto(e.target.value)} />
          </div>
          <div><Label htmlFor="comision_acordada">Comisión acordada (%)</Label><Input id="comision_acordada" name="comision_acordada" type="number" step="0.1" placeholder="10" /></div>
          <div><Label htmlFor="vencimiento">Vencimiento del acuerdo</Label><Input id="vencimiento" name="vencimiento" type="date" /></div>
          <div><Label htmlFor="precio_pretendido">Precio pretendido</Label><MoneyInput id="precio_pretendido" name="precio_pretendido" /></div>
          <div><Label htmlFor="precio_minimo">Precio mínimo aceptable</Label><MoneyInput id="precio_minimo" name="precio_minimo" /></div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <input type="checkbox" id="autorizacion_venta" name="autorizacion_venta" className="h-4 w-4 rounded border-input" />
            <Label htmlFor="autorizacion_venta">Ya tenemos la autorización de venta firmada</Label>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="observaciones">Observaciones</Label>
            <Textarea id="observaciones" name="observaciones" placeholder="Documentación, condiciones especiales, etc." />
          </div>

          {state.error && <p className="sm:col-span-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}

          <div className="sm:col-span-2 flex justify-end gap-2">
            <Link href="/consignados"><Button type="button" variant="outline">Cancelar</Button></Link>
            <Submit />
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
