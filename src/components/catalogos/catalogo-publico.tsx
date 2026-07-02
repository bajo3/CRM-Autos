"use client";

import { useState } from "react";
import { Copy, Check, ExternalLink, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { waUrl, mensajeCatalogo } from "@/lib/data/whatsapp";

/** Tarjeta para compartir el catálogo web público (/p/[slug]) de la agencia. */
export function CatalogoPublico({ url, empresaNombre }: { url: string; empresaNombre: string }) {
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      /* clipboard no disponible: el usuario puede copiar manualmente del input */
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Tu vitrina online siempre actualizada con el stock publicado. Compartí este link por WhatsApp,
        redes o en tus publicaciones — no requiere que el cliente inicie sesión.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="h-9 flex-1 rounded-md border border-input bg-muted/40 px-3 font-mono text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={copiar}>
            {copiado ? <Check className="h-4 w-4 text-ok" /> : <Copy className="h-4 w-4" />}
            {copiado ? "Copiado" : "Copiar"}
          </Button>
          <a href={url} target="_blank" rel="noreferrer">
            <Button type="button" variant="outline" size="sm"><ExternalLink className="h-4 w-4" /> Abrir</Button>
          </a>
          <a href={waUrl(mensajeCatalogo(empresaNombre, url))} target="_blank" rel="noreferrer">
            <Button type="button" variant="outline" size="sm"><MessageCircle className="h-4 w-4 text-ok" /> WhatsApp</Button>
          </a>
        </div>
      </div>
    </div>
  );
}
