"use client";

import { useState, useTransition } from "react";
import { MessageCircle, Sparkles, Loader2 } from "lucide-react";
import { waUrl } from "@/lib/data/whatsapp";
import { sugerirMensajeWa } from "@/app/(app)/seguimientos/actions";

/** Botones de WhatsApp de una fila de Seguimientos: mensaje rápido genérico o redactado con IA. */
export function FilaAcciones({
  seguimientoId,
  telefono,
  mensajeGenerico,
}: {
  seguimientoId: string;
  telefono: string;
  mensajeGenerico: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function sugerir() {
    setError(null);
    startTransition(async () => {
      const res = await sugerirMensajeWa(seguimientoId);
      if (res.error || !res.texto) {
        setError(res.error ?? "No se pudo redactar el mensaje.");
        return;
      }
      window.open(waUrl(res.texto, telefono), "_blank", "noopener,noreferrer");
    });
  }

  return (
    <span className="inline-flex items-center gap-1">
      <a
        href={waUrl(mensajeGenerico, telefono)}
        target="_blank"
        rel="noopener noreferrer"
        title="Enviar WhatsApp (mensaje rápido)"
        className="rounded-md border p-1.5 text-ok hover:bg-muted"
      >
        <MessageCircle className="h-3.5 w-3.5" />
      </a>
      <button
        type="button"
        onClick={sugerir}
        disabled={pending}
        title="Redactar mensaje con IA"
        className="rounded-md border p-1.5 text-brand-800 hover:bg-muted disabled:opacity-50"
      >
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
      </button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </span>
  );
}
