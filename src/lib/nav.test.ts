import { describe, expect, it } from "vitest";
import { navigationForRole } from "@/lib/nav";

describe("navigationForRole", () => {
  it("prioriza el trabajo diario del vendedor", () => {
    const nav = navigationForRole("vendedor");
    expect(nav.principales.map((item) => item.href)).toEqual([
      "/", "/clientes", "/stock", "/presupuestos", "/whatsapp",
    ]);
    expect(nav.mas.flatMap((section) => section.items).some((item) => item.href === "/reportes")).toBe(false);
  });

  it("deja reportes y equipo visibles para el dueño", () => {
    const nav = navigationForRole("dueno");
    expect(nav.principales.map((item) => item.href)).toContain("/reportes");
    expect(nav.principales.map((item) => item.href)).toContain("/usuarios");
    expect(nav.mas.flatMap((section) => section.items).map((item) => item.href)).toContain("/vtv");
  });

  it("limita el rol de solo lectura", () => {
    const nav = navigationForRole("solo_lectura");
    const rutas = [...nav.principales, ...nav.mas.flatMap((section) => section.items)].map((item) => item.href);
    expect(rutas).toEqual(["/", "/clientes", "/stock", "/reportes"]);
  });

  it("separa WhatsApp como beta cuando no está conectado", () => {
    const nav = navigationForRole("vendedor", false);
    expect(nav.principales.map((item) => item.href)).not.toContain("/whatsapp");
    expect(nav.mas.find((section) => section.title.includes("Beta"))?.items.map((item) => item.href)).toContain("/whatsapp");
  });
});
