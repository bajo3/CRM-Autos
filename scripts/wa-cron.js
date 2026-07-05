/**
 * Dispara el worker de mensajes programados de WhatsApp contra el dev server
 * local. Uso: npm run wa:cron  (con `npm run dev` corriendo en otra terminal).
 */
const fs = require("fs");
const path = require("path");

function leerEnvLocal() {
  const envPath = path.join(__dirname, "..", ".env.local");
  const contenido = fs.readFileSync(envPath, "utf8");
  const env = {};
  for (const linea of contenido.split("\n")) {
    const m = linea.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

async function main() {
  const env = leerEnvLocal();
  const secret = env.WHATSAPP_CRON_SECRET;
  if (!secret) {
    console.error("Falta WHATSAPP_CRON_SECRET en .env.local");
    process.exit(1);
  }
  const url = `http://localhost:${env.PORT || 3000}/api/whatsapp/cron`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
  });
  const body = await res.json().catch(() => ({}));
  console.log(`HTTP ${res.status}`, body);
}

main();
