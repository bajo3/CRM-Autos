import { describe, expect, it } from "vitest";
import { evaluarPublicacion } from "@/lib/data/publicacion-completa";

describe("evaluarPublicacion", () => {
  it("habilita una ficha comercial al 75% con precio y fotos", () => {
    expect(evaluarPublicacion({
      marca: "VW", modelo: "Polo", version: "Comfortline", anio: 2024, kilometros: 10,
      precio_venta: 20, precio_costo: 15, patente: "AA000AA", estado_documental: "completo", fotos: 4,
    }).listo).toBe(true);
  });

  it("bloquea una publicación atractiva pero sin trazabilidad ni costo", () => {
    const resultado = evaluarPublicacion({
      marca: "Toyota", modelo: "SW4", version: "SRV", anio: 2013, kilometros: 145000,
      precio_venta: 29_000_000, estado_documental: "completo", fotos: 8,
    });
    expect(resultado.listo).toBe(false);
    expect(resultado.faltantes).toEqual(expect.arrayContaining(["costo", "patente", "chasis", "motor"]));
  });

  it("exige precio y al menos una foto aunque el porcentaje alcance", () => {
    expect(evaluarPublicacion({
      marca: "Ford", modelo: "Ranger", version: "XLT", anio: 2020, kilometros: 1,
      precio_costo: 1, patente: "AA000AA", chasis: "1", motor: "2", estado_documental: "completo", fotos: 0,
    }).listo).toBe(false);
  });
});
