/**
 * Construcción del payload de un ítem de MercadoLibre a partir de un vehículo
 * del stock. La publicación de autos en ML (categoría clasificados) exige
 * varios atributos; acá armamos un payload best-effort y dejamos que la API
 * devuelva qué falta, que se muestra al usuario para refinar.
 */

import { ML_SITE } from "./config";
import { mlGet } from "./client";

export type VehiculoML = {
  marca: string;
  modelo: string;
  version: string | null;
  anio: number | null;
  kilometros: number | null;
  precio_venta: number | null;
  combustible: string | null;
  transmision: string | null;
  color: string | null;
};

const COMBUSTIBLE: Record<string, string> = {
  nafta: "Nafta",
  diesel: "Diésel",
  gnc: "GNC",
  hibrido: "Híbrido",
  electrico: "Eléctrico",
};
const TRANSMISION: Record<string, string> = {
  manual: "Manual",
  automatica: "Automática",
};

/** Título de la publicación (máx. 60 caracteres en ML). */
export function tituloItem(v: VehiculoML): string {
  return [v.marca, v.modelo, v.version, v.anio]
    .filter(Boolean)
    .join(" ")
    .slice(0, 60);
}

/** Predice la categoría de ML a partir del título. Fallback: autos (MLA1744). */
export async function predecirCategoria(titulo: string, token: string): Promise<string> {
  try {
    const r = await mlGet<Array<{ category_id?: string }>>(
      `/sites/${ML_SITE}/domain_discovery/search?limit=1&q=${encodeURIComponent(titulo)}`,
      token,
    );
    if (Array.isArray(r) && r[0]?.category_id) return r[0].category_id;
  } catch {
    // sin predicción → fallback
  }
  return "MLA1744"; // Autos, Camionetas y 4x4
}

export type ItemML = {
  title: string;
  category_id: string;
  price: number;
  currency_id: string;
  available_quantity: number;
  buying_mode: string;
  listing_type_id: string;
  condition: string;
  pictures: { source: string }[];
  attributes: { id: string; value_name: string }[];
};

/** Arma el cuerpo del ítem a publicar. */
export function construirItem(opts: {
  categoryId: string;
  titulo: string;
  v: VehiculoML;
  fotos: string[];
}): ItemML {
  const { categoryId, titulo, v, fotos } = opts;

  const attributes: { id: string; value_name: string }[] = [
    { id: "BRAND", value_name: v.marca },
    { id: "MODEL", value_name: v.modelo },
  ];
  if (v.anio) attributes.push({ id: "VEHICLE_YEAR", value_name: String(v.anio) });
  if (v.kilometros != null)
    attributes.push({ id: "KILOMETERS", value_name: `${v.kilometros} km` });
  if (v.combustible)
    attributes.push({
      id: "FUEL_TYPE",
      value_name: COMBUSTIBLE[v.combustible] ?? v.combustible,
    });
  if (v.transmision)
    attributes.push({
      id: "TRANSMISSION",
      value_name: TRANSMISION[v.transmision] ?? v.transmision,
    });
  if (v.version) attributes.push({ id: "TRIM", value_name: v.version });
  if (v.color) attributes.push({ id: "COLOR", value_name: v.color });

  return {
    title: titulo,
    category_id: categoryId,
    price: v.precio_venta ?? 0,
    currency_id: "ARS",
    available_quantity: 1,
    buying_mode: "classified",
    listing_type_id: "free",
    condition: "used",
    pictures: fotos.slice(0, 12).map((source) => ({ source })),
    attributes,
  };
}

/** Mapea el status de un ítem de ML a nuestro estado de publicación. */
export function estadoDesdeML(status: string | null | undefined):
  | "publicado"
  | "pausado"
  | "vendido"
  | "borrador" {
  switch (status) {
    case "active":
      return "publicado";
    case "paused":
      return "pausado";
    case "closed":
      return "pausado";
    default:
      return "borrador";
  }
}
