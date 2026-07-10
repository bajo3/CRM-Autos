"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import type { FormState } from "@/app/(app)/clientes/actions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea, Label } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { useEffect, useState } from "react";
import { MOTIVOS_PERDIDA, motivoPerdidaDe, observacionesSinMotivo } from "@/lib/data/motivo-perdida";

export type ClienteInitial = Partial<{
  nombre: string; apellido: string; telefono: string; whatsapp: string;
  email: string; dni_cuit: string; localidad: string; origen: string;
  estado: string; vendedor_id: string; vehiculo_interes_id: string;
  presupuesto_aprox: number; proximo_seguimiento: string; fecha_nacimiento: string; observaciones: string;
  motivo_perdida: string;
}>;

type Option = { id: string; label: string };

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

export function ClienteForm({
  action,
  initial = {},
  vendedores,
  vehiculos,
  submitLabel = "Guardar cliente",
  cancelHref = "/clientes",
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial?: ClienteInitial;
  vendedores: Option[];
  vehiculos: Option[];
  submitLabel?: string;
  cancelHref?: string;
}) {
  const [state, formAction] = useFormState<FormState, FormData>(action, {});
  const fe = state.fieldErrors ?? {};
  const c = initial;
  const [estado, setEstado] = useState(c.estado ?? "nuevo");
  const [origen, setOrigen] = useState(c.origen ?? "whatsapp");
  useEffect(() => {
    if (c.origen) return;
    const ultimo = window.localStorage.getItem("crm.ultimo_origen_lead");
    if (ultimo) setOrigen(ultimo);
  }, [c.origen]);

  return (
    <form action={formAction}>
      <Card>
        <CardContent className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
          <Field name="nombre" label="Nombre *" error={fe.nombre}>
            <Input id="nombre" name="nombre" required defaultValue={c.nombre} placeholder="Diego" />
          </Field>
          <Field name="apellido" label="Apellido" error={fe.apellido}>
            <Input id="apellido" name="apellido" defaultValue={c.apellido} placeholder="Martínez" />
          </Field>
          <Field name="telefono" label="Teléfono" error={fe.telefono}>
            <Input id="telefono" name="telefono" inputMode="tel" defaultValue={c.telefono} placeholder="2494111111" />
          </Field>
          <Field name="whatsapp" label="WhatsApp" error={fe.whatsapp}>
            <Input id="whatsapp" name="whatsapp" inputMode="tel" defaultValue={c.whatsapp} placeholder="2494111111" />
          </Field>
          <Field name="email" label="Email" error={fe.email}>
            <Input id="email" name="email" type="email" defaultValue={c.email} placeholder="diego@mail.com" />
          </Field>
          <Field name="dni_cuit" label="DNI / CUIT" error={fe.dni_cuit}>
            <Input id="dni_cuit" name="dni_cuit" defaultValue={c.dni_cuit} />
          </Field>
          <Field name="localidad" label="Localidad" error={fe.localidad}>
            <Input id="localidad" name="localidad" defaultValue={c.localidad} placeholder="Tandil" />
          </Field>
          <p className="text-xs text-muted-foreground sm:col-span-2">
            Para guardar el lead necesitás al menos un canal de contacto: teléfono, WhatsApp o email.
          </p>
          <Field name="origen" label="Origen del lead" error={fe.origen}>
            <Select
              id="origen"
              name="origen"
              value={origen}
              onChange={(event) => {
                setOrigen(event.target.value);
                window.localStorage.setItem("crm.ultimo_origen_lead", event.target.value);
              }}
            >
              <option value="whatsapp">WhatsApp</option>
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
              <option value="mercadolibre">MercadoLibre</option>
              <option value="web">Web</option>
              <option value="referido">Referido</option>
              <option value="presencial">Presencial</option>
              <option value="otro">Otro</option>
            </Select>
          </Field>
          <Field name="estado" label="Estado comercial" error={fe.estado}>
            <Select id="estado" name="estado" value={estado} onChange={(event) => setEstado(event.target.value)}>
              <option value="nuevo">Nuevo</option>
              <option value="contactado">Contactado</option>
              <option value="interesado">Interesado</option>
              <option value="agendo_visita">Agendó visita</option>
              <option value="visito_agencia">Visitó agencia</option>
              <option value="pidio_financiacion">Pidió financiación</option>
              <option value="reservado">Reservado</option>
              <option value="vendido">Vendido</option>
              <option value="perdido">Perdido</option>
            </Select>
          </Field>
          {estado === "perdido" && (
            <Field name="motivo_perdida" label="Motivo de pérdida *" error={fe.motivo_perdida}>
              <Select id="motivo_perdida" name="motivo_perdida" required defaultValue={c.motivo_perdida ?? motivoPerdidaDe(c.observaciones) ?? ""}>
                <option value="">— Elegir motivo —</option>
                {MOTIVOS_PERDIDA.map(([codigo, etiqueta]) => <option key={codigo} value={codigo}>{etiqueta}</option>)}
              </Select>
            </Field>
          )}
          <Field name="vendedor_id" label="Vendedor asignado" error={fe.vendedor_id}>
            <Select id="vendedor_id" name="vendedor_id" defaultValue={c.vendedor_id ?? ""}>
              <option value="">— Sin asignar —</option>
              {vendedores.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
            </Select>
          </Field>
          <Field name="vehiculo_interes_id" label="Auto de interés" error={fe.vehiculo_interes_id}>
            <Select id="vehiculo_interes_id" name="vehiculo_interes_id" defaultValue={c.vehiculo_interes_id ?? ""}>
              <option value="">— Ninguno —</option>
              {vehiculos.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
            </Select>
          </Field>
          <Field name="presupuesto_aprox" label="Presupuesto aprox. (ARS)" error={fe.presupuesto_aprox}>
            <MoneyInput id="presupuesto_aprox" name="presupuesto_aprox" defaultValue={c.presupuesto_aprox} />
          </Field>
          <Field name="proximo_seguimiento" label="Próximo seguimiento" error={fe.proximo_seguimiento}>
            <Input id="proximo_seguimiento" name="proximo_seguimiento" type="date" defaultValue={c.proximo_seguimiento} />
          </Field>
          <Field name="fecha_nacimiento" label="Fecha de nacimiento" error={fe.fecha_nacimiento}>
            <Input id="fecha_nacimiento" name="fecha_nacimiento" type="date" defaultValue={c.fecha_nacimiento} />
          </Field>
          <div className="sm:col-span-2">
            <Field name="observaciones" label="Observaciones" error={fe.observaciones}>
              <Textarea id="observaciones" name="observaciones" defaultValue={observacionesSinMotivo(c.observaciones)} />
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
