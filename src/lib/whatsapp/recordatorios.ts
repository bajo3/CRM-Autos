import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import { normalizarTelefonoAr } from "./telefono";
import { getAccountForEmpresa, sendTextMessage } from "./service";
import { businessDateISO } from "@/lib/date";

type Db = SupabaseClient<Database>;

type ClienteLite = { nombre: string; apellido: string | null } | { nombre: string; apellido: string | null }[] | null;

type SeguimientoPendiente = {
  id: string; empresa_id: string; vendedor_id: string | null; motivo: string | null; fecha: string;
  cliente: ClienteLite;
};
type CreditoPorTerminar = {
  id: string; cuota_actual: number; cantidad_cuotas: number; empresa_id: string;
  venta: { vendedor_id: string | null; cliente: ClienteLite } | { vendedor_id: string | null; cliente: ClienteLite }[] | null;
};
type ConversacionSinLeer = {
  id: string; empresa_id: string; asignado_a: string | null; nombre_contacto: string | null; telefono: string; no_leidos: number;
};

function nombreCliente(c: ClienteLite): string {
  const rel = Array.isArray(c) ? c[0] : c;
  return rel ? `${rel.nombre} ${rel.apellido ?? ""}`.trim() : "Cliente";
}

type ItemVendedor = { empresaId: string; texto: string };

/**
 * Recordatorio diario a cada vendedor por WhatsApp con lo suyo del día:
 * seguimientos vencidos/de hoy, créditos de sus ventas llegando a la última
 * cuota, y conversaciones de WhatsApp asignadas con mensajes sin leer. Solo
 * corre para cuentas Baileys (beta): la ventana de 24h de la Cloud API haría
 * fallar el envío en cuentas Meta oficiales sin una plantilla aprobada para
 * este uso interno.
 */
export async function enviarRecordatoriosDiarios(admin: Db): Promise<{ enviados: number; vendedores: number }> {
  const hoy = businessDateISO();
  const porVendedor = new Map<string, ItemVendedor[]>();

  function agregar(vendedorId: string | null, empresaId: string, texto: string) {
    if (!vendedorId) return;
    const arr = porVendedor.get(vendedorId) ?? [];
    arr.push({ empresaId, texto });
    porVendedor.set(vendedorId, arr);
  }

  const { data: seguimientos } = await admin
    .from("seguimiento")
    .select("id,empresa_id,vendedor_id,motivo,fecha,cliente:cliente_id(nombre,apellido)")
    .in("estado", ["pendiente", "vencido"])
    .lte("fecha", hoy)
    .not("vendedor_id", "is", null)
    .returns<SeguimientoPendiente[]>();
  for (const s of seguimientos ?? []) {
    agregar(s.vendedor_id, s.empresa_id, `📅 ${nombreCliente(s.cliente)}${s.motivo ? `: ${s.motivo}` : ""} (seguimiento)`);
  }

  const { data: creditos } = await admin
    .from("credito")
    .select("id,cuota_actual,cantidad_cuotas,empresa_id,venta:venta_id(vendedor_id,cliente:cliente_id(nombre,apellido))")
    .in("estado", ["activo", "por_terminar"])
    .returns<CreditoPorTerminar[]>();
  for (const cr of creditos ?? []) {
    const venta = Array.isArray(cr.venta) ? cr.venta[0] : cr.venta;
    const enAlerta = cr.cuota_actual >= cr.cantidad_cuotas - 1;
    if (!venta || !enAlerta) continue;
    agregar(venta.vendedor_id, cr.empresa_id, `💳 ${nombreCliente(venta.cliente)}: crédito en la última cuota (${cr.cuota_actual}/${cr.cantidad_cuotas})`);
  }

  const { data: conversaciones } = await admin
    .from("whatsapp_conversacion")
    .select("id,empresa_id,asignado_a,nombre_contacto,telefono,no_leidos")
    .gt("no_leidos", 0)
    .not("asignado_a", "is", null)
    .returns<ConversacionSinLeer[]>();
  for (const c of conversaciones ?? []) {
    agregar(c.asignado_a, c.empresa_id, `💬 ${c.nombre_contacto || c.telefono}: ${c.no_leidos} mensaje${c.no_leidos === 1 ? "" : "s"} sin leer`);
  }

  if (porVendedor.size === 0) return { enviados: 0, vendedores: 0 };

  const cuentaPorEmpresa = new Map<string, Awaited<ReturnType<typeof getAccountForEmpresa>>>();
  let enviados = 0;

  for (const [vendedorId, items] of porVendedor) {
    const empresaId = items[0].empresaId;

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

    const listado = items.slice(0, 10).map((i) => `• ${i.texto}`).join("\n");
    const extra = items.length > 10 ? `\n…y ${items.length - 10} más.` : "";
    const cuerpo =
      `¡Hola${vendedor.nombre ? ` ${vendedor.nombre}` : ""}! Tenés ${items.length} pendiente${items.length === 1 ? "" : "s"} hoy:\n${listado}${extra}\n\nEntrá al CRM para verlos.`;

    const resultado = await sendTextMessage(admin, {
      empresaId,
      telefono: normalizarTelefonoAr(vendedor.telefono),
      cuerpo,
    });
    if (resultado.ok) enviados++;
  }

  return { enviados, vendedores: porVendedor.size };
}
