import { describe, expect, it } from "vitest";
import {
  calcularPausaTipeoMs,
  enviarTextoHumanizado,
  leerConfigHumanizer,
  marcarLeidoHumanizado,
  randomEntre,
  textoDesdeContenido,
} from "./humanizer.js";

describe("leerConfigHumanizer", () => {
  it("usa valores seguros por default", () => {
    const cfg = leerConfigHumanizer({});
    expect(cfg.enabled).toBe(true);
    expect(cfg.readReceipts).toBe(true);
    expect(cfg.sendMinMs).toBe(6000);
    expect(cfg.sendMaxMs).toBe(18000);
  });

  it("permite apagar humanizer y normaliza rangos invertidos", () => {
    const cfg = leerConfigHumanizer({
      BRIDGE_HUMANIZER_ENABLED: "0",
      BRIDGE_SEND_MIN_MS: "20000",
      BRIDGE_SEND_MAX_MS: "5000",
    });
    expect(cfg.enabled).toBe(false);
    expect(cfg.sendMinMs).toBe(5000);
    expect(cfg.sendMaxMs).toBe(20000);
  });
});

describe("calcularPausaTipeoMs", () => {
  it("respeta minimos y maximos", () => {
    const cfg = leerConfigHumanizer({
      BRIDGE_TYPING_MIN_MS: "1000",
      BRIDGE_TYPING_MAX_MS: "3000",
      BRIDGE_TYPING_CHARS_PER_SECOND: "1",
    });
    expect(calcularPausaTipeoMs("hola", cfg, () => 0.5)).toBe(3000);
    expect(calcularPausaTipeoMs("", cfg, () => 0.5)).toBe(1000);
  });
});

describe("randomEntre / textoDesdeContenido", () => {
  it("devuelve un valor deterministico con rng inyectado", () => {
    expect(randomEntre(1000, 2000, () => 0.25)).toBe(1250);
  });

  it("extrae el texto enviado a Baileys", () => {
    expect(textoDesdeContenido({ text: "Hola" })).toBe("Hola");
    expect(textoDesdeContenido({ image: {} })).toBe("");
  });
});

describe("enviarTextoHumanizado", () => {
  it("simula tipeo antes de enviar y luego pausa presencia", async () => {
    const llamadas = [];
    const esperas = [];
    const sock = {
      async sendPresenceUpdate(estado, jid) {
        llamadas.push(["presence", estado, jid]);
      },
      async sendMessage(jid, contenido) {
        llamadas.push(["send", jid, contenido]);
        return { key: { id: "ABC" } };
      },
    };
    const resultado = await enviarTextoHumanizado({
      sock,
      jid: "5492491112233@s.whatsapp.net",
      contenido: { text: "Hola" },
      getUltimoEnvioAt: () => 0,
      setUltimoEnvioAt: () => {},
      config: leerConfigHumanizer({
        BRIDGE_SEND_MIN_MS: "6000",
        BRIDGE_SEND_MAX_MS: "6000",
        BRIDGE_TYPING_MIN_MS: "2500",
        BRIDGE_TYPING_MAX_MS: "2500",
      }),
      rng: () => 0.5,
      setTimer(resolve, ms) {
        esperas.push(ms);
        resolve();
      },
    });

    expect(resultado.key.id).toBe("ABC");
    expect(esperas).toEqual([2500]);
    expect(llamadas).toEqual([
      ["presence", "composing", "5492491112233@s.whatsapp.net"],
      ["send", "5492491112233@s.whatsapp.net", { text: "Hola" }],
      ["presence", "paused", "5492491112233@s.whatsapp.net"],
    ]);
  });
});

describe("marcarLeidoHumanizado", () => {
  it("marca el mensaje como leido despues de una pausa", async () => {
    const esperas = [];
    const leidos = [];
    const key = { remoteJid: "5492491112233@s.whatsapp.net", id: "MSG1" };
    const sock = {
      async readMessages(keys) {
        leidos.push(keys);
      },
    };

    await marcarLeidoHumanizado({
      sock,
      msg: { key },
      config: leerConfigHumanizer({
        BRIDGE_READ_MIN_MS: "777",
        BRIDGE_READ_MAX_MS: "777",
      }),
      setTimer(resolve, ms) {
        esperas.push(ms);
        resolve();
      },
    });

    expect(esperas).toEqual([777]);
    expect(leidos).toEqual([[key]]);
  });
});
