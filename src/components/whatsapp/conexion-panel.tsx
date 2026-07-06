"use client";

import { useEffect, useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { CheckCircle2, XCircle, AlertTriangle, Facebook } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  conectarWhatsappManual,
  desconectarWhatsapp,
  completarEmbeddedSignup,
  type FormState,
} from "@/app/(app)/whatsapp/configuracion/actions";

type CuentaWa = {
  estado: "conectado" | "desconectado" | "error";
  display_phone_number: string | null;
  conectado_at: string | null;
  last_error: string | null;
  conectado_por: { nombre: string; apellido: string } | { nombre: string; apellido: string }[] | null;
} | null;

function nombreConector(c: CuentaWa): string | null {
  if (!c?.conectado_por) return null;
  const p = Array.isArray(c.conectado_por) ? c.conectado_por[0] : c.conectado_por;
  return p ? `${p.nombre} ${p.apellido}`.trim() : null;
}

function SubmitManual() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? "Probando conexión…" : "Conectar y probar"}</Button>;
}

declare global {
  interface Window {
    FB?: { init: (opts: Record<string, unknown>) => void; login: (cb: (r: unknown) => void, opts: Record<string, unknown>) => void };
    fbAsyncInit?: () => void;
  }
}

function cargarSdkFacebook(appId: string): Promise<void> {
  return new Promise((resolve) => {
    if (window.FB) return resolve();
    window.fbAsyncInit = () => {
      window.FB!.init({ appId, autoLogAppEvents: true, xfbml: false, version: "v21.0" });
      resolve();
    };
    if (document.getElementById("facebook-jssdk")) return;
    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.src = "https://connect.facebook.net/es_LA/sdk.js";
    script.async = true;
    document.body.appendChild(script);
  });
}

export function ConexionPanel({
  cuenta,
  appId,
  configId,
  puedeAdministrar,
}: {
  cuenta: CuentaWa;
  appId: string | null;
  configId: string | null;
  puedeAdministrar: boolean;
}) {
  const [state, formAction] = useFormState<FormState, FormData>(conectarWhatsappManual, {});
  const [pending, start] = useTransition();
  const [signupError, setSignupError] = useState<string | null>(null);
  const [signupCargando, setSignupCargando] = useState(false);
  const [mostrarManual, setMostrarManual] = useState(!appId || !configId);

  useEffect(() => {
    const ORIGENES_META = ["https://www.facebook.com", "https://web.facebook.com"];
    function onMessage(event: MessageEvent) {
      if (!ORIGENES_META.includes(event.origin)) return;
      try {
        const data = JSON.parse(event.data);
        if (data.type !== "WA_EMBEDDED_SIGNUP" || data.event !== "FINISH") return;
        const wabaId = data.data?.waba_id as string | undefined;
        const phoneNumberId = data.data?.phone_number_id as string | undefined;
        if (!wabaId || !phoneNumberId) return;
        window.sessionStorage.setItem("wa_embedded_signup_ids", JSON.stringify({ wabaId, phoneNumberId }));
      } catch {
        // Mensajes de otros orígenes de Facebook que no son el evento que esperamos.
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  async function conectarConEmbeddedSignup() {
    if (!appId || !configId) return;
    setSignupError(null);
    setSignupCargando(true);
    try {
      await cargarSdkFacebook(appId);
      window.FB!.login(
        (response: unknown) => {
          const r = response as { authResponse?: { code?: string; userID?: string } };
          const code = r.authResponse?.code;
          if (!code) {
            setSignupError("Se cerró la ventana de Meta sin completar la conexión.");
            setSignupCargando(false);
            return;
          }
          const raw = window.sessionStorage.getItem("wa_embedded_signup_ids");
          const ids = raw ? (JSON.parse(raw) as { wabaId: string; phoneNumberId: string }) : null;
          if (!ids) {
            setSignupError("Meta no envió el WABA / número de teléfono. Volvé a intentar.");
            setSignupCargando(false);
            return;
          }
          start(async () => {
            const res = await completarEmbeddedSignup({
              code,
              wabaId: ids.wabaId,
              phoneNumberId: ids.phoneNumberId,
              businessId: null,
              fbUserId: r.authResponse?.userID ?? null,
            });
            if (res.error) setSignupError(res.error);
            window.sessionStorage.removeItem("wa_embedded_signup_ids");
            setSignupCargando(false);
          });
        },
        {
          config_id: configId,
          response_type: "code",
          override_default_response_type: true,
          extras: { setup: {}, featureType: "whatsapp_business_app_onboarding", sessionInfoVersion: "3" },
        },
      );
    } catch {
      setSignupError("No se pudo cargar el SDK de Meta.");
      setSignupCargando(false);
    }
  }

  const estado = cuenta?.estado ?? "desconectado";

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Conexión con WhatsApp</CardTitle></CardHeader>
      <CardContent className="space-y-4 p-6">
        <div className="flex flex-wrap items-center gap-3">
          {estado === "conectado" && <Badge tone="ok"><CheckCircle2 className="mr-1 h-3 w-3" /> Conectado</Badge>}
          {estado === "desconectado" && <Badge tone="neutral"><XCircle className="mr-1 h-3 w-3" /> Sin conectar</Badge>}
          {estado === "error" && <Badge tone="danger"><AlertTriangle className="mr-1 h-3 w-3" /> Error</Badge>}
          {cuenta?.display_phone_number && <span className="text-sm font-medium">{cuenta.display_phone_number}</span>}
        </div>

        {estado === "conectado" && (
          <p className="text-xs text-muted-foreground">
            Conectado {cuenta?.conectado_at ? new Date(cuenta.conectado_at).toLocaleString("es-AR") : ""}
            {nombreConector(cuenta) ? ` por ${nombreConector(cuenta)}` : ""}.
          </p>
        )}
        {estado === "error" && cuenta?.last_error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{cuenta.last_error}</p>
        )}

        {!puedeAdministrar ? (
          <p className="text-xs text-muted-foreground">Solo el dueño o el encargado pueden gestionar la conexión.</p>
        ) : estado === "conectado" ? (
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => {
              if (confirm("¿Desconectar WhatsApp? Vas a dejar de recibir y enviar mensajes hasta reconectar.")) {
                start(() => desconectarWhatsapp());
              }
            }}
          >
            Desconectar
          </Button>
        ) : (
          <div className="space-y-4">
            {appId && configId && (
              <div>
                <Button type="button" onClick={conectarConEmbeddedSignup} disabled={signupCargando || pending}>
                  <Facebook className="h-4 w-4" /> {signupCargando ? "Conectando…" : "Conectar WhatsApp"}
                </Button>
                {signupError && <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{signupError}</p>}
                <button
                  type="button"
                  onClick={() => setMostrarManual((v) => !v)}
                  className="ml-3 text-xs text-muted-foreground underline"
                >
                  {mostrarManual ? "Ocultar" : "O conectar manualmente"}
                </button>
              </div>
            )}

            {!appId || !configId ? (
              <p className="text-xs text-muted-foreground">
                El flujo oficial de Meta (Embedded Signup) todavía no está configurado en el servidor
                (falta <code>META_APP_ID</code> y/o <code>META_CONFIG_ID</code>). Mientras tanto, conectá con los datos
                manuales de tu cuenta de WhatsApp Business.
              </p>
            ) : null}

            {mostrarManual && (
              <form action={formAction} className="space-y-3 border-t pt-4">
                {state.error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
                <div>
                  <Label htmlFor="waba_id">WABA ID *</Label>
                  <Input id="waba_id" name="waba_id" required />
                  {state.fieldErrors?.waba_id && <p className="mt-1 text-xs text-danger">{state.fieldErrors.waba_id}</p>}
                </div>
                <div>
                  <Label htmlFor="phone_number_id">Phone Number ID *</Label>
                  <Input id="phone_number_id" name="phone_number_id" required />
                  {state.fieldErrors?.phone_number_id && <p className="mt-1 text-xs text-danger">{state.fieldErrors.phone_number_id}</p>}
                </div>
                <div>
                  <Label htmlFor="access_token">Access Token (permanente) *</Label>
                  <Input id="access_token" name="access_token" type="password" required />
                  {state.fieldErrors?.access_token && <p className="mt-1 text-xs text-danger">{state.fieldErrors.access_token}</p>}
                </div>
                <div>
                  <Label htmlFor="business_id">Business ID (opcional)</Label>
                  <Input id="business_id" name="business_id" />
                </div>
                <SubmitManual />
              </form>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
