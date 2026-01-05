"use client";
import Link from "next/link";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Car, LayoutDashboard, Users, Banknote, Settings, ListChecks } from "lucide-react";
import { useEffect } from "react";

const nav: Array<{ href: Route; icon: any; label: string }> = [
  { href: "/dashboard" as Route, icon: LayoutDashboard, label: "Home" },
  { href: "/vehicles" as Route, icon: Car, label: "Autos" },
  { href: "/leads" as Route, icon: Users, label: "Leads" },
  { href: "/credits" as Route, icon: Banknote, label: "Créditos" },
  { href: "/tasks" as Route, icon: ListChecks, label: "Tareas" },
  { href: "/settings" as Route, icon: Settings, label: "Ajustes" },
];

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    for (const item of nav) router.prefetch((item.href as unknown) as Route);
  }, [router]);
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-screen-sm items-center justify-between px-2 py-2">
        {nav.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={(item.href as unknown) as Route}
              className={cn(
                "flex w-full flex-col items-center gap-1 rounded-2xl py-2 text-xs",
                active ? "text-slate-900" : "text-slate-500"
              )}
            >
              <Icon className={cn("h-5 w-5", active ? "text-slate-900" : "text-slate-500")} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
