export type DatosPublicacion = {
  marca?: string | null;
  modelo?: string | null;
  version?: string | null;
  anio?: number | null;
  kilometros?: number | null;
  precio_venta?: number | null;
  precio_costo?: number | null;
  patente?: string | null;
  chasis?: string | null;
  motor?: string | null;
  estado_documental?: string | null;
  fotos?: number;
};

const CAMPOS: { etiqueta: string; listo: (datos: DatosPublicacion) => boolean }[] = [
  { etiqueta: "marca", listo: (d) => Boolean(d.marca?.trim()) },
  { etiqueta: "modelo", listo: (d) => Boolean(d.modelo?.trim()) },
  { etiqueta: "versión", listo: (d) => Boolean(d.version?.trim()) },
  { etiqueta: "año", listo: (d) => d.anio != null },
  { etiqueta: "kilometraje", listo: (d) => d.kilometros != null },
  { etiqueta: "precio de venta", listo: (d) => d.precio_venta != null && d.precio_venta > 0 },
  { etiqueta: "costo", listo: (d) => d.precio_costo != null && d.precio_costo > 0 },
  { etiqueta: "patente", listo: (d) => Boolean(d.patente?.trim()) },
  { etiqueta: "chasis", listo: (d) => Boolean(d.chasis?.trim()) },
  { etiqueta: "motor", listo: (d) => Boolean(d.motor?.trim()) },
  { etiqueta: "documentación completa", listo: (d) => d.estado_documental === "completo" },
  { etiqueta: "fotos", listo: (d) => (d.fotos ?? 0) > 0 },
];

export function evaluarPublicacion(datos: DatosPublicacion) {
  const faltantes = CAMPOS.filter((campo) => !campo.listo(datos)).map((campo) => campo.etiqueta);
  const porcentaje = Math.round(((CAMPOS.length - faltantes.length) / CAMPOS.length) * 100);
  const requisitosDuros = Boolean(datos.precio_venta && datos.precio_venta > 0 && (datos.fotos ?? 0) > 0);
  return { listo: requisitosDuros && porcentaje >= 75, porcentaje, faltantes };
}
