import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import { normalizarTelefonoAr } from "./telefono";
import { getAccountForEmpresa, sendTextMessage } from "./service";

type Db = SupabaseClient<Database>;

type SeguimientoPendiente = {
  id: string;
  empresa_id: string;
  vendedor_id: string | null;
  motivo: string | null;
  fecha: string;
  cliente: { nombre: string; apellido: string | null } | { nombre: string; apellido: string | null }[] | null;
};

function nombreCliente(c: SeguimientoPendiente["cliente"]): string {
  const rel = Array.isArray(c) ? c[0] : c;
  return rel ? `${rel.nombre} ${rel.apellido ?? ""}`.trim() : "Cliente";
}

/**
 * Recordatorio diario a cada vendedor con sus seguimientos vencidos/de hoy,
 * por WhatsApp. Solo corre para cuentas conectadas por Baileys (beta): la
 * ventana de 24h de la Cloud API haría fallar el envío en cuentas Meta
 * oficiales sin una plantilla aprobada para este uso interno.
 */
export async function enviarRecordatoriosSeguimientos(admin: Db): Promise<{ enviados: number; vendedores: number }> {
  const hoy = new Date().toISOString().slice(0, 10);
  const { data: pendientes } = await admin
    .from("seguimiento")
    .select("id,empresa_id,vendedor_id,motivo,fecha,cliente:cliente_id(nombre,apellido)")
    .in("estado", ["pendiente", "vencido"])
    .lte("fecha", hoy)
    .not("vendedor_id", "is", null)
    .returns<SeguimientoPendiente[]>();

  if (!pendientes || pendientes.length === 0) return { enviados: 0, vendedores: 0 };

  const porVendedor = new Map<string, SeguimientoPendiente[]>();
  for (const s of pendientes) {
    const arr = porVendedor.get(s.vendedor_id!) ?? [];
    arr.push(s);
    porVendedor.set(s.vendedor_id!, arr);
  }

  const cuentaPorEmpresa = new Map<string, Awaited<ReturnType<typeof getAccountForEmpresa>>>();
  let enviados = 0;

  for (const [vendedorId, items] of porVendedor) {
    const empresaId = items[0].empresa_id;

    let cuenta = cuentaPorEmpresa.get(empresaId);
    if (cuenta === undefined) {
      cuenta = await getAccountForEmpresa(admin, empresaId);
      cuentaPorEmpresa.set(empresaId, cuenta);
    }
    if (!cuenta || cuenta.provider !== "baileys" || cuenta.estado !== "conectado") continue;

    const { data: vendedor } = await admin
      .from("profile")
      .select("nombre, telefono")
      .eq("id", vendedorId)
      .maybeSingle();
    if (!vendedor?.telefono) continue;

    const listado = items
      .slice(0, 8)
      .map((s) => `• ${nombreCliente(s.cliente)}${s.motivo ? `: ${s.motivo}` : ""}`)
      .join("\n");
    const extra = items.length > 8 ? `\n…y ${items.length - 8} más.` : "";
    const cuerpo =
      `¡Hola${vendedor.nombre ? ` ${vendedor.nombre}` : ""}! Tenés ${items.length} seguimiento${items.length === 1 ? "" : "s"} ` +
      `pendiente${items.length === 1 ? "" : "s"} para hoy:\n${listado}${extra}\n\nEntrá al CRM para verlos.`;

    const resultado = await sendTextMessage(admin, {
      empresaId,
      telefono: normalizarTelefonoAr(vendedor.telefono),
      cuerpo,
    });
    if (resultado.ok) enviados++;
  }

  return { enviados, vendedores: porVendedor.size };
}
