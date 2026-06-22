/**
 * Helper para relaciones embebidas de Supabase.
 *
 * El parser de tipos de supabase-js colapsa filas con embeds a `never` en
 * algunas versiones, por lo que tipamos los resultados con `.returns<Row[]>()`
 * y normalizamos el embed (que puede venir como objeto o array) con `rel()`.
 */
export type Rel<T> = T | T[] | null;

export function rel<T>(value: Rel<T>): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}
