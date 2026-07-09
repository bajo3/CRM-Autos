"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Eye, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Botón "Vista previa" + modal con el PDF embebido en un iframe (misma ruta que "Abrir"). */
export function PreviewDocumento({ documentoId, titulo }: { documentoId: string; titulo: string }) {
  const [open, setOpen] = useState(false);
  const href = `/documentos/${documentoId}/abrir`;

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Eye className="h-4 w-4" /> Vista previa
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-border/70 bg-card shadow-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
              <h2 className="truncate text-sm font-semibold">{titulo}</h2>
              <div className="flex shrink-0 items-center gap-2">
                <Link
                  href={href}
                  target="_blank"
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-medium text-foreground shadow-sm hover:bg-muted"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Abrir en pestaña
                </Link>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Cerrar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <iframe src={href} title={titulo} className="min-h-0 flex-1 bg-muted" />
          </div>
        </div>
      )}
    </>
  );
}
