import { createClient } from "@/lib/supabase/server";

/** Opciones para selects de formularios (vendedores y vehículos de la empresa). */
export async function getFormOptions() {
  const sb = createClient();
  const [{ data: vendedores }, { data: vehiculos }, { data: clientes }] = await Promise.all([
    sb.from("profile").select("id,nombre,apellido").eq("activo", true)
      .returns<{ id: string; nombre: string; apellido: string }[]>(),
    sb.from("vehiculo").select("id,marca,modelo,anio,patente").neq("estado", "vendido")
      .order("created_at", { ascending: false })
      .returns<{ id: string; marca: string; modelo: string; anio: number | null; patente: string | null }[]>(),
    sb.from("cliente").select("id,nombre,apellido").order("nombre")
      .returns<{ id: string; nombre: string; apellido: string | null }[]>(),
  ]);

  return {
    vendedores: (vendedores ?? []).map((v) => ({ id: v.id, label: `${v.nombre} ${v.apellido}`.trim() })),
    vehiculos: (vehiculos ?? []).map((v) => ({
      id: v.id,
      label: `${v.marca} ${v.modelo}${v.anio ? ` ${v.anio}` : ""}${v.patente ? ` · ${v.patente}` : ""}`,
    })),
    clientes: (clientes ?? []).map((c) => ({ id: c.id, label: `${c.nombre} ${c.apellido ?? ""}`.trim() })),
  };
}
