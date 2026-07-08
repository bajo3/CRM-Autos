const DEFAULT_CONFIG = {
  enabled: true,
  readReceipts: true,
  sendMinMs: 6000,
  sendMaxMs: 18000,
  typingMinMs: 2500,
  typingMaxMs: 22000,
  typingCharsPerSecond: 7,
  readMinMs: 2500,
  readMaxMs: 12000,
};

function envFlag(env, nombre, fallback) {
  const valor = env[nombre];
  if (valor == null || valor === "") return fallback;
  return !["0", "false", "no", "off"].includes(String(valor).toLowerCase());
}

function envMs(env, nombre, fallback, min = 0) {
  const raw = env[nombre];
  if (raw == null || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.max(min, Math.round(n)) : fallback;
}

function normalizarRango(min, max) {
  return min <= max ? [min, max] : [max, min];
}

export function leerConfigHumanizer(env = process.env) {
  const [sendMinMs, sendMaxMs] = normalizarRango(
    envMs(env, "BRIDGE_SEND_MIN_MS", DEFAULT_CONFIG.sendMinMs),
    envMs(env, "BRIDGE_SEND_MAX_MS", DEFAULT_CONFIG.sendMaxMs),
  );
  const [typingMinMs, typingMaxMs] = normalizarRango(
    envMs(env, "BRIDGE_TYPING_MIN_MS", DEFAULT_CONFIG.typingMinMs),
    envMs(env, "BRIDGE_TYPING_MAX_MS", DEFAULT_CONFIG.typingMaxMs),
  );
  const [readMinMs, readMaxMs] = normalizarRango(
    envMs(env, "BRIDGE_READ_MIN_MS", DEFAULT_CONFIG.readMinMs),
    envMs(env, "BRIDGE_READ_MAX_MS", DEFAULT_CONFIG.readMaxMs),
  );

  return {
    enabled: envFlag(env, "BRIDGE_HUMANIZER_ENABLED", DEFAULT_CONFIG.enabled),
    readReceipts: envFlag(env, "BRIDGE_READ_RECEIPTS_ENABLED", DEFAULT_CONFIG.readReceipts),
    sendMinMs,
    sendMaxMs,
    typingMinMs,
    typingMaxMs,
    readMinMs,
    readMaxMs,
    typingCharsPerSecond: Math.max(
      1,
      envMs(env, "BRIDGE_TYPING_CHARS_PER_SECOND", DEFAULT_CONFIG.typingCharsPerSecond, 1),
    ),
  };
}

export function randomEntre(min, max, rng = Math.random) {
  if (max <= min) return min;
  return Math.round(min + rng() * (max - min));
}

export function calcularPausaTipeoMs(texto, config = leerConfigHumanizer(), rng = Math.random) {
  const chars = Math.max(1, String(texto || "").trim().length);
  const base = (chars / config.typingCharsPerSecond) * 1000;
  const jitter = 0.75 + rng() * 0.5;
  return Math.round(Math.min(config.typingMaxMs, Math.max(config.typingMinMs, base * jitter)));
}

export function textoDesdeContenido(contenido) {
  return typeof contenido?.text === "string" ? contenido.text : "";
}

export async function dormir(ms, setTimer = setTimeout) {
  if (ms <= 0) return;
  await new Promise((resolve) => setTimer(resolve, ms));
}

async function presenciaSegura(sock, estado, jid, logger) {
  if (typeof sock.sendPresenceUpdate !== "function") return;
  try {
    await sock.sendPresenceUpdate(estado, jid);
  } catch (err) {
    logger?.debug?.({ err: String(err), jid, estado }, "no se pudo actualizar presencia");
  }
}

export async function enviarTextoHumanizado({
  sock,
  jid,
  contenido,
  getUltimoEnvioAt,
  setUltimoEnvioAt,
  config = leerConfigHumanizer(),
  logger,
  rng = Math.random,
  setTimer = setTimeout,
}) {
  if (!config.enabled) {
    const resultado = await sock.sendMessage(jid, contenido);
    setUltimoEnvioAt(Date.now());
    return resultado;
  }

  const separacionDeseada = randomEntre(config.sendMinMs, config.sendMaxMs, rng);
  const desdeUltimo = getUltimoEnvioAt() ? Date.now() - getUltimoEnvioAt() : Number.POSITIVE_INFINITY;
  const esperaPrevia = Math.max(0, separacionDeseada - desdeUltimo);
  if (esperaPrevia > 0) await dormir(esperaPrevia, setTimer);

  await presenciaSegura(sock, "composing", jid, logger);
  await dormir(calcularPausaTipeoMs(textoDesdeContenido(contenido), config, rng), setTimer);

  const resultado = await sock.sendMessage(jid, contenido);
  setUltimoEnvioAt(Date.now());
  await presenciaSegura(sock, "paused", jid, logger);
  return resultado;
}

export async function marcarLeidoHumanizado({
  sock,
  msg,
  config = leerConfigHumanizer(),
  logger,
  rng = Math.random,
  setTimer = setTimeout,
}) {
  if (!config.enabled || !config.readReceipts || !msg?.key) return;
  if (typeof sock.readMessages !== "function") return;

  await dormir(randomEntre(config.readMinMs, config.readMaxMs, rng), setTimer);
  try {
    await sock.readMessages([msg.key]);
  } catch (err) {
    logger?.debug?.({ err: String(err), jid: msg.key?.remoteJid }, "no se pudo marcar como leido");
  }
}
