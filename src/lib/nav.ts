import {
  LayoutDashboard, Car, Users, CalendarClock, PackageSearch, FileText,
  ShoppingCart, BookmarkCheck, CreditCard, HeartHandshake, ClipboardCheck,
  FileSignature, Wrench, Megaphone, BadgePercent, Repeat2, Gauge,
  BarChart3, UserCog, Settings, ListChecks, FileBox, MessageCircle,
} from "lucide-react";
import type { Rol } from "@/lib/auth/permissions";

export type NavItem = {
  href: string;
  label: string;
  icon: typeof Car;
  /** Etapa donde el módulo queda funcional (informativo en la UI). */
  pendiente?: boolean;
};

export type NavSection = { title: string; items: NavItem[] };

export const NAV: NavSection[] = [
  {
    title: "Principal",
    items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Ventas",
    items: [
      { href: "/clientes", label: "Clientes / Leads", icon: Users },
      { href: "/seguimientos", label: "Seguimientos", icon: CalendarClock },
      { href: "/presupuestos", label: "Presupuestos", icon: FileText },
      { href: "/ventas", label: "Ventas", icon: ShoppingCart },
      { href: "/reservas", label: "Reservas", icon: BookmarkCheck },
    ],
  },
  {
    title: "WhatsApp",
    items: [
      { href: "/whatsapp", label: "Bandeja", icon: MessageCircle },
      { href: "/whatsapp/programados", label: "Programados", icon: CalendarClock },
      { href: "/whatsapp/plantillas", label: "Plantillas", icon: FileText },
      { href: "/whatsapp/configuracion", label: "Configuración", icon: Settings },
    ],
  },
  {
    title: "Stock",
    items: [
      { href: "/stock", label: "Stock de autos", icon: Car },
      { href: "/tasaciones", label: "Tasaciones", icon: Gauge },
      { href: "/permutas", label: "Permutas", icon: Repeat2 },
      { href: "/encargos", label: "Encargos", icon: PackageSearch },
      { href: "/consignados", label: "Consignados", icon: FileBox },
      { href: "/taller", label: "Taller / Preparación", icon: Wrench },
    ],
  },
  {
    title: "Postventa",
    items: [
      { href: "/postventa", label: "Postventa", icon: HeartHandshake },
      { href: "/creditos", label: "Créditos", icon: CreditCard },
      { href: "/test-drive", label: "Test Drive", icon: ClipboardCheck },
    ],
  },
  {
    title: "Herramientas",
    items: [
      { href: "/catalogos", label: "Catálogos", icon: FileBox },
      { href: "/documentos", label: "Documentos", icon: FileSignature },
      { href: "/publicaciones", label: "Publicaciones", icon: Megaphone },
      { href: "/vtv", label: "VTV", icon: ListChecks },
    ],
  },
  {
    title: "Administración",
    items: [
      { href: "/reportes", label: "Reportes", icon: BarChart3 },
      { href: "/comisiones", label: "Comisiones", icon: BadgePercent },
      { href: "/usuarios", label: "Usuarios y roles", icon: UserCog },
      { href: "/configuracion", label: "Configuración", icon: Settings },
    ],
  },
];

const PRINCIPALES_POR_ROL: Record<Rol, string[]> = {
  dueno: ["/", "/clientes", "/stock", "/presupuestos", "/whatsapp", "/ventas", "/reportes", "/usuarios"],
  encargado: ["/", "/clientes", "/stock", "/presupuestos", "/whatsapp", "/ventas", "/reportes", "/usuarios"],
  vendedor: ["/", "/clientes", "/stock", "/presupuestos", "/whatsapp"],
  administrativo: ["/", "/clientes", "/stock", "/presupuestos", "/reportes", "/creditos"],
  gestoria: ["/", "/stock", "/documentos", "/vtv"],
  solo_lectura: ["/", "/clientes", "/stock", "/reportes"],
};

const OCULTOS_POR_ROL: Partial<Record<Rol, string[]>> = {
  vendedor: ["/reportes", "/comisiones", "/usuarios", "/configuracion", "/whatsapp/configuracion", "/publicaciones"],
  administrativo: ["/comisiones", "/usuarios", "/configuracion", "/whatsapp/configuracion", "/publicaciones"],
  gestoria: [
    "/clientes", "/seguimientos", "/presupuestos", "/ventas", "/reservas", "/whatsapp",
    "/tasaciones", "/permutas", "/encargos", "/consignados", "/taller", "/postventa",
    "/creditos", "/test-drive", "/catalogos", "/publicaciones", "/reportes", "/comisiones",
    "/usuarios", "/configuracion",
  ],
  solo_lectura: [
    "/seguimientos", "/presupuestos", "/ventas", "/reservas", "/whatsapp", "/tasaciones",
    "/permutas", "/encargos", "/consignados", "/taller", "/postventa", "/creditos",
    "/test-drive", "/catalogos", "/documentos", "/publicaciones", "/vtv", "/comisiones",
    "/usuarios", "/configuracion",
  ],
};

function coincideRuta(href: string, rutas: string[]) {
  return rutas.some((ruta) => href === ruta || href.startsWith(`${ruta}/`));
}

/** Menú progresivo: lo cotidiano queda a la vista y el resto vive en “Más”. */
export function navigationForRole(rol: Rol, whatsappConectado = true): { principales: NavItem[]; mas: NavSection[] } {
  const principalesHref = PRINCIPALES_POR_ROL[rol].filter((href) => whatsappConectado || href !== "/whatsapp");
  const ocultos = OCULTOS_POR_ROL[rol] ?? [];
  const visibles = NAV.map((section) => ({
    ...section,
    items: section.items.filter((item) => !coincideRuta(item.href, ocultos)),
  })).filter((section) => section.items.length > 0);

  const principales = principalesHref
    .map((href) => visibles.flatMap((section) => section.items).find((item) => item.href === href))
    .filter((item): item is NavItem => Boolean(item));
  const principalSet = new Set(principales.map((item) => item.href));
  const mas = visibles
    .map((section) => ({
      ...section,
      title: section.title === "WhatsApp" && !whatsappConectado ? "WhatsApp · Beta sin conectar" : section.title,
      items: section.items.filter((item) => !principalSet.has(item.href)),
    }))
    .filter((section) => section.items.length > 0);

  return { principales, mas };
}
