"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import type { FormState } from "@/app/(app)/taller/actions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select, Label } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { businessDateISO } from "@/lib/date";

type Option = { id: string; label: string };

function Submit() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? "Guardando…" : "Cargar trabajo"}</Button>;
}

const hoy = businessDateISO();

export function TallerForm({
  action, vehiculos, vehiculoId,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  vehiculos: Option[]; vehiculoId?: string;
}) {
  const [state, formAction] = useFormState<FormState, FormData>(action, {});

  return (
    <form action={formAction}>
      <Card>
        <CardContent className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="vehiculo_id">Vehículo</Label>
            <Select id="vehiculo_id" name="vehiculo_id" defaultValue={vehiculoId ?? ""}>
              <option value="">— Elegir —</option>
              {vehiculos.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="trabajo">Trabajo a realizar</Label>
            <Input id="trabajo" name="trabajo" required placeholder="Ej.: Service completo, detailing, cambio de cubiertas" />
          </div>
          <div><Label htmlFor="responsable">Responsable interno</Label><Input id="responsable" name="responsable" placeholder="Nombre del encargado" /></div>
          <div><Label htmlFor="taller_externo">Taller externo (si aplica)</Label><Input id="taller_externo" name="taller_externo" placeholder="Nombre del taller" /></div>
          <div><Label htmlFor="costo_estimado">Costo estimado</Label><MoneyInput id="costo_estimado" name="costo_estimado" /></div>
          <div><Label htmlFor="fecha_ingreso">Fecha de ingreso</Label><Input id="fecha_ingreso" name="fecha_ingreso" type="date" defaultValue={hoy} /></div>
          <div><Label htmlFor="fecha_salida_estimada">Salida estimada</Label><Input id="fecha_salida_estimada" name="fecha_salida_estimada" type="date" /></div>

          {state.error && <p className="sm:col-span-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}

          <div className="sm:col-span-2 flex justify-end gap-2">
            <Link href="/taller"><Button type="button" variant="outline">Cancelar</Button></Link>
            <Submit />
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
