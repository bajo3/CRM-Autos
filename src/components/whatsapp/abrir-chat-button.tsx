"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Loader2 } from "lucide-react";
import { abrirConversacionCliente } from "@/app/(app)/whatsapp/actions";
import { cn } from "@/lib/utils";

/**
 * Botón de WhatsApp para un cliente puntual: en vez de abrir wa.me (fuera
 * del CRM), busca o crea la conversación en la Bandeja y navega ahí con el
 * mensaje sugerido precargado — todo el historial queda centralizado.
 */
export function AbrirChatButton({
  clienteId,
  mensaje,
  className,
  compact = true,
  label,
}: {
  clienteId: string;
  mensaje?: string;
  className?: string;
  compact?: boolean;
  label?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function abrir() {
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

  return (
    <span className="inline-flex items-center gap-1.5">
      <button
        type="button"
        onClick={abrir}
        disabled={pending}
        title="Escribir por WhatsApp"
        className={cn(
          "inline-flex items-center gap-1.5",
          compact ? "rounded-md border p-1.5 text-ok hover:bg-muted disabled:opacity-50" : "rounded-md border px-2.5 py-1.5 text-sm text-ok hover:bg-muted disabled:opacity-50",
          className,
        )}
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
        {label && <span>{label}</span>}
      </button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </span>
  );
}
