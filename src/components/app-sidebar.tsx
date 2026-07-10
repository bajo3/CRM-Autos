"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Car, ChevronDown, Menu, X } from "lucide-react";
import { navigationForRole, type NavItem } from "@/lib/nav";
import type { Rol } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";

export function AppSidebar({ empresaNombre, rol, whatsappConectado }: { empresaNombre: string; rol: Rol; whatsappConectado: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const navigation = navigationForRole(rol, whatsappConectado);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const renderItem = (item: NavItem) => {
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setOpen(false)}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
          isActive(item.href)
            ? "bg-white/10 font-medium text-white shadow-[inset_2px_0_0_0_theme(colors.brand.500)]"
            : "text-white/65 hover:bg-white/5 hover:text-white",
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="flex-1 truncate">{item.label}</span>
      </Link>
    );
  };

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
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-white/10 bg-gradient-to-b from-brand-900 to-[#0e1a3d] text-white shadow-pop transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-white/10 px-4">
          <Link href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 shadow-sm">
              <Car className="h-4 w-4" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold tracking-tight">CRM Automotor</p>
              <p className="truncate text-xs text-white/50">{empresaNombre}</p>
            </div>
          </Link>
          <button onClick={() => setOpen(false)} className="lg:hidden" aria-label="Cerrar menú">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto scrollbar-thin px-2 py-3">
          <div className="mb-3">
            <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/35">Principal</p>
            {navigation.principales.map(renderItem)}
          </div>
          {navigation.mas.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setMoreOpen((value) => !value)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/65 transition-colors hover:bg-white/5 hover:text-white"
                aria-expanded={moreOpen}
              >
                <Menu className="h-4 w-4" />
                <span className="flex-1 text-left">Más herramientas</span>
                <ChevronDown className={cn("h-4 w-4 transition-transform", moreOpen && "rotate-180")} />
              </button>
              {moreOpen && navigation.mas.map((section) => (
                <div key={section.title} className="mt-3">
                  <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-white/35">{section.title}</p>
                  {section.items.map(renderItem)}
                </div>
              ))}
            </div>
          )}
        </nav>
      </aside>
    </>
  );
}
