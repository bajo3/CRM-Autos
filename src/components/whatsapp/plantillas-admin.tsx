"use client";

import { useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Trash2, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/format";
import { crearPlantilla, eliminarPlantilla, cambiarEstadoPlantilla, type FormState } from "@/app/(app)/whatsapp/plantillas/actions";

export type Plantilla = {
  id: string;
  nombre: string;
  idioma: string;
  categoria: string;
  cuerpo: string;
  variables_schema: unknown;
  estado: "aprobada" | "pendiente" | "rechazada" | "desconocido";
  created_at: string;
};

const TONE_ESTADO: Record<Plantilla["estado"], "ok" | "warn" | "danger" | "neutral"> = {
  aprobada: "ok",
  pendiente: "warn",
  rechazada: "danger",
  desconocido: "neutral",
};

function Submit() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? "Creando…" : <><Plus className="h-4 w-4" /> Crear plantilla</>}</Button>;
}

function contarVariables(cuerpo: string): number {
  const matches = cuerpo.match(/\{\{(\d+)\}\}/g) ?? [];
  return new Set(matches).size;
}

export function PlantillasAdmin({ plantillas, puedeAdministrar }: { plantillas: Plantilla[]; puedeAdministrar: boolean }) {
  const [state, formAction] = useFormState<FormState, FormData>(crearPlantilla, {});
  const [cuerpo, setCuerpo] = useState("");
  const [pending, start] = useTransition();
  const fe = state.fieldErrors ?? {};

  return (
    <div className="space-y-4">
      {puedeAdministrar && (
        <Card>
          <CardHeader><CardTitle className="text-base">Nueva plantilla</CardTitle></CardHeader>
          <CardContent className="p-6">
            <form action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {state.error && <p className="sm:col-span-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}

              <div>
                <Label htmlFor="nombre">Nombre (id técnico) *</Label>
                <Input id="nombre" name="nombre" required placeholder="seguimiento_3d" pattern="[a-z0-9_]+" />
                {fe.nombre && <p className="mt-1 text-xs text-danger">{fe.nombre}</p>}
              </div>
              <div>
                <Label htmlFor="idioma">Idioma</Label>
                <Input id="idioma" name="idioma" defaultValue="es_AR" />
              </div>
              <div>
                <Label htmlFor="categoria">Categoría</Label>
                <Select id="categoria" name="categoria" defaultValue="utility">
                  <option value="utility">Utility</option>
                  <option value="marketing">Marketing</option>
                  <option value="authentication">Authentication</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="estado">Estado</Label>
                <Select id="estado" name="estado" defaultValue="aprobada">
                  <option value="aprobada">Aprobada</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="rechazada">Rechazada</option>
                  <option value="desconocido">Desconocido</option>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="cuerpo">Cuerpo *</Label>
                <Textarea
                  id="cuerpo"
                  name="cuerpo"
                  required
                  value={cuerpo}
                  onChange={(e) => setCuerpo(e.target.value)}
                  placeholder="Hola {{1}}, ¿pudiste ver la {{2}} que consultaste?"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Usá {"{{1}}"}, {"{{2}}"}… para variables. Detectadas: {contarVariables(cuerpo)}.
                </p>
                {fe.cuerpo && <p className="mt-1 text-xs text-danger">{fe.cuerpo}</p>}
              </div>

              <div className="sm:col-span-2 flex justify-end">
                <Submit />
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Plantillas ({plantillas.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {plantillas.length === 0 ? (
            <div className="p-6"><EmptyState title="Sin plantillas todavía" description="Creá la primera arriba para poder escribirle a un cliente fuera de la ventana de 24 horas." /></div>
          ) : (
            <ul className="divide-y">
              {plantillas.map((p) => (
                <li key={p.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{p.nombre}</span>
                      <span className="text-xs text-muted-foreground">{p.idioma} · {p.categoria}</span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{p.cuerpo}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Creada el {formatDate(p.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {puedeAdministrar ? (
                      <Select
                        defaultValue={p.estado}
                        disabled={pending}
                        onChange={(e) => start(() => cambiarEstadoPlantilla(p.id, e.target.value as Plantilla["estado"]))}
                        className="h-8 w-32 text-xs"
                      >
                        <option value="aprobada">Aprobada</option>
                        <option value="pendiente">Pendiente</option>
                        <option value="rechazada">Rechazada</option>
                        <option value="desconocido">Desconocido</option>
                      </Select>
                    ) : (
                      <Badge tone={TONE_ESTADO[p.estado]}>{p.estado}</Badge>
                    )}
                    {puedeAdministrar && (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        disabled={pending}
                        onClick={() => {
                          if (confirm(`¿Eliminar la plantilla "${p.nombre}"?`)) start(() => eliminarPlantilla(p.id));
                        }}
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4 text-danger" />
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
