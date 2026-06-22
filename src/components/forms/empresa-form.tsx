"use client";

import { useFormState, useFormStatus } from "react-dom";
import { actualizarEmpresa, type FormState } from "@/app/(app)/configuracion/actions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export type EmpresaInitial = Partial<{
  nombre: string; cuit: string; telefono: string; email: string;
  direccion: string; localidad: string; provincia: string;
  logo_url: string; color_primario: string;
  vtv_calendario: Record<string, number>;
}>;

const DIGITOS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

function Submit() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? "Guardando…" : "Guardar cambios"}</Button>;
}

function Field({ name, label, children, error, hint }: {
  name: string; label: string; children: React.ReactNode; error?: string; hint?: string;
}) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}

export function EmpresaForm({ initial = {} }: { initial?: EmpresaInitial }) {
  const [state, formAction] = useFormState<FormState, FormData>(actualizarEmpresa, {});
  const fe = state.fieldErrors ?? {};
  const e = initial;
  const vtv = e.vtv_calendario ?? {};

  return (
    <form action={formAction} className="space-y-6">
      <Card>
        <CardContent className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field name="nombre" label="Nombre de la agencia *" error={fe.nombre}>
              <Input id="nombre" name="nombre" required defaultValue={e.nombre} placeholder="Jesús Díaz Automotores" />
            </Field>
          </div>
          <Field name="cuit" label="CUIT" error={fe.cuit}>
            <Input id="cuit" name="cuit" defaultValue={e.cuit} placeholder="30-12345678-9" />
          </Field>
          <Field name="telefono" label="Teléfono" error={fe.telefono}>
            <Input id="telefono" name="telefono" defaultValue={e.telefono} placeholder="2494111111" />
          </Field>
          <Field name="email" label="Email" error={fe.email}>
            <Input id="email" name="email" type="email" defaultValue={e.email} placeholder="contacto@agencia.com" />
          </Field>
          <Field name="direccion" label="Dirección" error={fe.direccion}>
            <Input id="direccion" name="direccion" defaultValue={e.direccion} placeholder="Av. Siempreviva 742" />
          </Field>
          <Field name="localidad" label="Localidad" error={fe.localidad}>
            <Input id="localidad" name="localidad" defaultValue={e.localidad} placeholder="Tandil" />
          </Field>
          <Field name="provincia" label="Provincia" error={fe.provincia}>
            <Input id="provincia" name="provincia" defaultValue={e.provincia} placeholder="Buenos Aires" />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <h2 className="text-sm font-semibold text-foreground">Marca</h2>
            <p className="text-xs text-muted-foreground">Se usan en catálogos y documentos PDF.</p>
          </div>
          <Field name="logo_url" label="Logo (URL)" error={fe.logo_url}
            hint="Pegá la URL pública del logo. La subida de archivo queda pendiente.">
            <Input id="logo_url" name="logo_url" defaultValue={e.logo_url} placeholder="https://…/logo.png" />
          </Field>
          <Field name="color_primario" label="Color primario (hex)" error={fe.color_primario}>
            <div className="flex items-center gap-2">
              <Input id="color_primario" name="color_primario" defaultValue={e.color_primario ?? "#1e3a8a"} placeholder="#1e3a8a" />
              <span
                aria-hidden
                className="h-9 w-9 shrink-0 rounded-md border"
                style={{ backgroundColor: e.color_primario ?? "#1e3a8a" }}
              />
            </div>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h2 className="text-sm font-semibold text-foreground">Calendario VTV por jurisdicción</h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Mes de vencimiento (1-12) según el último dígito de la patente. Default: Provincia de Buenos Aires.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {DIGITOS.map((d) => (
              <Field key={d} name={`vtv_${d}`} label={`Dígito ${d}`}>
                <Input
                  id={`vtv_${d}`}
                  name={`vtv_${d}`}
                  type="number"
                  min={1}
                  max={12}
                  defaultValue={vtv[d] ?? ""}
                />
              </Field>
            ))}
          </div>
        </CardContent>
      </Card>

      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      {state.ok && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">Cambios guardados.</p>
      )}

      <div className="flex justify-end">
        <Submit />
      </div>
    </form>
  );
}
