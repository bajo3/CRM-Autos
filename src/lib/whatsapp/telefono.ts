/**
 * Normalización de teléfonos argentinos para WhatsApp.
 * Meta entrega los números en E.164 sin "+" (ej. "5492491234567"); los clientes
 * del CRM tienen teléfonos en texto libre ("0249 154-123456", "+54 9 2494 ...").
 * La clave de conversación es el formato de Meta; el matching contra clientes
 * usa los últimos 8 dígitos (número local sin área) para tolerar variantes.
 */

export function soloDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

/** Mejor esfuerzo para llevar un teléfono AR a E.164 sin "+" (como lo usa Meta). */
export function normalizarTelefonoAr(valor: string): string {
  let d = soloDigitos(valor);
  if (!d) return "";
  // Prefijo internacional 00
  if (d.startsWith("00")) d = d.slice(2);
  // 0 de discado nacional (ej. 0249...)
  if (d.startsWith("0") && !d.startsWith("00")) d = d.slice(1);
  // "15" de celular viejo tras el área no se puede resolver sin tabla de áreas;
  // el matching por sufijo lo absorbe.
  if (!d.startsWith("54")) d = `54${d}`;
  // Celulares argentinos en E.164 llevan 9 tras el 54.
  if (d.startsWith("54") && !d.startsWith("549")) d = `549${d.slice(2)}`;
  return d;
}

/** Dos teléfonos coinciden si comparten los últimos 8 dígitos (mínimo confiable). */
export function coincideTelefono(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const da = soloDigitos(a);
  const db = soloDigitos(b);
  if (da.length < 8 || db.length < 8) return false;
  return da.slice(-8) === db.slice(-8);
}
