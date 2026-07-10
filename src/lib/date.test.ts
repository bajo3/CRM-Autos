import { describe, expect, it } from "vitest";
import { addDaysISO, addMonthsISO, businessDateISO, currentMonthRangeISO, diffDaysISO } from "./date";

describe("fechas de negocio de Argentina", () => {
  it("mantiene el día argentino cuando UTC ya pasó al día siguiente", () => {
    expect(businessDateISO(new Date("2026-07-10T00:30:00.000Z"))).toBe("2026-07-09");
  });

  it("cambia de día a medianoche de Argentina", () => {
    expect(businessDateISO(new Date("2026-07-10T02:59:59.000Z"))).toBe("2026-07-09");
    expect(businessDateISO(new Date("2026-07-10T03:00:00.000Z"))).toBe("2026-07-10");
  });

  it("suma días y meses sin corrimientos horarios", () => {
    expect(addDaysISO("2026-07-09", 1)).toBe("2026-07-10");
    expect(addMonthsISO("2026-01-31", 1)).toBe("2026-02-28");
    expect(diffDaysISO("2026-07-09", "2026-07-12")).toBe(3);
  });

  it("calcula el rango mensual según el mes argentino", () => {
    expect(currentMonthRangeISO(new Date("2026-08-01T01:00:00.000Z"))).toEqual({
      desde: "2026-07-01",
      hasta: "2026-07-31",
    });
  });
});
