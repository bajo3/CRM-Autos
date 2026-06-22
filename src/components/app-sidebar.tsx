"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Car, Menu, X } from "lucide-react";
import { NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function AppSidebar({ empresaNombre }: { empresaNombre: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      {/* Botón móvil */}
      <button
        onClick={() => setOpen(true)}
        className="fixed left-4 top-3 z-40 rounded-md border bg-white p-2 shadow-sm lg:hidden"
        aria-label="Abrir menú"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-brand-900 text-white transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-white/10 px-4">
          <Link href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
            <div className="flex h-8 w-8 items-center justify-center rounded bg-white/10">
              <Car className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold">CRM Automotor</p>
              <p className="truncate text-xs text-white/60">{empresaNombre}</p>
            </div>
          </Link>
          <button onClick={() => setOpen(false)} className="lg:hidden" aria-label="Cerrar menú">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto scrollbar-thin px-2 py-3">
          {NAV.map((section) => (
            <div key={section.title} className="mb-4">
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                {section.title}
              </p>
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                      isActive(item.href)
                        ? "bg-white/15 font-medium text-white"
                        : "text-white/70 hover:bg-white/10 hover:text-white",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.pendiente && (
                      <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] uppercase text-white/50">
                        Pronto
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
