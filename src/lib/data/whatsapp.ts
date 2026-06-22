/** Plantillas de mensajes de WhatsApp y armado de links wa.me. */

/** Construye un link wa.me con texto prellenado (y teléfono opcional). */
export function waUrl(texto: string, telefono?: string | null): string {
  const tel = (telefono ?? "").replace(/\D/g, "");
  const base = tel ? `https://wa.me/${tel}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(texto)}`;
}

/** Mensaje para compartir un catálogo de stock. */
export function mensajeCatalogo(empresaNombre: string, link: string): string {
  return `¡Hola! Te comparto el catálogo de ${empresaNombre} 🚗\n\nMirá las unidades disponibles acá:\n${link}\n\nCualquier consulta, quedo a disposición.`;
}

/** Mensaje para ofrecer una unidad puntual. */
export function mensajeVehiculo(
  empresaNombre: string,
  veh: { marca: string; modelo: string; anio?: number | null; precio?: number | null },
  link?: string,
): string {
  const precio = veh.precio != null ? ` — $ ${new Intl.NumberFormat("es-AR").format(Math.round(veh.precio))}` : "";
  const unidad = `${veh.marca} ${veh.modelo}${veh.anio ? ` ${veh.anio}` : ""}${precio}`;
  return `¡Hola! Te paso info de esta unidad de ${empresaNombre}:\n\n${unidad}${link ? `\n${link}` : ""}\n\n¿Te interesa coordinar una visita?`;
}

/** Plantillas “de ejemplo” mostradas en la UI (el catálogo completa el link real). */
export const PLANTILLAS_WA: { key: string; label: string; texto: string }[] = [
  { key: "catalogo", label: "Catálogo", texto: "¡Hola! Te comparto el catálogo de {empresa} 🚗 {link}" },
  { key: "seguimiento", label: "Seguimiento", texto: "¡Hola! ¿Pudiste ver la info que te pasé? Cualquier duda quedo a disposición." },
  { key: "reserva", label: "Reserva", texto: "¡Gracias por tu seña! Tu unidad queda reservada. Coordinamos la entrega cuando quieras." },
];
