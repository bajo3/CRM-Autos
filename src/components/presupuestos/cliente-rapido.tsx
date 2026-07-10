"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Plus, X } from "lucide-react";
import { crearClienteRapidoPresupuesto, type ClienteRapidoState } from "@/app/(app)/clientes/actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

function Guardar() {
  const { pending } = useFormStatus();
  return <Button type="submit" size="sm" disabled={pending}>{pending ? "Guardando…" : "Crear y seleccionar"}</Button>;
}

export function ClienteRapido({
  onCreated,
}: {
  onCreated: (cliente: { id: string; label: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [state, action] = useFormState<ClienteRapidoState, FormData>(crearClienteRapidoPresupuesto, {});

  useEffect(() => {
    if (state.id && state.label) {
      onCreated({ id: state.id, label: state.label });
      setOpen(false);
    }
  }, [state.id, state.label, onCreated]);

  if (!open) {
    return (
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Alta rápida de cliente
      </Button>
    );
  }

  return (
    <form action={action} className="rounded-md border border-brand-200 bg-brand-50/40 p-3">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold">Nuevo cliente sin salir del presupuesto</p>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)} aria-label="Cerrar alta rápida">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><Label htmlFor="rapido_nombre">Nombre *</Label><Input id="rapido_nombre" name="nombre" required /></div>
        <div><Label htmlFor="rapido_apellido">Apellido</Label><Input id="rapido_apellido" name="apellido" /></div>
        <div><Label htmlFor="rapido_whatsapp">WhatsApp</Label><Input id="rapido_whatsapp" name="whatsapp" inputMode="tel" /></div>
        <div><Label htmlFor="rapido_email">Email</Label><Input id="rapido_email" name="email" type="email" /></div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Cargá WhatsApp o email para poder enviar la cotización.</p>
      {state.error && <p className="mt-2 text-xs text-danger">{state.error}</p>}
      <div className="mt-3 flex justify-end"><Guardar /></div>
    </form>
  );
}
