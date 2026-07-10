"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Car, User, Bot, BotOff, CalendarPlus, UserPlus } from "lucide-react";
import { Badge, toneForEstado } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, Input, Label } from "@/components/ui/input";
import { formatARS } from "@/lib/format";
import {
  asignarConversacion,
  cambiarEstadoConversacion,
  crearClienteDesdeConversacion,
  crearSeguimientoDesdeConversacion,
  pausarBotConversacion,
  reactivarBotConversacion,
} from "@/app/(app)/whatsapp/actions";
import type { ConversacionDetalle } from "@/app/(app)/whatsapp/data";
import { rel } from "@/lib/rel";
import { businessDateISO } from "@/lib/date";

type Vendedor = { id: string; nombre: string; apellido: string };

export function ClientPanel({
  conversacion,
  vendedores,
  botOn,
}: {
  conversacion: ConversacionDetalle;
  vendedores: Vendedor[];
  botOn: boolean;
}) {
  const [pending, start] = useTransition();
  const [nombreNuevo, setNombreNuevo] = useState("");
  const cliente = rel(conversacion.cliente);
  const vehiculo = cliente ? rel(cliente.vehiculo_interes) : null;
  const asignado = rel(conversacion.asignado);

  return (
    <div className="flex h-full w-60 shrink-0 flex-col gap-4 overflow-y-auto border-l p-3 text-sm">
      <div>
        <p className="text-xs font-semibold uppercase text-muted-foreground">Contacto</p>
        <p className="font-medium">{cliente ? `${cliente.nombre} ${cliente.apellido ?? ""}`.trim() : conversacion.nombre_contacto || "Sin nombre"}</p>
        <p className="text-muted-foreground">{conversacion.telefono}</p>
      </div>

      {cliente ? (
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground">Estado del lead</p>
          <Badge tone={toneForEstado(cliente.estado)}>{cliente.estado}</Badge>
          <Link href={`/clientes/${cliente.id}`} className="mt-1 block text-xs text-brand-800 hover:underline">
            Ver ficha completa →
          </Link>
        </div>
      ) : (
        <div className="rounded-md border border-dashed p-3">
          <p className="mb-2 text-xs text-muted-foreground">Esta conversación no tiene un cliente asociado.</p>
          <Input
            placeholder="Nombre del contacto"
            value={nombreNuevo}
            onChange={(e) => setNombreNuevo(e.target.value)}
            className="mb-2"
          />
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={() => start(() => crearClienteDesdeConversacion(conversacion.id, nombreNuevo))}
          >
            <UserPlus className="h-4 w-4" /> Crear cliente
          </Button>
        </div>
      )}

      {vehiculo && (
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground">Vehículo de interés</p>
          <Link href={`/stock/${vehiculo.id}`} className="flex items-center gap-1.5 text-brand-800 hover:underline">
            <Car className="h-3.5 w-3.5" /> {vehiculo.marca} {vehiculo.modelo} {vehiculo.anio ?? ""}
          </Link>
        </div>
      )}

      {cliente?.presupuesto_aprox != null && (
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground">Presupuesto aprox.</p>
          <p>{formatARS(cliente.presupuesto_aprox)}</p>
        </div>
      )}

      <div>
        <Label className="text-xs font-semibold uppercase text-muted-foreground">Vendedor asignado</Label>
        <Select
          defaultValue={conversacion.asignado_a ?? ""}
          disabled={pending}
          onChange={(e) => start(() => asignarConversacion(conversacion.id, e.target.value || null))}
        >
          <option value="">— Sin asignar —</option>
          {vendedores.map((v) => (
            <option key={v.id} value={v.id}>{v.nombre} {v.apellido}</option>
          ))}
        </Select>
        {asignado && <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><User className="h-3 w-3" /> {asignado.nombre} {asignado.apellido}</p>}
      </div>

      <div>
        <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Bot</p>
        {botOn ? (
          <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => start(() => pausarBotConversacion(conversacion.id, 4))}>
            <BotOff className="h-4 w-4" /> Pausar 4 h
          </Button>
        ) : (
          <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => start(() => reactivarBotConversacion(conversacion.id))}>
            <Bot className="h-4 w-4" /> Reactivar bot
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {conversacion.estado !== "cerrada" ? (
          <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => start(() => cambiarEstadoConversacion(conversacion.id, "cerrada"))}>
            Cerrar conversación
          </Button>
        ) : (
          <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => start(() => cambiarEstadoConversacion(conversacion.id, "abierta"))}>
            Reabrir
          </Button>
        )}
      </div>

      {cliente && <SeguimientoForm conversacionId={conversacion.id} />}
    </div>
  );
}

function SeguimientoForm({ conversacionId }: { conversacionId: string }) {
  return (
    <form action={crearSeguimientoDesdeConversacion.bind(null, conversacionId)} className="space-y-2 rounded-md border p-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
        <CalendarPlus className="h-3.5 w-3.5" /> Crear seguimiento
      </p>
      <Input type="date" name="fecha" required defaultValue={businessDateISO()} />
      <Input type="text" name="motivo" placeholder="Motivo (opcional)" />
      <Button type="submit" size="sm" className="w-full">Programar</Button>
    </form>
  );
}
