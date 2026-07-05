import {
  LayoutDashboard, Car, Users, CalendarClock, PackageSearch, FileText,
  ShoppingCart, BookmarkCheck, CreditCard, HeartHandshake, ClipboardCheck,
  FileSignature, Wrench, Megaphone, BadgePercent, Repeat2, Gauge,
  BarChart3, UserCog, Settings, ListChecks, FileBox, MessageCircle,
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
    title: "WhatsApp",
    items: [
      { href: "/whatsapp", label: "Bandeja", icon: MessageCircle },
      { href: "/whatsapp/programados", label: "Programados", icon: CalendarClock },
      { href: "/whatsapp/plantillas", label: "Plantillas", icon: FileText },
      { href: "/whatsapp/configuracion", label: "Configuración", icon: Settings },
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
