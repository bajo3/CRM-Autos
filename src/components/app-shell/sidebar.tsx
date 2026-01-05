"use client";
import Link from "next/link";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Car, LayoutDashboard, Users, Banknote, Settings, ListChecks } from "lucide-react";
import { useEffect } from "react";
import { useDealership } from "@/features/dealership/useDealership";

const nav: Array<{ href: Route; label: string; icon: any }> = [
  { href: "/dashboard" as Route, label: "Dashboard", icon: LayoutDashboard },
  { href: "/vehicles" as Route, label: "Vehículos", icon: Car },
  { href: "/leads" as Route, label: "Leads", icon: Users },
  { href: "/credits" as Route, label: "Créditos", icon: Banknote },
  { href: "/tasks" as Route, label: "Tareas", icon: ListChecks },
  { href: "/settings" as Route, label: "Ajustes", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { row } = useDealership();

  // Prefetch de rutas del menú (reduce la espera en la primera navegación)
  useEffect(() => {
    for (const item of nav) router.prefetch((item.href as unknown) as Route);
  }, [router]);

  const brandName = row?.name ?? "Autos CRM";
  const brandSubtitle = row?.city ?? "CRM";

  return (
    <aside className="hidden md:flex md:w-72 md:flex-col md:gap-4 md:border-r md:border-slate-200 md:bg-white md:p-4">
      <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-white px-4 py-3 shadow-soft">
        <div className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-2xl bg-slate-900 text-white">
          {row?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={row.logo_url} alt={brandName} className="h-full w-full object-cover" />
          ) : (
            <Car className="h-5 w-5" />
          )}
        </div>

        <div className="leading-tight min-w-0">
          <div className="text-sm font-semibold text-slate-900 truncate">{brandName}</div>
          <div className="text-xs text-slate-500 truncate">{brandSubtitle}</div>
        </div>
      </div>

      <nav className="mt-2 flex flex-col gap-1">
        {nav.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={(item.href as unknown) as Route}
              className={cn(
                "group flex items-center gap-3 rounded-2xl px-3 py-2 text-sm transition",
                active ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-50"
              )}
            >
              <Icon className={cn("h-4 w-4", active ? "text-white" : "text-slate-500 group-hover:text-slate-700")} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto" />
    </aside>
  );
}