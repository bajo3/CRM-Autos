"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";

type EstadoSeguimiento = "pendiente" | "realizado" | "vencido" | "cancelado";

export async function cambiarEstadoSeguimiento(id: string, estado: EstadoSeguimiento): Promise<void> {
  const sb = createClient();
  const { error } = await sb.from("seguimiento").update({ estado }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/seguimientos");
  revalidatePath("/");
}

export type ClienteOpcion = { id: string; nombre: string; apellido: string | null; telefono: string | null };

/** Búsqueda liviana de clientes para el alta rápida de seguimientos (RLS acota a la propia empresa). */
export async function buscarClientesParaSeguimiento(query: string): Promise<ClienteOpcion[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const sb = createClient();
  const like = `%${q}%`;
  const { data } = await sb
    .from("cliente")
    .select("id,nombre,apellido,telefono")
    .or(`nombre.ilike.${like},apellido.ilike.${like},telefono.ilike.${like}`)
    .order("nombre")
    .limit(8)
    .returns<ClienteOpcion[]>();
  return data ?? [];
}

/** Alta rápida de seguimiento desde la propia pantalla de Seguimientos (sin pasar por la ficha del cliente). */
export async function crearSeguimiento(formData: FormData): Promise<{ error?: string }> {
  const ctx = await getSessionContext();
  if (!ctx?.profile?.empresa_id) return { error: "Sesión inválida." };

  const clienteId = String(formData.get("cliente_id") ?? "").trim();
  const fecha = String(formData.get("fecha") ?? "").trim();
  const hora = String(formData.get("hora") ?? "").trim();
  const motivo = String(formData.get("motivo") ?? "").trim();
  if (!clienteId) return { error: "Elegí un cliente." };
  if (!fecha) return { error: "Elegí una fecha." };

  const sb = createClient();
  const { error } = await sb.from("seguimiento").insert({
    empresa_id: ctx.profile.empresa_id,
    cliente_id: clienteId,
    vendedor_id: ctx.profile.id,
    fecha,
    hora: hora || null,
    motivo: motivo || null,
    estado: "pendiente",
  });
  if (error) return { error: error.message };

  revalidatePath("/seguimientos");
  revalidatePath("/");
  return {};
}
