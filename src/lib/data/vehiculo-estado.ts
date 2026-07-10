/**
 * Estado operativo del vehículo. `publicado`, `no_publicado` y `pausado`
 * quedaron como valores legacy de la primera versión; la publicación vive en
 * `publicado_web`, `publicado_redes` y la tabla `publicacion`.
 */
export const ESTADOS_OPERATIVOS = [
  "disponible",
  "en_preparacion",
  "reservado",
  "en_negociacion",
  "vendido",
  "consignado",
] as const;

export const ESTADOS_LEGACY_PUBLICACION = ["publicado", "no_publicado", "pausado"] as const;
export const ESTADOS_DISPONIBLES_DB = ["disponible", ...ESTADOS_LEGACY_PUBLICACION] as const;

export function estadoOperativo(estado: string): string {
  return (ESTADOS_LEGACY_PUBLICACION as readonly string[]).includes(estado) ? "disponible" : estado;
}

export function estaDisponible(estado: string): boolean {
  return ESTADOS_DISPONIBLES_DB.includes(estado as (typeof ESTADOS_DISPONIBLES_DB)[number]);
}

export function estaEnVenta(estado: string): boolean {
  return !["vendido"].includes(estadoOperativo(estado));
}
