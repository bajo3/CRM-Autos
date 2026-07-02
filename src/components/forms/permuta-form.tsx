"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import type { FormState } from "@/app/(app)/permutas/actions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea, Label } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";

type Option = { id: string; label: string };

function Submit() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? "Guardando…" : "Registrar permuta"}</Button>;
}

export function PermutaForm({
  action, clientes, clienteId,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  clientes: Option[]; clienteId?: string;
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
          <div><Label htmlFor="patente">Patente</Label><Input id="patente" name="patente" placeholder="AD123BC" /></div>
          <div><Label htmlFor="marca">Marca</Label><Input id="marca" name="marca" required placeholder="Ford" /></div>
          <div><Label htmlFor="modelo">Modelo</Label><Input id="modelo" name="modelo" required placeholder="Fiesta" /></div>
          <div><Label htmlFor="anio">Año</Label><Input id="anio" name="anio" type="number" placeholder="2018" /></div>
          <div><Label htmlFor="kilometros">Kilómetros</Label><Input id="kilometros" name="kilometros" type="number" placeholder="80000" /></div>
          <div><Label htmlFor="estado_general">Estado general</Label><Input id="estado_general" name="estado_general" placeholder="Bueno, con detalles, etc." /></div>
          <div><Label htmlFor="valor_pretendido">Valor pretendido por el cliente</Label><MoneyInput id="valor_pretendido" name="valor_pretendido" /></div>
          <div className="sm:col-span-2">
            <Label htmlFor="observaciones">Observaciones</Label>
            <Textarea id="observaciones" name="observaciones" placeholder="Estado de la documentación, deudas, etc." />
          </div>

          {state.error && <p className="sm:col-span-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}

          <div className="sm:col-span-2 flex justify-end gap-2">
            <Link href="/permutas"><Button type="button" variant="outline">Cancelar</Button></Link>
            <Submit />
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
