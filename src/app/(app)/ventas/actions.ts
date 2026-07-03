"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { CHECKLIST_ENTREGA, type ChecklistEntrega } from "@/lib/data/checklist";
import { registrarCambio } from "@/lib/data/historial";

const num = z.coerce.number().min(0);
const uuid = z.union([z.string().uuid(), z.literal("")]).transform((v) => (v === "" ? undefined : v)).optional();

const schema = z.object({
  cliente_id: uuid,
  vehiculo_id: uuid,
  fecha_venta: z.string().min(1, "Fecha obligatoria"),
  precio_final: num,
  sena: num.optional().or(z.literal("").transform(() => 0)),
  forma_pago: z.enum(["efectivo", "transferencia", "credito", "mixto", "permuta"]),
  estado_entrega: z.enum(["pendiente", "en_preparacion", "listo", "entregado"]),
  tiene_permuta: z.coerce.boolean().optional(),
  tiene_credito: z.coerce.boolean().optional(),
  cantidad_cuotas: z.coerce.number().int().min(1).optional().or(z.literal("").transform(() => undefined)),
  observaciones: z.string().optional(),
});

export type FormState = { error?: string };

function addMonths(isoDate: string, months: number): string {
  const d = new Date(isoDate + "T00:00:00");
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

export async function crearVenta(_prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await getSessionContext();
  if (!ctx?.profile?.empresa_id) return { error: "Sesión inválida." };

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Revisá los campos." };
  const d = parsed.data;
  const empresa_id = ctx.profile.empresa_id;

  const sb = createClient();
  const { data: venta, error } = await sb
    .from("venta")
    .insert({
      empresa_id,
      cliente_id: d.cliente_id,
      vehiculo_id: d.vehiculo_id,
      vendedor_id: ctx.profile.id,
      fecha_venta: d.fecha_venta,
      precio_final: d.precio_final,
      sena: d.sena ?? 0,
      forma_pago: d.forma_pago,
      tiene_permuta: !!d.tiene_permuta,
      tiene_credito: !!d.tiene_credito,
      estado_entrega: d.estado_entrega,
      observaciones: d.observaciones,
    })
    .select("id")
    .single<{ id: string }>();
  if (error) return { error: `No se pudo guardar: ${error.message}` };

  // Crédito -> generar registro de cuotas
  if (d.tiene_credito && d.cantidad_cuotas) {
    await sb.from("credito").insert({
      empresa_id,
      venta_id: venta.id,
      cantidad_cuotas: d.cantidad_cuotas,
      fecha_inicio: d.fecha_venta,
      fecha_fin_estimada: addMonths(d.fecha_venta, d.cantidad_cuotas),
      cuota_actual: 0,
      estado: "activo",
    });
  }

  // Venta en efectivo -> alerta de postventa a 6 meses
  if (d.forma_pago === "efectivo" && d.cliente_id) {
    await sb.from("postventa").insert({
      empresa_id,
      venta_id: venta.id,
      cliente_id: d.cliente_id,
      fecha_alerta: addMonths(d.fecha_venta, 6),
      realizada: false,
    });
  }

  // Marcar el vehículo como vendido
  if (d.vehiculo_id) {
    await sb.from("vehiculo").update({ estado: "vendido" }).eq("id", d.vehiculo_id);
    // Si el vehículo estaba consignado, cerrar la consignación (evita que quede "activa" para siempre).
    await sb.from("consignacion").update({ estado: "vendida" }).eq("vehiculo_id", d.vehiculo_id).eq("estado", "activa");
    await registrarCambio({
      accion: "venta_registrada",
      entidad: "vehiculo",
      entidad_id: d.vehiculo_id,
      valor_nuevo: { venta_id: venta.id, precio_final: d.precio_final },
      ctxEmpresaId: empresa_id,
      ctxUsuarioId: ctx.profile.id,
    });
  }
  await registrarCambio({
    accion: "venta_registrada",
    entidad: "venta",
    entidad_id: venta.id,
    valor_nuevo: { precio_final: d.precio_final, forma_pago: d.forma_pago, vehiculo_id: d.vehiculo_id ?? null },
    ctxEmpresaId: empresa_id,
    ctxUsuarioId: ctx.profile.id,
  });

  revalidatePath("/ventas");
  revalidatePath("/stock");
  redirect("/ventas");
}

// Actualiza estado de entrega + checklist desde la ficha de la venta.
export async function actualizarEntrega(ventaId: string, formData: FormData): Promise<void> {
  const ctx = await getSessionContext();
  if (!ctx?.profile?.empresa_id) throw new Error("Sesión inválida.");
  if (!can(ctx.profile.rol, "ventas.crear")) throw new Error("Sin permiso.");

  const estado_entrega = z
    .enum(["pendiente", "en_preparacion", "listo", "entregado"])
    .parse(String(formData.get("estado_entrega") ?? "pendiente"));

  const checklist_entrega: ChecklistEntrega = {};
  for (const item of CHECKLIST_ENTREGA) {
    checklist_entrega[item.key] = formData.get(`chk_${item.key}`) === "on";
  }

  const sb = createClient();
  const { error } = await sb
    .from("venta")
    .update({ estado_entrega, checklist_entrega })
    .eq("id", ventaId);
  if (error) throw new Error(error.message);

  revalidatePath("/ventas");
  revalidatePath(`/ventas/${ventaId}`);
}
