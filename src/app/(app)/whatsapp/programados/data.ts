import { createClient } from "@/lib/supabase/server";
import { PAGE_SIZE, type ProgramadoRow, type FiltrosProgramados } from "./types";

export type { ProgramadoRow, FiltrosProgramados };
export { PAGE_SIZE, nombreCliente } from "./types";

const ESTADOS = ["pendiente", "enviado", "fallado", "cancelado"];
const MOTIVOS = ["seguimiento", "cuota", "postventa", "vtv", "service", "renovacion", "promo", "otro"];

export async function listarProgramados(empresaId: string, filtros: FiltrosProgramados) {
  const sb = createClient();
  const page = Math.max(1, Number(filtros.page) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = sb
    .from("whatsapp_programado")
    .select(
      "id, telefono, send_at, plantilla_nombre, cuerpo_texto, motivo, estado, error_mensaje, intentos_restantes, enviado_at, cliente:cliente_id(id,nombre,apellido)",
      { count: "exact" },
    )
    .eq("empresa_id", empresaId)
    .order("send_at", { ascending: false })
    .range(from, to);

  if (filtros.estado && ESTADOS.includes(filtros.estado)) query = query.eq("estado", filtros.estado as never);
  if (filtros.motivo && MOTIVOS.includes(filtros.motivo)) query = query.eq("motivo", filtros.motivo as never);
  if (filtros.q) query = query.ilike("telefono", `%${filtros.q}%`);

  const { data, count } = await query.returns<ProgramadoRow[]>();
  return { programados: data ?? [], total: count ?? 0, page };
}

export async function listarClientesConTelefono(empresaId: string) {
  const sb = createClient();
  const { data } = await sb
    .from("cliente")
    .select("id, nombre, apellido, telefono, whatsapp")
    .eq("empresa_id", empresaId)
    .order("nombre")
    .limit(500)
    .returns<{ id: string; nombre: string; apellido: string | null; telefono: string | null; whatsapp: string | null }[]>();
  return data ?? [];
}
