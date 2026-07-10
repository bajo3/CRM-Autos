"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { Plus, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { humanize } from "@/lib/format";
import { crearProgramadoManual, cancelarProgramado, reintentarProgramado, type FormState } from "@/app/(app)/whatsapp/programados/actions";
import { nombreCliente, type ProgramadoRow, type FiltrosProgramados } from "@/app/(app)/whatsapp/programados/types";
import { businessDateISO } from "@/lib/date";
import type { WhatsappAccountStatus } from "@/lib/whatsapp/account-status";

type Cliente = { id: string; nombre: string; apellido: string | null; telefono: string | null; whatsapp: string | null };
type Plantilla = { id: string; nombre: string; idioma: string; cuerpo: string; variables_schema: unknown };

const MOTIVOS = ["seguimiento", "cuota", "postventa", "vtv", "service", "renovacion", "promo", "otro"];
const ESTADOS = ["pendiente", "enviado", "fallado", "cancelado"];

const TONE_ESTADO: Record<string, "ok" | "warn" | "danger" | "neutral"> = {
  pendiente: "warn",
  enviado: "ok",
  fallado: "danger",
  cancelado: "neutral",
};

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function contarVariables(cuerpo: string): number {
  const matches = cuerpo.match(/\{\{(\d+)\}\}/g) ?? [];
  return new Set(matches).size;
}

function Submit() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? "Programando…" : <><Plus className="h-4 w-4" /> Programar mensaje</>}</Button>;
}

export function ProgramadosAdmin({
  programados,
  clientes,
  plantillas,
  puedeAdministrar,
  account,
  filtros,
}: {
  programados: ProgramadoRow[];
  clientes: Cliente[];
  plantillas: Plantilla[];
  puedeAdministrar: boolean;
  account: WhatsappAccountStatus;
  filtros: FiltrosProgramados;
}) {
  const [state, formAction] = useFormState<FormState, FormData>(crearProgramadoManual, {});
  const [tipoContenido, setTipoContenido] = useState<"plantilla" | "texto">("plantilla");
  const [plantillaId, setPlantillaId] = useState(plantillas[0]?.id ?? "");
  const [pending, start] = useTransition();
  const fe = state.fieldErrors ?? {};

  const plantillaActual = plantillas.find((p) => p.id === plantillaId);
  const nVars = plantillaActual ? contarVariables(plantillaActual.cuerpo) : 0;

  return (
    <div className="space-y-4">
      {!account.connected ? (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          <p className="font-semibold">WhatsApp está desconectado. Los mensajes no se pueden programar ni enviar.</p>
          <p className="mt-1">Conectalo desde <Link href="/whatsapp/configuracion" className="underline">Configuración de WhatsApp</Link>.</p>
          {account.lastError && <p className="mt-1 text-xs">Último error: {account.lastError}</p>}
        </div>
      ) : (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <p className="font-semibold">WhatsApp conectado{account.telefono ? ` · ${account.telefono}` : ""}</p>
          <p className="text-xs">
            El worker revisa envíos cada 5 minutos. Última ejecución: {account.ultimoCronAt ? formatFecha(account.ultimoCronAt) : "todavía no registrada"}.
          </p>
        </div>
      )}

      {puedeAdministrar && account.connected && (
        <Card>
          <CardHeader><CardTitle className="text-base">Nuevo mensaje programado</CardTitle></CardHeader>
          <CardContent className="p-6">
            <form action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {state.error && <p className="sm:col-span-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}

              <div>
                <Label htmlFor="cliente_id">Cliente *</Label>
                <Select id="cliente_id" name="cliente_id" required defaultValue="">
                  <option value="" disabled>— Elegir —</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id} disabled={!c.telefono && !c.whatsapp}>
                      {c.nombre} {c.apellido ?? ""}{!c.telefono && !c.whatsapp ? " (sin teléfono)" : ""}
                    </option>
                  ))}
                </Select>
                {fe.cliente_id && <p className="mt-1 text-xs text-danger">{fe.cliente_id}</p>}
              </div>
              <div>
                <Label htmlFor="motivo">Motivo</Label>
                <Select id="motivo" name="motivo" defaultValue="seguimiento">
                  {MOTIVOS.map((m) => <option key={m} value={m}>{humanize(m)}</option>)}
                </Select>
              </div>
              <div>
                <Label htmlFor="fecha">Fecha *</Label>
                <Input id="fecha" name="fecha" type="date" required defaultValue={businessDateISO()} />
                {fe.fecha && <p className="mt-1 text-xs text-danger">{fe.fecha}</p>}
              </div>
              <div>
                <Label htmlFor="hora">Hora *</Label>
                <Input id="hora" name="hora" type="time" required defaultValue="10:00" />
                {fe.hora && <p className="mt-1 text-xs text-danger">{fe.hora}</p>}
              </div>

              <div className="sm:col-span-2">
                <Label>Contenido</Label>
                <div className="mb-2 flex gap-4 text-sm">
                  <label className="flex items-center gap-1.5">
                    <input type="radio" name="tipo_contenido" value="plantilla" checked={tipoContenido === "plantilla"} onChange={() => setTipoContenido("plantilla")} />
                    Plantilla (funciona en cualquier momento)
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input type="radio" name="tipo_contenido" value="texto" checked={tipoContenido === "texto"} onChange={() => setTipoContenido("texto")} />
                    Texto libre (solo si hay ventana de 24h abierta al momento de enviar)
                  </label>
                </div>

                {tipoContenido === "plantilla" ? (
                  plantillas.length === 0 ? (
                    <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      No hay plantillas aprobadas todavía. Creá una en <Link href="/whatsapp/plantillas" className="underline">Plantillas</Link>.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      <Select name="plantilla_id" value={plantillaId} onChange={(e) => setPlantillaId(e.target.value)}>
                        {plantillas.map((p) => <option key={p.id} value={p.id}>{p.nombre} ({p.idioma})</option>)}
                      </Select>
                      {plantillaActual && <p className="rounded-md bg-muted px-2 py-1.5 text-xs">{plantillaActual.cuerpo}</p>}
                      {nVars > 0 && (
                        <Input name="variables" placeholder={`Variables separadas por coma (ej: ${Array.from({ length: nVars }, (_, i) => `valor${i + 1}`).join(", ")})`} />
                      )}
                    </div>
                  )
                ) : (
                  <>
                    <Textarea name="cuerpo_texto" placeholder="Texto del mensaje…" />
                    {fe.cuerpo_texto && <p className="mt-1 text-xs text-danger">{fe.cuerpo_texto}</p>}
                  </>
                )}
              </div>

              <div className="sm:col-span-2 flex justify-end">
                <Submit />
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Programados</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <form method="get" className="flex flex-wrap items-center gap-2 border-b p-4">
            <input type="text" name="q" defaultValue={filtros.q ?? ""} placeholder="Buscar teléfono…" className="h-9 rounded-md border border-input bg-white px-3 text-sm shadow-sm" />
            <select name="estado" defaultValue={filtros.estado ?? ""} className="h-9 rounded-md border border-input bg-white px-3 text-sm shadow-sm">
              <option value="">Todos los estados</option>
              {ESTADOS.map((e) => <option key={e} value={e}>{humanize(e)}</option>)}
            </select>
            <select name="motivo" defaultValue={filtros.motivo ?? ""} className="h-9 rounded-md border border-input bg-white px-3 text-sm shadow-sm">
              <option value="">Todos los motivos</option>
              {MOTIVOS.map((m) => <option key={m} value={m}>{humanize(m)}</option>)}
            </select>
            <Button type="submit" variant="outline" size="sm">Filtrar</Button>
            {(filtros.q || filtros.estado || filtros.motivo) && (
              <Link href="/whatsapp/programados" className="text-sm text-muted-foreground underline">Limpiar</Link>
            )}
          </form>

          {programados.length === 0 ? (
            <div className="p-6"><EmptyState title="Sin programados" description="Todavía no hay mensajes programados con estos filtros." /></div>
          ) : (
            <ul className="divide-y">
              {programados.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{nombreCliente(p)}</span>
                      <Badge tone="neutral" className="text-[10px]">{humanize(p.motivo)}</Badge>
                      <Badge tone={TONE_ESTADO[p.estado]} className="text-[10px]">{humanize(p.estado)}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatFecha(p.send_at)} · {p.plantilla_nombre ? `Plantilla: ${p.plantilla_nombre}` : (p.cuerpo_texto?.slice(0, 60) ?? "")}
                    </p>
                    {p.estado === "fallado" && p.error_mensaje && (
                      <p className="text-xs text-danger">{p.error_mensaje} {p.intentos_restantes > 0 ? `(reintentos restantes: ${p.intentos_restantes})` : "(sin más reintentos)"}</p>
                    )}
                  </div>
                  {puedeAdministrar && p.estado === "pendiente" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => start(() => cancelarProgramado(p.id))}
                    >
                      <X className="h-4 w-4" /> Cancelar
                    </Button>
                  )}
                  {puedeAdministrar && account.connected && p.estado === "fallado" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => start(() => reintentarProgramado(p.id))}
                    >
                      Reintentar
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
