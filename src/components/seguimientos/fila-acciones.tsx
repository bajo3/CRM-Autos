"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Sparkles, Loader2 } from "lucide-react";
import { sugerirMensajeWa } from "@/app/(app)/seguimientos/actions";
import { abrirConversacionCliente } from "@/app/(app)/whatsapp/actions";

/** Botones de WhatsApp de una fila de Seguimientos: mensaje rápido genérico o redactado con IA — ambos abren la Bandeja del CRM. */
export function FilaAcciones({
  seguimientoId,
  clienteId,
  mensajeGenerico,
}: {
  seguimientoId: string;
  clienteId: string;
  mensajeGenerico: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function abrir(mensaje: string) {
    setError(null);
    startTransition(async () => {
      const res = await abrirConversacionCliente(clienteId, mensaje);
      if (res.error || !res.href) {
        setError(res.error ?? "No se pudo abrir la conversación.");
        return;
      }
      router.push(res.href);
    });
  }

  function rapido() {
    abrir(mensajeGenerico);
  }

  function sugerir() {
    setError(null);
    startTransition(async () => {
      const res = await sugerirMensajeWa(seguimientoId);
      if (res.error || !res.texto) {
        setError(res.error ?? "No se pudo redactar el mensaje.");
        return;
      }
      abrir(res.texto);
    });
  }

  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={rapido}
        disabled={pending}
        title="Escribir por WhatsApp (mensaje rápido)"
        className="rounded-md border p-1.5 text-ok hover:bg-muted disabled:opacity-50"
      >
        <MessageCircle className="h-3.5 w-3.5" />
      </button>
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
