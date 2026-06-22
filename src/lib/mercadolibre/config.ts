/**
 * Configuración de la integración con MercadoLibre.
 *
 * Las credenciales viven en variables de entorno (Vercel / .env.local), nunca
 * en el código:
 *  - ML_CLIENT_ID     → App ID de la aplicación de MercadoLibre Developers.
 *  - ML_CLIENT_SECRET → Client Secret (sensible).
 *  - ML_REDIRECT_URI  → URL de callback registrada en la app de ML.
 */

/** Sitio de MercadoLibre Argentina. */
export const ML_SITE = "MLA";

/** Endpoints de OAuth y API (host .com.ar para la pantalla de autorización). */
export const ML_AUTH_URL = "https://auth.mercadolibre.com.ar/authorization";
export const ML_TOKEN_URL = "https://api.mercadolibre.com/oauth/token";
export const ML_API = "https://api.mercadolibre.com";

export type MlConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

/** Lee y valida las credenciales. Lanza si falta alguna. */
export function mlConfig(): MlConfig {
  const clientId = process.env.ML_CLIENT_ID;
  const clientSecret = process.env.ML_CLIENT_SECRET;
  const redirectUri = process.env.ML_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Faltan credenciales de MercadoLibre (ML_CLIENT_ID / ML_CLIENT_SECRET / ML_REDIRECT_URI).",
    );
  }
  return { clientId, clientSecret, redirectUri };
}

/** True si las credenciales están configuradas (para mostrar/ocultar UI). */
export function mlConfigurado(): boolean {
  return Boolean(
    process.env.ML_CLIENT_ID &&
      process.env.ML_CLIENT_SECRET &&
      process.env.ML_REDIRECT_URI,
  );
}
