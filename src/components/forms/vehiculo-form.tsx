"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import type { FormState } from "@/app/(app)/stock/actions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea, Label } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import Link from "next/link";

export type VehiculoInitial = Partial<{
  marca: string; modelo: string; version: string; anio: number;
  kilometros: number; patente: string; color: string;
  combustible: string; transmision: string; precio_venta: number;
  precio_costo: number; estado: string; titularidad: string;
  ubicacion: string; observaciones: string;
}>;

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? "Guardando…" : label}</Button>;
}

function Field({ name, label, children, error }: { name: string; label: string; children: React.ReactNode; error?: string }) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      {children}
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}

export function VehiculoForm({
  action,
  initial = {},
  submitLabel = "Guardar auto",
  cancelHref = "/stock",
  pedirVtv = false,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial?: VehiculoInitial;
  submitLabel?: string;
  cancelHref?: string;
  /** Pregunta "¿tiene VTV vigente?" al cargar (solo en el alta, para no duplicar registros de VTV al editar). */
  pedirVtv?: boolean;
}) {
  const [state, formAction] = useFormState<FormState, FormData>(action, {});
  const fe = state.fieldErrors ?? {};
  const v = initial;
  const [vtvTiene, setVtvTiene] = useState("no_se");

  return (
    <form action={formAction}>
      <Card>
        <CardContent className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
          <Field name="marca" label="Marca *" error={fe.marca}>
            <Input id="marca" name="marca" required defaultValue={v.marca} placeholder="Fiat" />
          </Field>
          <Field name="modelo" label="Modelo *" error={fe.modelo}>
            <Input id="modelo" name="modelo" required defaultValue={v.modelo} placeholder="Cronos" />
          </Field>
          <Field name="version" label="Versión" error={fe.version}>
            <Input id="version" name="version" defaultValue={v.version} placeholder="Drive 1.3" />
          </Field>
          <Field name="anio" label="Año" error={fe.anio}>
            <Input id="anio" name="anio" type="number" defaultValue={v.anio} placeholder="2020" />
          </Field>
          <Field name="kilometros" label="Kilómetros" error={fe.kilometros}>
            <Input id="kilometros" name="kilometros" type="number" defaultValue={v.kilometros} placeholder="52000" />
          </Field>
          <Field name="patente" label="Patente" error={fe.patente}>
            <Input id="patente" name="patente" defaultValue={v.patente} placeholder="AD123BC" />
          </Field>
          <Field name="color" label="Color" error={fe.color}>
            <Input id="color" name="color" defaultValue={v.color} placeholder="Gris" />
          </Field>
          <Field name="combustible" label="Combustible" error={fe.combustible}>
            <Select id="combustible" name="combustible" defaultValue={v.combustible ?? ""}>
              <option value="">—</option>
              <option value="nafta">Nafta</option>
              <option value="diesel">Diésel</option>
              <option value="gnc">GNC</option>
              <option value="hibrido">Híbrido</option>
              <option value="electrico">Eléctrico</option>
            </Select>
          </Field>
          <Field name="transmision" label="Transmisión" error={fe.transmision}>
            <Select id="transmision" name="transmision" defaultValue={v.transmision ?? ""}>
              <option value="">—</option>
              <option value="manual">Manual</option>
              <option value="automatica">Automática</option>
            </Select>
          </Field>
          <Field name="precio_venta" label="Precio de venta (ARS)" error={fe.precio_venta}>
            <MoneyInput id="precio_venta" name="precio_venta" defaultValue={v.precio_venta} placeholder="16.500.000" />
          </Field>
          <Field name="precio_costo" label="Precio de costo / toma (ARS)" error={fe.precio_costo}>
            <MoneyInput id="precio_costo" name="precio_costo" defaultValue={v.precio_costo} placeholder="13.800.000" />
          </Field>
          <Field name="estado" label="Estado" error={fe.estado}>
            <Select id="estado" name="estado" defaultValue={v.estado ?? "disponible"}>
              <option value="disponible">Disponible</option>
              <option value="en_preparacion">En preparación</option>
              <option value="publicado">Publicado</option>
              <option value="no_publicado">No publicado</option>
              <option value="pausado">Pausado</option>
              <option value="reservado">Reservado</option>
              <option value="en_negociacion">En negociación</option>
              <option value="vendido">Vendido</option>
              <option value="consignado">Consignado</option>
            </Select>
          </Field>
          <Field name="titularidad" label="Titularidad" error={fe.titularidad}>
            <Select id="titularidad" name="titularidad" defaultValue={v.titularidad ?? "propio"}>
              <option value="propio">Propio</option>
              <option value="consignado">Consignado</option>
              <option value="tercero">Tercero</option>
            </Select>
          </Field>
          <Field name="ubicacion" label="Ubicación" error={fe.ubicacion}>
            <Input id="ubicacion" name="ubicacion" defaultValue={v.ubicacion} placeholder="Salón / Playa" />
          </Field>

          {pedirVtv && (
            <>
              <Field name="vtv_tiene" label="¿Tiene VTV vigente?">
                <Select id="vtv_tiene" name="vtv_tiene" value={vtvTiene} onChange={(e) => setVtvTiene(e.target.value)}>
                  <option value="si">Sí</option>
                  <option value="no">No</option>
                  <option value="no_se">No sé</option>
                </Select>
              </Field>
              {vtvTiene === "si" ? (
                <Field name="vtv_fecha_vencimiento" label="Vencimiento de la VTV">
                  <Input id="vtv_fecha_vencimiento" name="vtv_fecha_vencimiento" type="date" required />
                </Field>
              ) : (
                <div className="flex items-end pb-2 text-xs text-muted-foreground">
                  Queda pendiente de control en el módulo VTV.
                </div>
              )}
            </>
          )}

          <div className="sm:col-span-2">
            <Field name="observaciones" label="Observaciones" error={fe.observaciones}>
              <Textarea id="observaciones" name="observaciones" defaultValue={v.observaciones} placeholder="Detalles de la unidad…" />
            </Field>
          </div>

          {state.error && (
            <p className="sm:col-span-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
          )}

          <div className="sm:col-span-2 flex justify-end gap-2">
            <Link href={cancelHref}><Button type="button" variant="outline">Cancelar</Button></Link>
            <Submit label={submitLabel} />
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
