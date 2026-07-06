"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { QrCode, AlertTriangle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { iniciarConexionQr, estadoConexionQr } from "@/app/(app)/whatsapp/configuracion/actions";

type EstadoQr = {
  status: "qr" | "connecting" | "connected" | "disconnected";
  qrDataUrl?: string | null;
  phone?: string | null;
  error?: string;
};

const POLL_MS = 2500;

/**
 * Card "Conexión beta por QR": vía Baileys (no oficial) para probar el módulo
 * de WhatsApp mientras la verificación de negocio de Meta está pendiente.
 * Solo se muestra si el servidor confirma que hay un bridge configurado
 * (bridgeHabilitado), nunca se expone la URL/secret del bridge al cliente.
 */
export function ConexionQrPanel({ yaConectadoBaileys }: { yaConectadoBaileys: boolean }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [estado, setEstado] = useState<EstadoQr | null>(null);
  const [pending, start] = useTransition();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function detenerPoll() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  useEffect(() => () => detenerPoll(), []);

  async function consultarEstado() {
    const r = await estadoConexionQr();
    setEstado(r);
    if (r.status === "connected") {
      detenerPoll();
      router.refresh();
    }
  }

  function conectar() {
    setEstado(null);
    start(async () => {
      const r = await iniciarConexionQr();
      if (r.error) {
        setEstado({ status: "disconnected", error: r.error });
        return;
      }
      setAbierto(true);
      await consultarEstado();
      detenerPoll();
      intervalRef.current = setInterval(consultarEstado, POLL_MS);
    });
  }

  return (
    <Card className="border-amber-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <QrCode className="h-4 w-4" /> Conexión beta por QR (no oficial)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-6">
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <AlertTriangle className="mb-1 h-3.5 w-3.5" /> Conexión no oficial (Baileys) para la beta: usar un número
          de pruebas; riesgo de bloqueo por parte de WhatsApp. En producción se usará la API oficial de Meta.
        </div>

        {yaConectadoBaileys && (
          <Badge tone="ok">Conectado por QR (beta)</Badge>
        )}

        {!yaConectadoBaileys && !abierto && (
          <Button type="button" variant="outline" onClick={conectar} disabled={pending}>
            {pending ? "Iniciando…" : "Conectar por QR (beta)"}
          </Button>
        )}

        {estado?.error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{estado.error}</p>
        )}

        {abierto && !yaConectadoBaileys && (
          <div className="flex flex-col items-center gap-3 border-t pt-4">
            {estado?.status === "qr" && estado.qrDataUrl && (
              <>
                <img src={estado.qrDataUrl} alt="Código QR de WhatsApp" className="h-56 w-56 rounded-md border" />
                <p className="text-xs text-muted-foreground">
                  Escaneá con WhatsApp → Dispositivos vinculados → Vincular un dispositivo.
                </p>
              </>
            )}
            {(estado?.status === "connecting" || (!estado?.status && !estado?.error)) && (
              <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Conectando…
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
