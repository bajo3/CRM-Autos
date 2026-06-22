import { ML_AUTH_URL, mlConfig } from "./config";
import { firmarState } from "./state";

/** Construye la URL de autorización de MercadoLibre para conectar una empresa. */
export function urlAutorizacion(empresaId: string): string {
  const { clientId, redirectUri } = mlConfig();
  const u = new URL(ML_AUTH_URL);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("client_id", clientId);
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("state", firmarState(empresaId));
  return u.toString();
}
