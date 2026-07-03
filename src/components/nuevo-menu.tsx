"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Plus, Users, Car, FileText, CalendarClock } from "lucide-react";

const OPCIONES = [
  { href: "/clientes/nuevo", label: "Cliente", icon: Users },
  { href: "/stock/nuevo", label: "Vehículo", icon: Car },
  { href: "/presupuestos/nuevo", label: "Presupuesto", icon: FileText },
  { href: "/seguimientos", label: "Seguimiento", icon: CalendarClock },
];

/** Alta rápida desde cualquier pantalla: evita tener que buscar el módulo en el menú. */
export function NuevoMenu() {
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
        className="flex items-center gap-1.5 rounded-md bg-brand-800 px-2.5 py-1.5 text-sm font-medium text-white hover:bg-brand-900 sm:px-3"
      >
        <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Nuevo</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-md border bg-white py-1 shadow-lg">
          {OPCIONES.map((o) => {
            const Icon = o.icon;
            return (
              <Link
                key={o.href}
                href={o.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
              >
                <Icon className="h-4 w-4 text-muted-foreground" /> {o.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
