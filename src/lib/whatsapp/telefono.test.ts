import { describe, it, expect } from "vitest";
import { normalizarTelefonoAr, coincideTelefono, soloDigitos } from "./telefono";

describe("normalizarTelefonoAr", () => {
  it("agrega 549 a un número local con 0 de discado", () => {
    expect(normalizarTelefonoAr("0249 412-3456")).toBe("5492494123456");
  });

  it("no elimina el '15' de celular viejo (limitación conocida — el matching por sufijo lo absorbe)", () => {
    // No hay tabla de áreas para saber dónde insertar/quitar el 15, así que
    // se preserva tal cual: coincideTelefono() sigue funcionando por sufijo.
    expect(normalizarTelefonoAr("0249 15-412-3456")).toBe("549249154123456");
  });

  it("agrega 549 a un número ya con código de área sin 0/15", () => {
    expect(normalizarTelefonoAr("249 412-3456")).toBe("5492494123456");
  });

  it("respeta un número que ya viene en E.164 de Meta (549...)", () => {
    expect(normalizarTelefonoAr("5492494123456")).toBe("5492494123456");
  });

  it("normaliza un 54 sin el 9 de celular agregando el 9", () => {
    expect(normalizarTelefonoAr("542494123456")).toBe("5492494123456");
  });

  it("devuelve vacío si no hay dígitos", () => {
    expect(normalizarTelefonoAr("sin numero")).toBe("");
  });
});

describe("coincideTelefono", () => {
  it("coincide si comparten los últimos 8 dígitos", () => {
    expect(coincideTelefono("5492494123456", "02494123456")).toBe(true);
  });

  it("no coincide con números distintos", () => {
    expect(coincideTelefono("5492494123456", "5492491119999")).toBe(false);
  });

  it("no coincide si falta alguno de los dos", () => {
    expect(coincideTelefono(null, "5492494123456")).toBe(false);
    expect(coincideTelefono("5492494123456", undefined)).toBe(false);
  });
});

describe("soloDigitos", () => {
  it("elimina todo lo que no sea dígito", () => {
    expect(soloDigitos("+54 (249) 412-3456")).toBe("542494123456");
  });
});
