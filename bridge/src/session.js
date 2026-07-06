import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import makeWASocket, { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from "@whiskeysockets/baileys";
import QRCode from "qrcode";
import { pino } from "pino";
import {
  construirWebhookMensajeTexto,
  firmarPayload,
  telefonoDesdeJid,
  textoDeMensajeBaileys,
} from "./meta-format.js";

const SESSIONS_DIR = path.resolve(process.cwd(), "sessions");
const logger = pino({ level: process.env.BRIDGE_LOG_LEVEL || "warn" });

/**
 * Estado en memoria por empresa: socket de Baileys, último QR (data URL),
 * status expuesto por la API y teléfono conectado. Todo se pierde si el
 * proceso reinicia salvo las credenciales, que Baileys persiste en disco
 * (useMultiFileAuthState) y permiten retomar sin escanear de nuevo.
 */
const sesiones = new Map();

function estadoInicial() {
  return { status: "disconnected", qrDataUrl: null, phone: null, sock: null, iniciando: false };
}

function getEstado(empresaId) {
  let e = sesiones.get(empresaId);
  if (!e) {
    e = estadoInicial();
    sesiones.set(empresaId, e);
  }
  return e;
}

/** POST del payload de webhook (formato Meta) firmado, con 1 reintento simple. */
async function postWebhookFirmado(payload) {
  const url = process.env.CRM_WEBHOOK_URL;
  const secret = process.env.META_APP_SECRET;
  if (!url) {
    logger.warn("CRM_WEBHOOK_URL no configurada: se descarta el mensaje entrante.");
    return;
  }
  const rawBody = JSON.stringify(payload);
  const headers = { "Content-Type": "application/json" };
  if (secret) headers["X-Hub-Signature-256"] = firmarPayload(rawBody, secret);

  for (let intento = 1; intento <= 2; intento++) {
    try {
      const res = await fetch(url, { method: "POST", headers, body: rawBody });
      if (!res.ok) throw new Error(`webhook respondió ${res.status}`);
      return;
    } catch (err) {
      logger.error({ err: String(err), intento }, "fallo al postear webhook al CRM");
      if (intento === 2) {
        logger.error("se agotaron los reintentos: mensaje entrante perdido");
      }
    }
  }
}

/** Inicia (o retoma) la sesión de una empresa. Reconecta sola salvo logout explícito. */
export async function iniciarSesion(empresaId) {
  const estado = getEstado(empresaId);
  if (estado.sock || estado.iniciando) return estado;
  estado.iniciando = true;

  const dir = path.join(SESSIONS_DIR, empresaId);
  await mkdir(dir, { recursive: true });
  const { state, saveCreds } = await useMultiFileAuthState(dir);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger,
    printQRInTerminal: false,
    browser: ["CRM Autos (beta)", "Chrome", "1.0"],
  });

  estado.sock = sock;
  estado.status = "connecting";

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      estado.qrDataUrl = await QRCode.toDataURL(qr);
      estado.status = "qr";
    }

    if (connection === "open") {
      estado.status = "connected";
      estado.qrDataUrl = null;
      estado.phone = telefonoDesdeJid(sock.user?.id);
      estado.iniciando = false;
      logger.warn({ empresaId, phone: estado.phone }, "sesión Baileys conectada");
    }

    if (connection === "close") {
      estado.iniciando = false;
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const esLogout = statusCode === DisconnectReason.loggedOut;
      if (esLogout) {
        estado.status = "disconnected";
        estado.sock = null;
        estado.qrDataUrl = null;
        estado.phone = null;
        logger.warn({ empresaId }, "sesión Baileys deslogueada, no se reconecta sola");
        return;
      }
      // Cualquier otro corte: reconexión automática.
      estado.status = "connecting";
      estado.sock = null;
      logger.warn({ empresaId, statusCode }, "conexión Baileys cortada, reconectando");
      setTimeout(() => {
        iniciarSesion(empresaId).catch((err) =>
          logger.error({ err: String(err), empresaId }, "fallo al reconectar"),
        );
      }, 2000);
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    for (const msg of messages) {
      if (msg.key?.fromMe) continue;
      if (msg.key?.remoteJid?.endsWith("@g.us")) continue; // beta: solo chats individuales
      const texto = textoDeMensajeBaileys(msg);
      if (!texto) continue; // beta: solo texto

      const telefono = telefonoDesdeJid(msg.key.remoteJid);
      const phoneNumberId = `baileys-${empresaId}`;
      const payload = construirWebhookMensajeTexto({
        phoneNumberId,
        telefono,
        nombreContacto: msg.pushName || null,
        waMessageId: msg.key.id,
        timestampSegundos: Number(msg.messageTimestamp) || Math.floor(Date.now() / 1000),
        texto,
      });
      await postWebhookFirmado(payload);
    }
  });

  return estado;
}

/** Envía un mensaje de texto por la sesión de una empresa. Lanza si no está conectada. */
export async function enviarTexto(empresaId, jid, contenido) {
  const estado = getEstado(empresaId);
  if (!estado.sock || estado.status !== "connected") {
    const err = new Error("La sesión de WhatsApp (Baileys) no está conectada.");
    err.status = 409;
    throw err;
  }
  const resultado = await estado.sock.sendMessage(jid, contenido);
  return resultado?.key?.id;
}

export function obtenerEstado(empresaId) {
  const e = getEstado(empresaId);
  return { status: e.status, qrDataUrl: e.qrDataUrl, phone: e.phone };
}

/** Logout explícito + borra credenciales en disco (no reconecta). */
export async function cerrarSesion(empresaId) {
  const estado = sesiones.get(empresaId);
  if (estado?.sock) {
    try {
      await estado.sock.logout();
    } catch {
      // logout puede fallar si ya está desconectado; igual limpiamos estado y disco.
    }
  }
  sesiones.delete(empresaId);
  const dir = path.join(SESSIONS_DIR, empresaId);
  await rm(dir, { recursive: true, force: true });
}
