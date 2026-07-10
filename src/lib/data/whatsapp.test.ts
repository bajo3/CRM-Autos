import { describe, expect, it } from "vitest";
import { mensajeVehiculo, waUrl } from "./whatsapp";

describe("mensajes comerciales de WhatsApp", () => {
  it("incluye el link público trazable de la unidad", () => {
    const link = "https://crm.example/p/agencia/auto?utm_source=whatsapp&utm_medium=referral";
    const mensaje = mensajeVehiculo("Mi Agencia", { marca: "Ford", modelo: "Ranger", anio: 2020, precio: 38_000_000 }, link);
    expect(mensaje).toContain(link);
    expect(waUrl(mensaje, "2494111111")).toContain(encodeURIComponent(link));
  });
});
