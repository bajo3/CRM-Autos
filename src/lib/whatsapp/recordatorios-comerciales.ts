import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import { rel, type Rel } from "@/lib/rel";
import { normalizarTelefonoAr } from "./telefono";
import { getAccountForEmpresa, sendTextMessage } from "./service";
import { mensajeRecordatorioCuota, mensajeRenovacionCredito, mensajeRenovacionPostventa } from "@/lib/data/whatsapp";

type Db = SupabaseClient<Database>;
type ClienteContacto = { nombre: string; apellido: string | null; telefono: string | null; whatsapp: string | null };

function sumarMeses(base: Date, meses: number): Date {
  const d = new Date(base);
  d.setMonth(d.getMonth() + meses);
  return d;
}
function isoFecha(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function mesISO(d: Date): string {
  return d.toISOString().slice(0, 7);
}
function telefonoCliente(c: ClienteContacto | null): string | null {
  return c?.whatsapp || c?.telefono || null;
}

/** Cachea cuenta de WhatsApp y nombre de empresa por empresaId para no repetir consultas en el loop. */
function crearCaches(admin: Db) {
  const cuentas = new Map<string, Awaited<ReturnType<typeof getAccountForEmpresa>>>();
  const nombres = new Map<string, string>();
  return {
    async cuentaBaileysConectada(empresaId: string) {
      let cuenta = cuentas.get(empresaId);
      if (cuenta === undefined) {
        cuenta = await getAccountForEmpresa(admin, empresaId);
        cuentas.set(empresaId, cuenta);
      }
      return cuenta && cuenta.provider === "baileys" && cuenta.estado === "conectado";
    },
    async nombreEmpresa(empresaId: string) {
      let nombre = nombres.get(empresaId);
      if (nombre === undefined) {
        const { data } = await admin.from("empresa").select("nombre").eq("id", empresaId).maybeSingle();
        nombre = data?.nombre ?? "nuestra agencia";
        nombres.set(empresaId, nombre);
      }
      return nombre;
    },
  };
}

type CreditoConVenta = {
  id: string; empresa_id: string; cuota_actual: number; cantidad_cuotas: number; estado: string;
  fecha_inicio: string; recordatorio_cuota_mes: string | null;
  venta: Rel<{ saldo: number | null; cliente: Rel<ClienteContacto> }>;
};

/**
 * Recordatorio mensual (mes a mes) de la próxima cuota de cada crédito
 * activo, con fecha e importe estimado (saldo financiado / cantidad de
 * cuotas). Se envía una única vez por cuota (controlado por
 * `credito.recordatorio_cuota_mes`), en la ventana de 3 días antes del
 * vencimiento hasta el día del vencimiento. Solo Baileys: la ventana de 24h
 * de Meta haría fallar este mensaje sin plantilla aprobada.
 */
export async function enviarRecordatoriosCuotas(admin: Db): Promise<{ enviados: number }> {
  const hoy = new Date();
  const { data: creditos } = await admin
    .from("credito")
    .select(
      "id,empresa_id,cuota_actual,cantidad_cuotas,estado,fecha_inicio,recordatorio_cuota_mes," +
        "venta:venta_id(saldo,cliente:cliente_id(nombre,apellido,telefono,whatsapp))",
    )
    .in("estado", ["activo", "por_terminar"])
    .returns<CreditoConVenta[]>();

  const cache = crearCaches(admin);
  let enviados = 0;

  for (const cr of creditos ?? []) {
    if (cr.cuota_actual >= cr.cantidad_cuotas) continue;
    const proximaCuota = cr.cuota_actual + 1;
    const vencimiento = sumarMeses(new Date(`${cr.fecha_inicio}T10:00:00`), proximaCuota);
    const mesObjetivo = mesISO(vencimiento);
    if (cr.recordatorio_cuota_mes === mesObjetivo) continue;

    const diffDias = Math.round((vencimiento.getTime() - hoy.getTime()) / 86_400_000);
    if (diffDias < 0 || diffDias > 3) continue;

    if (!(await cache.cuentaBaileysConectada(cr.empresa_id))) continue;

    const venta = rel(cr.venta);
    const cliente = venta ? rel(venta.cliente) : null;
    const telOriginal = telefonoCliente(cliente);
    if (!telOriginal) continue;

    const importe = venta?.saldo ? venta.saldo / cr.cantidad_cuotas : null;
    const cuerpo = mensajeRecordatorioCuota(cliente?.nombre, proximaCuota, isoFecha(vencimiento), importe);

    const resultado = await sendTextMessage(admin, {
      empresaId: cr.empresa_id,
      telefono: normalizarTelefonoAr(telOriginal),
      cuerpo,
    });
    if (resultado.ok) {
      enviados++;
      await admin.from("credito").update({ recordatorio_cuota_mes: mesObjetivo }).eq("id", cr.id);
    }
  }

  return { enviados };
}

type CreditoUltimaCuota = {
  id: string; empresa_id: string; cuota_actual: number; cantidad_cuotas: number; estado: string;
  venta: Rel<{ cliente: Rel<ClienteContacto> }>;
};
type PostventaRow = {
  id: string; empresa_id: string; fecha_alerta: string;
  cliente: Rel<ClienteContacto>;
};

/**
 * Mensajes de "¿querés cambiar/vender/renovar?": al llegar un crédito a su
 * última cuota, y a los 6 meses de cualquier venta (no solo efectivo). Cada
 * uno se envía una única vez (controlado por `mensaje_renovacion_enviado` /
 * `postventa.mensaje_enviado`). Solo Baileys, mismo motivo que arriba.
 */
export async function enviarMensajesRenovacion(admin: Db): Promise<{ creditos: number; postventas: number }> {
  const cache = crearCaches(admin);

  const { data: creditos } = await admin
    .from("credito")
    .select("id,empresa_id,cuota_actual,cantidad_cuotas,estado,venta:venta_id(cliente:cliente_id(nombre,apellido,telefono,whatsapp))")
    .eq("mensaje_renovacion_enviado", false)
    .in("estado", ["activo", "por_terminar"])
    .returns<CreditoUltimaCuota[]>();

  let creditosEnviados = 0;
  for (const cr of creditos ?? []) {
    const enUltima = cr.estado === "por_terminar" || cr.cuota_actual >= cr.cantidad_cuotas - 1;
    if (!enUltima) continue;
    if (!(await cache.cuentaBaileysConectada(cr.empresa_id))) continue;

    const venta = rel(cr.venta);
    const cliente = venta ? rel(venta.cliente) : null;
    const telOriginal = telefonoCliente(cliente);
    if (!telOriginal) continue;

    const empresaNombre = await cache.nombreEmpresa(cr.empresa_id);
    const cuerpo = mensajeRenovacionCredito(empresaNombre, cliente?.nombre);
    const resultado = await sendTextMessage(admin, {
      empresaId: cr.empresa_id,
      telefono: normalizarTelefonoAr(telOriginal),
      cuerpo,
    });
    if (resultado.ok) {
      creditosEnviados++;
      await admin.from("credito").update({ mensaje_renovacion_enviado: true }).eq("id", cr.id);
    }
  }

  const hoyISO = isoFecha(new Date());
  const { data: postventas } = await admin
    .from("postventa")
    .select("id,empresa_id,fecha_alerta,cliente:cliente_id(nombre,apellido,telefono,whatsapp)")
    .eq("mensaje_enviado", false)
    .lte("fecha_alerta", hoyISO)
    .returns<PostventaRow[]>();

  let postventasEnviadas = 0;
  for (const p of postventas ?? []) {
    if (!(await cache.cuentaBaileysConectada(p.empresa_id))) continue;

    const cliente = rel(p.cliente);
    const telOriginal = telefonoCliente(cliente);
    if (!telOriginal) continue;

    const empresaNombre = await cache.nombreEmpresa(p.empresa_id);
    const cuerpo = mensajeRenovacionPostventa(empresaNombre, cliente?.nombre);
    const resultado = await sendTextMessage(admin, {
      empresaId: p.empresa_id,
      telefono: normalizarTelefonoAr(telOriginal),
      cuerpo,
    });
    if (resultado.ok) {
      postventasEnviadas++;
      await admin.from("postventa").update({ mensaje_enviado: true }).eq("id", p.id);
    }
  }

  return { creditos: creditosEnviados, postventas: postventasEnviadas };
}
