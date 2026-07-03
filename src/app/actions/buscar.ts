"use server";

import { createClient } from "@/lib/supabase/server";

export type ResultadoBusqueda = {
  clientes: { id: string; nombre: string; apellido: string | null; telefono: string | null }[];
  vehiculos: { id: string; marca: string; modelo: string; anio: number | null; patente: string | null }[];
};

/** Búsqueda global de clientes y vehículos para el buscador del topbar. RLS acota a la propia empresa. */
export async function buscarGlobal(query: string): Promise<ResultadoBusqueda> {
  const q = query.trim();
  if (q.length < 2) return { clientes: [], vehiculos: [] };

  const sb = createClient();
  const like = `%${q}%`;

  const [{ data: clientes }, { data: vehiculos }] = await Promise.all([
    sb
      .from("cliente")
      .select("id,nombre,apellido,telefono")
      .or(`nombre.ilike.${like},apellido.ilike.${like},telefono.ilike.${like},dni_cuit.ilike.${like}`)
      .order("nombre")
      .limit(6)
      .returns<{ id: string; nombre: string; apellido: string | null; telefono: string | null }[]>(),
    sb
      .from("vehiculo")
      .select("id,marca,modelo,anio,patente")
      .or(`marca.ilike.${like},modelo.ilike.${like},patente.ilike.${like}`)
      .order("created_at", { ascending: false })
      .limit(6)
      .returns<{ id: string; marca: string; modelo: string; anio: number | null; patente: string | null }[]>(),
  ]);

  return { clientes: clientes ?? [], vehiculos: vehiculos ?? [] };
}
