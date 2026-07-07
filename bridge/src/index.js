import { readdir } from "node:fs/promises";
import path from "node:path";
import express from "express";
import { pino } from "pino";
import { iniciarSesion, obtenerEstado, enviarTexto, cerrarSesion } from "./session.js";
import { traducirPayloadEnvio, respuestaEnvioOk } from "./meta-format.js";

/**
 * Servidor del bridge Baileys (WhatsApp por QR, beta no oficial).
 * Habla el mismo contrato que el CRM usa con la Cloud API de Meta:
 * - Recibe payloads de envío formato Graph API y devuelve la misma forma de respuesta.
 * - Emite webhooks entrantes con el shape exacto que espera webhook-parser.ts del CRM.
 * Todas las rutas exigen Authorization: Bearer BRIDGE_SECRET.
 */

const logger = pino({ level: process.env.BRIDGE_LOG_LEVEL || "info" });
const PORT = Number(process.env.PORT) || 3900;
const BRIDGE_SECRET = process.env.BRIDGE_SECRET;

if (!BRIDGE_SECRET) {
  logger.error("Falta BRIDGE_SECRET en el entorno del bridge. Abortando.");
  process.exit(1);
}

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  const auth = req.headers.authorization;
  if (auth !== `Bearer ${BRIDGE_SECRET}`) {
    return res.status(401).json({ error: { message: "No autorizado." } });
  }
  next();
});

app.post("/sessions/:empresaId/start", async (req, res) => {
  try {
    const estado = await iniciarSesion(req.params.empresaId);
    res.json({ status: estado.status });
  } catch (err) {
    logger.error({ err: String(err) }, "error al iniciar sesión");
    res.status(500).json({ error: { message: "No se pudo iniciar la sesión de WhatsApp." } });
  }
});

app.get("/sessions/:empresaId/status", (req, res) => {
  const estado = obtenerEstado(req.params.empresaId);
  res.json(estado);
});

app.post("/sessions/:empresaId/messages", async (req, res) => {
  const traduccion = traducirPayloadEnvio(req.body);
  if (!traduccion.ok) {
    return res.status(traduccion.status).json({ error: traduccion.error });
  }
  try {
    const waMessageId = await enviarTexto(req.params.empresaId, traduccion.jid, traduccion.contenido);
    if (!waMessageId) {
      return res.status(502).json({ error: { message: "Baileys no devolvió un id de mensaje." } });
    }
    res.json(respuestaEnvioOk(waMessageId));
  } catch (err) {
    const status = err.status || 500;
    logger.error({ err: String(err) }, "error al enviar mensaje");
    res.status(status).json({ error: { message: err.message || "No se pudo enviar el mensaje." } });
  }
});

app.delete("/sessions/:empresaId", async (req, res) => {
  try {
    await cerrarSesion(req.params.empresaId);
    res.json({ status: "disconnected" });
  } catch (err) {
    logger.error({ err: String(err) }, "error al cerrar sesión");
    res.status(500).json({ error: { message: "No se pudo cerrar la sesión." } });
  }
});

/** Retoma al arrancar las sesiones con credenciales guardadas en disco. */
async function retomarSesionesGuardadas() {
  let dirs;
  try {
    dirs = await readdir(path.resolve(process.cwd(), "sessions"), { withFileTypes: true });
  } catch {
    return; // sin directorio sessions todavía: nada que retomar
  }
  for (const d of dirs) {
    if (!d.isDirectory()) continue;
    logger.info({ empresaId: d.name }, "retomando sesión guardada");
    iniciarSesion(d.name).catch((err) =>
      logger.error({ err: String(err), empresaId: d.name }, "fallo al retomar sesión guardada"),
    );
  }
}

app.listen(PORT, () => {
  logger.info(`Bridge WhatsApp (Baileys, beta) escuchando en :${PORT}`);
  retomarSesionesGuardadas();
});
