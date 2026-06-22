"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type EstadoSeguimiento = "pendiente" | "realizado" | "vencido" | "cancelado";

export async function cambiarEstadoSeguimiento(id: string, estado: EstadoSeguimiento): Promise<void> {
  const sb = createClient();
  const { error } = await sb.from("seguimiento").update({ estado }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/seguimientos");
}
