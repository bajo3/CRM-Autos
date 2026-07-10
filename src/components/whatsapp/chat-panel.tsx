"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check, CheckCheck, Clock, AlertTriangle, Bot, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea, Select } from "@/components/ui/input";
import { enviarMensajeManual, enviarPlantillaManual } from "@/app/(app)/whatsapp/actions";
import type { MensajeRow } from "@/app/(app)/whatsapp/data";

type Plantilla = { id: string; nombre: string; idioma: string; cuerpo: string; variables_schema: unknown };

function contarVariables(cuerpo: string): number {
  const matches = cuerpo.match(/\{\{(\d+)\}\}/g) ?? [];
  return new Set(matches).size;
}

function IconoEstado({ estado }: { estado: string }) {
  if (estado === "fallado") return <AlertTriangle className="h-3 w-3 text-danger" />;
  if (estado === "leido") return <CheckCheck className="h-3 w-3 text-blue-500" />;
  if (estado === "entregado") return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
  if (estado === "enviado") return <Check className="h-3 w-3 text-muted-foreground" />;
  return <Clock className="h-3 w-3 text-muted-foreground" />;
}

export function ChatPanel({
  conversacionId,
  telefono,
  mensajesIniciales,
  dentroVentana,
  conectado,
  plantillas,
  draftInicial,
}: {
  conversacionId: string;
  telefono: string;
  mensajesIniciales: MensajeRow[];
  dentroVentana: boolean;
  conectado: boolean;
  plantillas: Plantilla[];
  draftInicial?: string;
}) {
  const [texto, setTexto] = useState(draftInicial ?? "");
  const [plantillaId, setPlantillaId] = useState(plantillas[0]?.id ?? "");
  const [variables, setVariables] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  const plantillaActual = plantillas.find((p) => p.id === plantillaId);
  const nVars = plantillaActual ? contarVariables(plantillaActual.cuerpo) : 0;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [mensajesIniciales.length]);

  function enviarTexto() {
    if (!texto.trim() || pending) return;
    setError(null);
    const cuerpo = texto;
    setTexto("");
    start(async () => {
      const res = await enviarMensajeManual(conversacionId, telefono, cuerpo);
      if (res.error) {
        setError(res.error);
        setTexto(cuerpo);
      }
    });
  }

  function enviarPlantilla() {
    if (!plantillaId || pending) return;
    setError(null);
    start(async () => {
      const res = await enviarPlantillaManual(conversacionId, telefono, plantillaId, variables);
      if (res.error) setError(res.error);
      else setVariables([]);
    });
  }

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-4">
        {mensajesIniciales.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">Todavía no hay mensajes.</p>
        )}
        {mensajesIniciales.map((m) => (
          <div key={m.id} className={cn("flex", m.direccion === "saliente" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm",
                m.direccion === "saliente" ? "bg-brand-800 text-white" : "bg-muted",
              )}
            >
              {m.enviado_por_bot && (
                <div className="mb-1 flex items-center gap-1 text-[10px] uppercase opacity-70">
                  <Bot className="h-3 w-3" /> Bot
                </div>
              )}
              <p className="whitespace-pre-wrap break-words">{m.cuerpo || `[${m.tipo}]`}</p>
              <div
                className={cn(
                  "mt-1 flex items-center justify-end gap-1 text-[10px]",
                  m.direccion === "saliente" ? "text-white/70" : "text-muted-foreground",
                )}
              >
                {new Date(m.created_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                {m.direccion === "saliente" && <IconoEstado estado={m.estado} />}
              </div>
              {m.estado === "fallado" && m.error_mensaje && (
                <p className="mt-1 text-[10px] text-danger">{m.error_mensaje}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t p-3">
        {error && <p className="mb-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

        {!conectado ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-800">
            Conectá WhatsApp en Configuración antes de responder. El historial sigue disponible en modo lectura.
          </p>
        ) : dentroVentana ? (
          <div className="flex items-end gap-2">
            <Textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  enviarTexto();
                }
              }}
              placeholder="Escribí un mensaje…"
              className="min-h-[44px]"
              disabled={pending}
            />
            <Button type="button" onClick={enviarTexto} disabled={pending || !texto.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        ) : plantillas.length === 0 ? (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
            La ventana de 24&nbsp;h está cerrada y no hay plantillas creadas. Cargá una en{" "}
            <a href="/whatsapp/plantillas" className="underline">Plantillas</a> para poder escribirle a este cliente.
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-amber-800">Ventana de 24&nbsp;h cerrada: solo se puede enviar una plantilla aprobada.</p>
            <Select
              value={plantillaId}
              onChange={(e) => {
                setPlantillaId(e.target.value);
                setVariables([]);
              }}
              disabled={pending}
            >
              {plantillas.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre} ({p.idioma})</option>
              ))}
            </Select>
            {plantillaActual && (
              <p className="rounded-md bg-muted px-2 py-1.5 text-xs">{plantillaActual.cuerpo}</p>
            )}
            {Array.from({ length: nVars }).map((_, i) => (
              <input
                key={i}
                placeholder={`Variable {{${i + 1}}}`}
                value={variables[i] ?? ""}
                onChange={(e) => {
                  const next = [...variables];
                  next[i] = e.target.value;
                  setVariables(next);
                }}
                className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm shadow-sm"
                disabled={pending}
              />
            ))}
            <Button type="button" onClick={enviarPlantilla} disabled={pending}>
              <Send className="h-4 w-4" /> Enviar plantilla
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
