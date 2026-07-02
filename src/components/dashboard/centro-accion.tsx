import Link from "next/link";
import {
  Phone, MessageCircle, CalendarClock, FileText, CreditCard,
  BookmarkCheck, PackageSearch, CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { waUrl } from "@/lib/data/whatsapp";
import { getAccionesComerciales, type AccionItem, type Urgencia } from "@/lib/data/acciones-comerciales";
import { cambiarEstadoSeguimiento } from "@/app/(app)/seguimientos/actions";

const ICONO_TIPO: Record<AccionItem["tipo"], typeof Phone> = {
  seguimiento: CalendarClock,
  presupuesto: FileText,
  credito: CreditCard,
  reserva: BookmarkCheck,
  encargo: PackageSearch,
};

const URGENCIA_BADGE: Record<Urgencia, { tone: "danger" | "warn" | "info"; label: string }> = {
  vencido: { tone: "danger", label: "Vencido" },
  hoy: { tone: "warn", label: "Hoy" },
  oportunidad: { tone: "info", label: "Oportunidad" },
};

export async function CentroAccionComercial() {
  const items = await getAccionesComerciales();

  if (items.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
        No hay nada urgente por ahora. 🎉 Los seguimientos vencidos, presupuestos por vencer,
        créditos por terminar, reservas y encargos urgentes van a aparecer acá.
      </div>
    );
  }

  return (
    <div className="divide-y rounded-lg border bg-card">
      {items.map((item) => {
        const Icono = ICONO_TIPO[item.tipo];
        const badge = URGENCIA_BADGE[item.urgencia];
        return (
          <div key={item.key} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="flex min-w-0 items-start gap-3">
              <Icono className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{item.cliente}</span>
                  <Badge tone={badge.tone}>{badge.label}</Badge>
                </div>
                <p className="truncate text-sm text-muted-foreground">{item.detalle}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {item.telefono && (
                <a
                  href={`tel:${item.telefono.replace(/\D/g, "")}`}
                  title="Llamar"
                  className="rounded-md border p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Phone className="h-4 w-4" />
                </a>
              )}
              {item.telefono && item.whatsappMsg && (
                <a
                  href={waUrl(item.whatsappMsg, item.telefono)}
                  target="_blank"
                  title="WhatsApp"
                  className="rounded-md border p-1.5 text-ok hover:bg-muted"
                >
                  <MessageCircle className="h-4 w-4" />
                </a>
              )}
              {item.tipo === "seguimiento" && (
                <form action={cambiarEstadoSeguimiento.bind(null, item.refId, "realizado")}>
                  <button
                    type="submit"
                    title="Marcar como realizado"
                    className="rounded-md border p-1.5 text-ok hover:bg-muted"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </button>
                </form>
              )}
              <Link href={item.href} className="rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-muted">
                Ver
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
