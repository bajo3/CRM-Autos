"use client";

import { useFormState, useFormStatus } from "react-dom";
import { guardarBotConfig, type FormState } from "@/app/(app)/whatsapp/configuracion/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Label } from "@/components/ui/input";

export type BotConfigInitial = {
  habilitado: boolean;
  nombre_comercial: string;
  direccion: string;
  horarios: string;
  financiacion: string;
  politica_permuta: string;
  mensaje_fallback: string;
  keywords_handoff: string;
  tono: string;
  pausa_intervencion_min: number;
};

function Submit() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? "Guardando…" : "Guardar configuración"}</Button>;
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

export function WhatsappBotConfigForm({ initial }: { initial: BotConfigInitial }) {
  const [state, formAction] = useFormState<FormState, FormData>(guardarBotConfig, {});
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Agente automático</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          {state.error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}

          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" name="habilitado" defaultChecked={initial.habilitado} className="h-4 w-4 rounded border-input" />
            Bot habilitado (responde consultas básicas por WhatsApp)
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field name="nombre_comercial" label="Nombre comercial" error={fe.nombre_comercial}>
              <Input id="nombre_comercial" name="nombre_comercial" defaultValue={initial.nombre_comercial} placeholder="Jesús Díaz Automotores" />
            </Field>
            <Field name="direccion" label="Dirección" error={fe.direccion}>
              <Input id="direccion" name="direccion" defaultValue={initial.direccion} placeholder="Av. Santamarina 1234, Tandil" />
            </Field>
          </div>

          <Field name="horarios" label="Horarios de atención" error={fe.horarios} hint="El bot los usa tal cual para responder 'a qué hora atienden'.">
            <Textarea id="horarios" name="horarios" defaultValue={initial.horarios} placeholder="Lunes a viernes de 9 a 18. Sábados de 9 a 13." />
          </Field>

          <Field name="financiacion" label="Financiación disponible" error={fe.financiacion} hint="Si lo dejás vacío, el bot no promete financiación y deriva la consulta.">
            <Textarea id="financiacion" name="financiacion" defaultValue={initial.financiacion} placeholder="Créditos prendarios con bancos convenio, hasta 60% del valor, plazos de 12 a 48 meses." />
          </Field>

          <Field name="politica_permuta" label="Política de permutas/toma de usados" error={fe.politica_permuta}>
            <Textarea id="politica_permuta" name="politica_permuta" defaultValue={initial.politica_permuta} placeholder="Tomamos usados en parte de pago, se tasa en el local." />
          </Field>

          <Field name="mensaje_fallback" label="Mensaje cuando el bot deriva a un vendedor *" error={fe.mensaje_fallback}>
            <Textarea id="mensaje_fallback" name="mensaje_fallback" required defaultValue={initial.mensaje_fallback} />
          </Field>

          <Field
            name="keywords_handoff"
            label="Palabras clave que derivan a un humano"
            error={fe.keywords_handoff}
            hint="Separadas por coma. Si el cliente escribe alguna de estas, el bot no responde y pasa la conversación a un vendedor."
          >
            <Input id="keywords_handoff" name="keywords_handoff" defaultValue={initial.keywords_handoff} placeholder="humano, asesor, vendedor, persona" />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field name="tono" label="Tono de las respuestas" error={fe.tono}>
              <Select id="tono" name="tono" defaultValue={initial.tono}>
                <option value="profesional">Profesional</option>
                <option value="cercano">Cercano</option>
                <option value="breve">Breve</option>
              </Select>
            </Field>
            <Field
              name="pausa_intervencion_min"
              label="Pausa del bot tras un mensaje manual (minutos)"
              error={fe.pausa_intervencion_min}
            >
              <Input id="pausa_intervencion_min" name="pausa_intervencion_min" type="number" min={0} max={1440} defaultValue={initial.pausa_intervencion_min} />
            </Field>
          </div>

          <div className="flex justify-end">
            <Submit />
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
