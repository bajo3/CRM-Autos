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

/** Mensaje de recontacto de postventa (fidelización, a los 6 meses de la compra). */
export function mensajePostventa(empresaNombre: string, nombreCliente?: string | null): string {
  return `¡Hola${nombreCliente ? ` ${nombreCliente}` : ""}! Somos ${empresaNombre} 🚗 Queríamos saber cómo te está yendo con tu auto y si necesitás algo (service, repuestos, o alguna consulta). ¡Cualquier cosa estamos a disposición!`;
}

/** Saludo de cumpleaños (fidelización). */
export function mensajeCumpleanos(empresaNombre: string, nombreCliente?: string | null): string {
  return `¡Feliz cumpleaños${nombreCliente ? ` ${nombreCliente}` : ""}! 🎉 Todo el equipo de ${empresaNombre} te desea un muy buen día. ¡Gracias por confiar en nosotros!`;
}

/** Recordatorio automático de la próxima cuota de un crédito, con fecha e importe. */
export function mensajeRecordatorioCuota(
  nombreCliente: string | null | undefined,
  numeroCuota: number,
  fechaVencimiento: string,
  importe: number | null,
): string {
  const fecha = new Date(`${fechaVencimiento}T00:00:00`).toLocaleDateString("es-AR");
  const montoTxt = importe ? ` por $ ${new Intl.NumberFormat("es-AR").format(Math.round(importe))}` : "";
  return `¡Hola${nombreCliente ? ` ${nombreCliente}` : ""}! Te recordamos que la cuota ${numeroCuota} de tu crédito vence el ${fecha}${montoTxt}. ¡Cualquier consulta, escribinos!`;
}

/** Última cuota de un crédito: pie para ofrecer cambio/venta/renovación. */
export function mensajeRenovacionCredito(empresaNombre: string, nombreCliente?: string | null): string {
  return `¡Hola${nombreCliente ? ` ${nombreCliente}` : ""}! Somos ${empresaNombre} 🚗 Tu crédito está llegando a la última cuota. ¿Ya pensaste si querés cambiar, vender o renovar tu auto? Contanos y te mostramos las opciones que tenemos.`;
}

/** A 6 meses de cualquier venta: pie para ofrecer cambio/venta (no solo recontacto genérico). */
export function mensajeRenovacionPostventa(empresaNombre: string, nombreCliente?: string | null): string {
  return `¡Hola${nombreCliente ? ` ${nombreCliente}` : ""}! Somos ${empresaNombre} 🚗 Ya pasaron unos meses desde tu compra — ¿cómo te está yendo con el auto? Si estás pensando en cambiarlo, venderlo o necesitás algo, contanos, ¡estamos para ayudarte!`;
}

/** Plantillas “de ejemplo” mostradas en la UI (el catálogo completa el link real). */
export const PLANTILLAS_WA: { key: string; label: string; texto: string }[] = [
  { key: "catalogo", label: "Catálogo", texto: "¡Hola! Te comparto el catálogo de {empresa} 🚗 {link}" },
  { key: "seguimiento", label: "Seguimiento", texto: "¡Hola! ¿Pudiste ver la info que te pasé? Cualquier duda quedo a disposición." },
  { key: "reserva", label: "Reserva", texto: "¡Gracias por tu seña! Tu unidad queda reservada. Coordinamos la entrega cuando quieras." },
  { key: "postventa", label: "Postventa", texto: "¡Hola! Queríamos saber cómo te está yendo con tu auto. Cualquier consulta, estamos a disposición." },
];
