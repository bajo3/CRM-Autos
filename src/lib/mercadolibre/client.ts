/**
 * Cliente HTTP de la API de MercadoLibre: intercambio/refresh de tokens y
 * llamadas autenticadas. Sin estado ni acceso a la base — esa parte vive en
 * `cuenta.ts` (servidor).
 */

import { ML_API, ML_TOKEN_URL, mlConfig } from "./config";

export type MlTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  user_id: number;
  refresh_token: string;
};

export type MlUsuario = {
  id: number;
  nickname: string;
  email?: string;
  first_name?: string;
  last_name?: string;
};

async function postToken(body: Record<string, string>): Promise<MlTokenResponse> {
  const res = await fetch(ML_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams(body),
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`MercadoLibre token ${res.status}: ${text}`);
  }
  return JSON.parse(text) as MlTokenResponse;
}

/** Intercambia el `code` del callback por tokens. */
export function intercambiarCodigo(code: string): Promise<MlTokenResponse> {
  const { clientId, clientSecret, redirectUri } = mlConfig();
  return postToken({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
  });
}

/** Renueva el access_token usando el refresh_token. */
export function refrescarToken(refreshToken: string): Promise<MlTokenResponse> {
  const { clientId, clientSecret } = mlConfig();
  return postToken({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });
}

/** GET autenticado contra la API de ML. Devuelve JSON parseado. */
export async function mlGet<T = unknown>(path: string, token: string): Promise<T> {
  const res = await fetch(`${ML_API}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`ML GET ${path} ${res.status}: ${text}`);
  return (text ? JSON.parse(text) : null) as T;
}

/** Llamada con cuerpo JSON (POST/PUT/DELETE) autenticada contra la API de ML. */
export async function mlSend<T = unknown>(
  method: "POST" | "PUT" | "DELETE",
  path: string,
  token: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${ML_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`ML ${method} ${path} ${res.status}: ${text}`);
  return (text ? JSON.parse(text) : null) as T;
}

/** Datos del usuario autenticado (para mostrar la cuenta conectada). */
export function obtenerUsuario(token: string): Promise<MlUsuario> {
  return mlGet<MlUsuario>("/users/me", token);
}
