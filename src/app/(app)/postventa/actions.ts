"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Marca una alerta de postventa como realizada (contacto ya hecho). */
export async function marcarPostventaRealizada(id: string): Promise<void> {
  const sb = createClient();
  const { error } = await sb.from("postventa").update({ realizada: true }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/postventa");
  revalidatePath("/");
}
