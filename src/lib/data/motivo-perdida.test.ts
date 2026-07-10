import { describe, expect, it } from "vitest";
import { guardarMotivoPerdida, motivoPerdidaDe } from "@/lib/data/motivo-perdida";

describe("motivo de pérdida", () => {
  it("guarda el motivo sin ensuciar la observación visible", () => {
    const valor = guardarMotivoPerdida("Llamó dos veces", "precio");
    expect(valor).toBe("Llamó dos veces\n[MOTIVO_PERDIDA:precio]");
    expect(motivoPerdidaDe(valor)).toBe("precio");
  });

  it("reemplaza y elimina tags anteriores", () => {
    expect(guardarMotivoPerdida("Nota\n[MOTIVO_PERDIDA:precio]", "postergado"))
      .toBe("Nota\n[MOTIVO_PERDIDA:postergado]");
    expect(guardarMotivoPerdida("Nota\n[MOTIVO_PERDIDA:precio]")).toBe("Nota");
  });
});
