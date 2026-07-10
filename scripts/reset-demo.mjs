import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const EMPRESA_ID = "11111111-1111-1111-1111-111111111111";
const CONFIRMACION = "--confirmar-jesus-diaz";

if (!process.argv.includes(CONFIRMACION)) {
  console.error(`Uso: node scripts/reset-demo.mjs ${CONFIRMACION}`);
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY. No se modificó nada.");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

function fechaNegocio() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function sumarDias(iso, dias) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + dias));
  return date.toISOString().slice(0, 10);
}

async function ok(promise, etiqueta) {
  const result = await promise;
  if (result.error) throw new Error(`${etiqueta}: ${result.error.message}`);
  return result.data;
}

const hoy = fechaNegocio();
const { data: empresa, error: empresaError } = await sb
  .from("empresa")
  .select("id,slug,nombre")
  .eq("id", EMPRESA_ID)
  .maybeSingle();
if (empresaError || !empresa || empresa.slug !== "jesus-diaz") {
  console.error("La empresa objetivo no coincide exactamente con la demo jesus-diaz. No se modificó nada.");
  process.exit(1);
}

// Dos unidades históricas mantienen íntegras las ventas sin tocar el stock real publicado.
await ok(sb.from("vehiculo").upsert([
  {
    id: "b0000000-0000-0000-0000-000000000001",
    empresa_id: EMPRESA_ID,
    marca: "Fiat",
    modelo: "Cronos",
    version: "Drive 1.3",
    anio: 2020,
    precio_costo: 13_800_000,
    precio_venta: 16_000_000,
    estado: "vendido",
    estado_documental: "completo",
    titularidad: "propio",
    publicado_web: false,
    publicado_ml: false,
    publicado_redes: false,
    observaciones: "Unidad histórica de la demo; no forma parte del stock actual.",
  },
  {
    id: "b0000000-0000-0000-0000-000000000002",
    empresa_id: EMPRESA_ID,
    marca: "Volkswagen",
    modelo: "Gol Trend",
    version: "Trendline 1.6",
    anio: 2018,
    precio_costo: 11_000_000,
    precio_venta: 13_000_000,
    estado: "vendido",
    estado_documental: "completo",
    titularidad: "propio",
    publicado_web: false,
    publicado_ml: false,
    publicado_redes: false,
    observaciones: "Unidad histórica de la demo; no forma parte del stock actual.",
  },
], { onConflict: "id" }), "recrear unidades históricas");

await ok(sb.from("venta").update({
  vehiculo_id: "b0000000-0000-0000-0000-000000000001",
  fecha_venta: sumarDias(hoy, -120),
}).eq("empresa_id", EMPRESA_ID).eq("id", "d0000000-0000-0000-0000-000000000002"), "reconciliar venta de Diego");
await ok(sb.from("venta").update({
  vehiculo_id: "b0000000-0000-0000-0000-000000000002",
  fecha_venta: sumarDias(hoy, -60),
}).eq("empresa_id", EMPRESA_ID).eq("id", "d0000000-0000-0000-0000-000000000001"), "reconciliar venta de Roberto");

await ok(sb.from("cliente").update({
  created_at: `${sumarDias(hoy, -150)}T12:00:00-03:00`,
  proximo_seguimiento: hoy,
}).eq("empresa_id", EMPRESA_ID).eq("id", "c0000000-0000-0000-0000-000000000001"), "actualizar Diego");
await ok(sb.from("cliente").update({
  created_at: `${sumarDias(hoy, -90)}T12:00:00-03:00`,
}).eq("empresa_id", EMPRESA_ID).eq("id", "c0000000-0000-0000-0000-000000000005"), "actualizar Roberto");
await ok(sb.from("cliente").update({ proximo_seguimiento: sumarDias(hoy, 1) })
  .eq("empresa_id", EMPRESA_ID).eq("id", "c0000000-0000-0000-0000-000000000002"), "actualizar Sofía");
await ok(sb.from("cliente").update({ proximo_seguimiento: sumarDias(hoy, 2) })
  .eq("empresa_id", EMPRESA_ID).eq("id", "c0000000-0000-0000-0000-000000000003"), "actualizar Hernán");

// Consolida el lead duplicado creado por WhatsApp en la ficha completa ya existente.
const felipePrincipal = "817c6134-47ed-4230-81c8-a352cf513397";
const felipeDuplicado = "54608b4c-34bf-4019-8593-edad481254ad";
for (const tabla of ["seguimiento", "whatsapp_conversacion", "whatsapp_programado"]) {
  await ok(sb.from(tabla).update({ cliente_id: felipePrincipal }).eq("empresa_id", EMPRESA_ID).eq("cliente_id", felipeDuplicado), `consolidar Felipe en ${tabla}`);
}
await ok(sb.from("cliente").delete().eq("empresa_id", EMPRESA_ID).eq("id", felipeDuplicado), "eliminar lead duplicado de Felipe");
await ok(sb.from("seguimiento").update({
  estado: "cancelado",
  notas: "Automatización histórica cerrada al consolidar el lead duplicado.",
}).eq("empresa_id", EMPRESA_ID).eq("cliente_id", felipePrincipal).ilike("motivo", "Lead nuevo por WhatsApp%"), "cerrar automatizaciones duplicadas");
await ok(sb.from("seguimiento").update({
  estado: "realizado",
  motivo: "Contacto inicial realizado",
  notas: "Seguimiento de prueba normalizado por el reset de demo.",
}).eq("empresa_id", EMPRESA_ID).eq("cliente_id", felipePrincipal).eq("motivo", "lalo"), "normalizar seguimiento de prueba");

// Hugo era un lead huérfano con teléfono inválido usado en QA. Solo se elimina si sigue sin actividad.
const hugoId = "b1630494-4974-4459-b48f-90dba39618c3";
const referenciasHugo = await Promise.all([
  "consulta", "documento_comercial", "encargo", "permuta", "postventa", "presupuesto", "reserva",
  "seguimiento", "tasacion", "test_drive", "venta", "whatsapp_conversacion", "whatsapp_programado",
].map((tabla) => sb.from(tabla).select("id", { count: "exact", head: true }).eq("cliente_id", hugoId)));
if (referenciasHugo.every((result) => !result.error && (result.count ?? 0) === 0)) {
  await ok(sb.from("cliente").delete().eq("empresa_id", EMPRESA_ID).eq("id", hugoId), "eliminar lead QA huérfano");
}

// El historial viejo queda visible como realizado, y la agenda actual se regenera de forma idempotente.
await ok(sb.from("seguimiento").update({
  estado: "realizado",
  notas: "Cerrado por el reset reproducible de la demo.",
}).eq("empresa_id", EMPRESA_ID).in("cliente_id", [
  "c0000000-0000-0000-0000-000000000001",
  "c0000000-0000-0000-0000-000000000002",
  "c0000000-0000-0000-0000-000000000003",
]).lt("fecha", sumarDias(hoy, -7)), "cerrar agenda histórica");

await ok(sb.from("seguimiento").upsert([
  {
    id: "e0000000-0000-0000-0000-000000000001",
    empresa_id: EMPRESA_ID,
    cliente_id: "c0000000-0000-0000-0000-000000000001",
    vendedor_id: "a0000000-0000-0000-0000-000000000002",
    fecha: hoy,
    hora: "10:00",
    motivo: "Confirmar interés y actualizar plan de financiación",
    estado: "pendiente",
  },
  {
    id: "e0000000-0000-0000-0000-000000000002",
    empresa_id: EMPRESA_ID,
    cliente_id: "c0000000-0000-0000-0000-000000000002",
    vendedor_id: "a0000000-0000-0000-0000-000000000003",
    fecha: sumarDias(hoy, 1),
    hora: "11:30",
    motivo: "Revisar toma del usado y próxima propuesta",
    estado: "pendiente",
  },
  {
    id: "e0000000-0000-0000-0000-000000000003",
    empresa_id: EMPRESA_ID,
    cliente_id: "c0000000-0000-0000-0000-000000000003",
    vendedor_id: "a0000000-0000-0000-0000-000000000002",
    fecha: sumarDias(hoy, 2),
    hora: "09:30",
    motivo: "Ofrecer unidades que coinciden con el encargo",
    estado: "pendiente",
  },
  {
    id: "e0000000-0000-0000-0000-000000000004",
    empresa_id: EMPRESA_ID,
    cliente_id: felipePrincipal,
    vendedor_id: "a0000000-0000-0000-0000-000000000001",
    fecha: sumarDias(hoy, 1),
    hora: "15:00",
    motivo: "Confirmar modelo de interés y presupuesto disponible",
    estado: "pendiente",
  },
], { onConflict: "id" }), "regenerar agenda actual");

// Una reserva histórica vencida no debe competir con las oportunidades actuales.
await ok(sb.from("reserva").update({
  estado: "caida",
  observaciones: "Reserva histórica cerrada por el reset de demo.",
}).eq("empresa_id", EMPRESA_ID).eq("cliente_id", "c0000000-0000-0000-0000-000000000004").eq("estado", "vencida"), "cerrar reserva vencida");

// Materializa la toma aceptada una sola vez; la UI y la acción también impiden duplicarla.
await ok(sb.from("vehiculo").upsert({
  id: "b0000000-0000-0000-0000-000000000010",
  empresa_id: EMPRESA_ID,
  marca: "Fiat",
  modelo: "Palio",
  anio: 2014,
  kilometros: 135000,
  patente: "HZX456",
  precio_costo: 5_800_000,
  estado: "en_preparacion",
  titularidad: "propio",
  estado_documental: "pendiente",
  publicado_web: false,
  publicado_ml: false,
  publicado_redes: false,
  permuta_origen_id: "9efa48e3-ef10-4de2-9bc6-e152b4e79e1e",
}, { onConflict: "id" }), "materializar permuta de Sofía");

// La demo no publica fichas que aparentan estar listas pero carecen de trazabilidad mínima.
const vehiculosPublicados = await ok(sb.from("vehiculo").select(
  "id,marca,modelo,version,anio,kilometros,precio_venta,precio_costo,patente,chasis,motor,estado_documental",
).eq("empresa_id", EMPRESA_ID).eq("publicado_web", true), "leer fichas publicadas");
const fotosPublicadas = await ok(sb.from("foto_vehiculo").select("vehiculo_id").eq("empresa_id", EMPRESA_ID), "leer fotos publicadas");
const cantidadFotos = new Map();
for (const foto of fotosPublicadas ?? []) cantidadFotos.set(foto.vehiculo_id, (cantidadFotos.get(foto.vehiculo_id) ?? 0) + 1);
for (const vehiculo of vehiculosPublicados ?? []) {
  const valores = [
    vehiculo.marca, vehiculo.modelo, vehiculo.version, vehiculo.anio, vehiculo.kilometros,
    vehiculo.precio_venta, vehiculo.precio_costo, vehiculo.patente, vehiculo.chasis, vehiculo.motor,
    vehiculo.estado_documental === "completo", (cantidadFotos.get(vehiculo.id) ?? 0) > 0,
  ];
  const completos = valores.filter((valor) => valor !== null && valor !== "" && valor !== false).length;
  const porcentaje = Math.round((completos / valores.length) * 100);
  const listo = porcentaje >= 75 && Boolean(vehiculo.precio_venta) && (cantidadFotos.get(vehiculo.id) ?? 0) > 0;
  if (!listo) await ok(sb.from("vehiculo").update({ publicado_web: false }).eq("id", vehiculo.id), `pausar ficha incompleta ${vehiculo.id}`);
}

// Borra únicamente eventos de venta huérfanos generados por pruebas canceladas.
const historiales = await ok(sb.from("historial_cambio")
  .select("id,entidad,entidad_id,valor_nuevo")
  .eq("empresa_id", EMPRESA_ID)
  .eq("accion", "venta_registrada"), "leer historial de ventas");
for (const historial of historiales ?? []) {
  const ventaId = historial.entidad === "venta" ? historial.entidad_id : historial.valor_nuevo?.venta_id;
  if (typeof ventaId !== "string") continue;
  const venta = await ok(sb.from("venta").select("id").eq("id", ventaId).maybeSingle(), "validar venta histórica");
  if (!venta) await ok(sb.from("historial_cambio").delete().eq("id", historial.id), "eliminar evento huérfano");
}

await ok(sb.from("credito").update({
  fecha_inicio: sumarDias(hoy, -120),
  fecha_fin_estimada: sumarDias(hoy, 30),
}).eq("empresa_id", EMPRESA_ID).eq("venta_id", "d0000000-0000-0000-0000-000000000002"), "actualizar crédito demo");
await ok(sb.from("postventa").update({ fecha_alerta: sumarDias(hoy, 3), realizada: false })
  .eq("empresa_id", EMPRESA_ID).eq("venta_id", "d0000000-0000-0000-0000-000000000001"), "actualizar postventa demo");

console.log(`Demo ${empresa.nombre} reconciliada para ${hoy}. Stock real y fotos preservados.`);
