"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import type { FormState } from "@/app/(app)/encargos/actions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea, Label } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";

function Submit() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? "Guardando…" : "Guardar encargo"}</Button>;
}

export function EncargoForm({
  action,
  clientes,
  clienteId,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  clientes: { id: string; label: string }[];
  clienteId?: string;
}) {
  const [state, formAction] = useFormState<FormState, FormData>(action, {});

  return (
    <form action={formAction}>
      <Card>
        <CardContent className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="cliente_id">Cliente</Label>
            <Select id="cliente_id" name="cliente_id" defaultValue={clienteId ?? ""}>
              <option value="">— Sin cliente —</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </Select>
          </div>
          <div><Label htmlFor="marca_buscada">Marca buscada</Label><Input id="marca_buscada" name="marca_buscada" placeholder="Ford" /></div>
          <div><Label htmlFor="modelo_buscado">Modelo buscado</Label><Input id="modelo_buscado" name="modelo_buscado" placeholder="Ranger" /></div>
          <div><Label htmlFor="anio_min">Año mínimo</Label><Input id="anio_min" name="anio_min" type="number" /></div>
          <div><Label htmlFor="anio_max">Año máximo</Label><Input id="anio_max" name="anio_max" type="number" /></div>
          <div><Label htmlFor="km_max">Km máximos</Label><Input id="km_max" name="km_max" type="number" /></div>
          <div><Label htmlFor="presupuesto_max">Presupuesto máx. (ARS)</Label><MoneyInput id="presupuesto_max" name="presupuesto_max" /></div>
          <div>
            <Label htmlFor="combustible">Combustible</Label>
            <Select id="combustible" name="combustible" defaultValue="">
              <option value="">—</option>
              <option value="nafta">Nafta</option>
              <option value="diesel">Diésel</option>
              <option value="gnc">GNC</option>
              <option value="hibrido">Híbrido</option>
              <option value="electrico">Eléctrico</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="urgencia">Urgencia</Label>
            <Select id="urgencia" name="urgencia" defaultValue="media">
              <option value="baja">Baja</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="estado">Estado</Label>
            <Select id="estado" name="estado" defaultValue="buscando">
              <option value="buscando">Buscando</option>
              <option value="unidad_encontrada">Unidad encontrada</option>
              <option value="ofrecido">Ofrecido al cliente</option>
              <option value="cerrado">Cerrado</option>
              <option value="perdido">Perdido</option>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="observaciones">Observaciones</Label>
            <Textarea id="observaciones" name="observaciones" />
          </div>

          {state.error && (
            <p className="sm:col-span-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
          )}

          <div className="sm:col-span-2 flex justify-end gap-2">
            <Link href="/encargos"><Button type="button" variant="outline">Cancelar</Button></Link>
            <Submit />
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
