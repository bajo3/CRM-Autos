export const PAGE_SIZE = 25;

export const FILTROS_ESTADO = ["abierta", "pendiente", "cerrada"] as const;

export type FiltroBot = "" | "on" | "off";
export type FiltroAsignacion = "" | "sin_asignar";

export function iniciales(nombre: string | null | undefined): string {
  if (!nombre) return "?";
  const partes = nombre.trim().split(/\s+/);
  return partes
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function formatHoraRelativa(iso: string | null): string {
  if (!iso) return "";
  const fecha = new Date(iso);
  const ahora = new Date();
  const mismodia = fecha.toDateString() === ahora.toDateString();
  if (mismodia) {
    return fecha.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  }
  return fecha.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
}
