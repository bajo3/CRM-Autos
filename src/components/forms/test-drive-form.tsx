"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import type { FormState } from "@/app/(app)/test-drive/actions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea, Label } from "@/components/ui/input";

type Option = { id: string; label: string };
type ClienteOption = Option & { telefono?: string; dni?: string };

function Submit() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? "Guardando…" : "Agendar test drive"}</Button>;
}

const hoy = new Date().toISOString().slice(0, 10);

export function TestDriveForm({
  action, clientes, vehiculos, clienteId, vehiculoId,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  clientes: ClienteOption[]; vehiculos: Option[]; clienteId?: string; vehiculoId?: string;
}) {
  const [state, formAction] = useFormState<FormState, FormData>(action, {});
  const clienteInicial = clientes.find((c) => c.id === clienteId);
  const [conductorNombre, setConductorNombre] = useState(clienteInicial?.label ?? "");
  const [telefono, setTelefono] = useState(clienteInicial?.telefono ?? "");
  const [dni, setDni] = useState(clienteInicial?.dni ?? "");

  function alElegirCliente(id: string) {
    const c = clientes.find((x) => x.id === id);
    if (!c) return;
    setConductorNombre(c.label);
    setTelefono(c.telefono ?? "");
    setDni(c.dni ?? "");
  }

  return (
    <form action={formAction}>
      <Card>
        <CardContent className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
          <div>
            <Label htmlFor="cliente_id">Cliente</Label>
            <Select id="cliente_id" name="cliente_id" defaultValue={clienteId ?? ""} onChange={(e) => alElegirCliente(e.target.value)}>
              <option value="">— Elegir —</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </Select>
          </div>
          <div>
            <Label htmlFor="vehiculo_id">Vehículo</Label>
            <Select id="vehiculo_id" name="vehiculo_id" defaultValue={vehiculoId ?? ""}>
              <option value="">— Elegir —</option>
              {vehiculos.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
            </Select>
          </div>
          <div><Label htmlFor="fecha">Fecha</Label><Input id="fecha" name="fecha" type="date" required defaultValue={hoy} /></div>
          <div><Label htmlFor="hora">Hora</Label><Input id="hora" name="hora" type="time" /></div>
          <div>
            <Label htmlFor="conductor_nombre">Conductor</Label>
            <Input id="conductor_nombre" name="conductor_nombre" required placeholder="Nombre y apellido" value={conductorNombre} onChange={(e) => setConductorNombre(e.target.value)} />
            <p className="mt-1 text-xs text-muted-foreground">Se completa solo al elegir el cliente. Si maneja otra persona, editalo acá.</p>
          </div>
          <div>
            <Label htmlFor="telefono">Teléfono</Label>
            <Input id="telefono" name="telefono" placeholder="11-xxxx-xxxx" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="dni">DNI</Label>
            <Input id="dni" name="dni" placeholder="DNI del conductor" value={dni} onChange={(e) => setDni(e.target.value)} />
          </div>
          <div><Label htmlFor="licencia">Licencia</Label><Input id="licencia" name="licencia" placeholder="N.º de licencia" /></div>
          <div className="sm:col-span-2">
            <Label htmlFor="obs_previas">Observaciones</Label>
            <Textarea id="obs_previas" name="obs_previas" placeholder="Estado del auto antes de salir, condiciones acordadas…" />
          </div>

          {state.error && <p className="sm:col-span-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}

          <div className="sm:col-span-2 flex justify-end gap-2">
            <Link href="/test-drive"><Button type="button" variant="outline">Cancelar</Button></Link>
            <Submit />
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
