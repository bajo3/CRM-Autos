"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Car, LayoutDashboard, Users, Banknote, Settings, ListChecks } from "lucide-react";
import { useEffect } from "react";

const nav = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Home" },
  { href: "/vehicles", icon: Car, label: "Autos" },
  { href: "/leads", icon: Users, label: "Leads" },
  { href: "/credits", icon: Banknote, label: "Créditos" },
  { href: "/tasks", icon: ListChecks, label: "Tareas" },
  { href: "/settings", icon: Settings, label: "Ajustes" },
];

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    for (const item of nav) router.prefetch(item.href);
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
              href={item.href}
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
