import { describe, expect, it } from "vitest";
import { contactoPublicoListo, emailPublicoValido, telefonoPublicoValido } from "./contacto-publico";

describe("contacto público", () => {
  it("rechaza teléfonos placeholder", () => {
    expect(telefonoPublicoValido("+54 9 2494 000000")).toBe(false);
    expect(telefonoPublicoValido("1111111111")).toBe(false);
  });

  it("exige teléfono y email utilizables", () => {
    expect(emailPublicoValido("contacto@agencia.com")).toBe(false);
    expect(contactoPublicoListo({ telefono: "2494621182", email: "ventas@misautos.com.ar" })).toBe(true);
  });
});
