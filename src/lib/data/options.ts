import { createClient } from "@/lib/supabase/server";

/** Opciones para selects de formularios (vendedores y vehículos de la empresa). */
export async function getFormOptions() {
  const sb = createClient();
  const [{ data: vendedores }, { data: vehiculos }, { data: clientes }] = await Promise.all([
    sb.from("profile").select("id,nombre,apellido").eq("activo", true)
      .limit(200)
      .returns<{ id: string; nombre: string; apellido: string }[]>(),
    sb.from("vehiculo").select("id,marca,modelo,anio,patente").neq("estado", "vendido")
      .order("created_at", { ascending: false })
      .limit(300)
      .returns<{ id: string; marca: string; modelo: string; anio: number | null; patente: string | null }[]>(),
    sb.from("cliente").select("id,nombre,apellido,telefono,whatsapp,dni_cuit").order("nombre")
      .limit(500)
      .returns<{ id: string; nombre: string; apellido: string | null; telefono: string | null; whatsapp: string | null; dni_cuit: string | null }[]>(),
  ]);

  return {
    vendedores: (vendedores ?? []).map((v) => ({ id: v.id, label: `${v.nombre} ${v.apellido}`.trim() })),
    vehiculos: (vehiculos ?? []).map((v) => ({
      id: v.id,
      label: `${v.marca} ${v.modelo}${v.anio ? ` ${v.anio}` : ""}${v.patente ? ` · ${v.patente}` : ""}`,
    })),
    // telefono/dni quedan disponibles para autocompletar formularios (ej. conductor de test drive)
    // sin tipear de nuevo datos que el cliente ya tiene cargados.
    clientes: (clientes ?? []).map((c) => ({
      id: c.id,
      label: `${c.nombre} ${c.apellido ?? ""}`.trim(),
      telefono: c.whatsapp || c.telefono || "",
      dni: c.dni_cuit || "",
    })),
  };
}
