"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NotificacionItem } from "@/lib/data/notificaciones";

const TONO_DOT: Record<NotificacionItem["tono"], string> = {
  danger: "bg-danger",
  warn: "bg-warn",
  info: "bg-blue-500",
};

/** Campanita del topbar: WhatsApp sin leer + vencimientos de hoy, calculado por el servidor en cada carga. */
export function NotificationBell({ items }: { items: NotificacionItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
        title="Notificaciones"
      >
        <Bell className="h-5 w-5" />
        {items.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
            {items.length > 9 ? "9+" : items.length}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-80 rounded-lg border bg-white py-1 shadow-pop">
          <div className="border-b px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Notificaciones
          </div>
          {items.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">Estás al día. 🎉</p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {items.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-start gap-2 px-3 py-2.5 text-sm hover:bg-muted"
                >
                  <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", TONO_DOT[item.tono])} />
                  <span className="min-w-0">
                    <span className="block font-medium">{item.titulo}</span>
                    <span className="block truncate text-xs text-muted-foreground">{item.detalle}</span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
