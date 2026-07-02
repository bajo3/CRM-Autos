import {
  LayoutDashboard, Car, Users, CalendarClock, PackageSearch, FileText,
  ShoppingCart, BookmarkCheck, CreditCard, HeartHandshake, ClipboardCheck,
  FileSignature, Wrench, Megaphone, BadgePercent, Repeat2, Gauge,
  BarChart3, UserCog, Settings, ListChecks, FileBox,
} from "lucide-react";

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
    title: "Comercial",
    items: [
      { href: "/clientes", label: "Clientes / Leads", icon: Users },
      { href: "/seguimientos", label: "Seguimientos", icon: CalendarClock },
      { href: "/encargos", label: "Encargos", icon: PackageSearch },
      { href: "/presupuestos", label: "Presupuestos", icon: FileText },
      { href: "/test-drive", label: "Test Drive", icon: ClipboardCheck },
    ],
  },
  {
    title: "Stock",
    items: [
      { href: "/stock", label: "Stock de autos", icon: Car },
      { href: "/permutas", label: "Permutas", icon: Repeat2 },
      { href: "/tasaciones", label: "Tasaciones", icon: Gauge, pendiente: true },
      { href: "/taller", label: "Taller / Preparación", icon: Wrench, pendiente: true },
      { href: "/consignados", label: "Consignados", icon: FileBox, pendiente: true },
      { href: "/publicaciones", label: "Publicaciones", icon: Megaphone },
    ],
  },
  {
    title: "Operaciones",
    items: [
      { href: "/ventas", label: "Ventas", icon: ShoppingCart },
      { href: "/reservas", label: "Reservas", icon: BookmarkCheck },
      { href: "/creditos", label: "Créditos", icon: CreditCard },
      { href: "/postventa", label: "Postventa", icon: HeartHandshake },
      { href: "/comisiones", label: "Comisiones", icon: BadgePercent },
    ],
  },
  {
    title: "Documentación",
    items: [
      { href: "/vtv", label: "VTV", icon: ListChecks },
      { href: "/documentos", label: "Documentos", icon: FileSignature },
      { href: "/catalogos", label: "Catálogos", icon: FileBox },
    ],
  },
  {
    title: "Análisis",
    items: [{ href: "/reportes", label: "Reportes", icon: BarChart3 }],
  },
  {
    title: "Administración",
    items: [
      { href: "/usuarios", label: "Usuarios y roles", icon: UserCog },
      { href: "/configuracion", label: "Configuración", icon: Settings },
    ],
  },
];
