import { rel, type Rel } from "@/lib/rel";

export const PAGE_SIZE = 30;

export type ProgramadoRow = {
  id: string;
  telefono: string;
  send_at: string;
  plantilla_nombre: string | null;
  cuerpo_texto: string | null;
  motivo: string;
  estado: "pendiente" | "enviado" | "fallado" | "cancelado";
  error_mensaje: string | null;
  intentos_restantes: number;
  enviado_at: string | null;
  cliente: Rel<{ id: string; nombre: string; apellido: string | null }>;
};

export type FiltrosProgramados = {
  estado?: string;
  motivo?: string;
  q?: string;
  page?: string;
};

export function nombreCliente(p: ProgramadoRow): string {
  const c = rel(p.cliente);
  return c ? `${c.nombre} ${c.apellido ?? ""}`.trim() : p.telefono;
}
