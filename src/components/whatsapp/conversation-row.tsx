import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { iniciales, formatHoraRelativa } from "@/app/(app)/whatsapp/lib";
import { nombreConversacion, botEfectivo, type ConversacionListItem } from "@/app/(app)/whatsapp/data";

export function ConversationRow({
  conversacion: c,
  activa,
}: {
  conversacion: ConversacionListItem;
  activa?: boolean;
}) {
  const nombre = nombreConversacion(c);
  const botOn = botEfectivo(c.bot_activo, c.bot_pausado_hasta);

  return (
    <li>
      <Link
        href={`/whatsapp/${c.id}`}
        className={cn(
          "flex items-start gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-muted/60",
          activa && "bg-muted",
        )}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-800 text-xs font-semibold text-white">
          {iniciales(nombre)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-medium">{nombre}</span>
            <span className="shrink-0 text-[11px] text-muted-foreground">{formatHoraRelativa(c.last_message_at)}</span>
          </div>
          <p className="truncate text-xs text-muted-foreground">{c.last_message_preview || "Sin mensajes"}</p>
          <div className="mt-1 flex items-center gap-1.5">
            {c.estado !== "abierta" && (
              <Badge tone={c.estado === "cerrada" ? "neutral" : "warn"} className="text-[10px]">
                {c.estado === "cerrada" ? "Cerrada" : "Pendiente"}
              </Badge>
            )}
            {!c.asignado_a && <Badge tone="info" className="text-[10px]">Sin asignar</Badge>}
            {!botOn && <Badge tone="neutral" className="text-[10px]">Bot pausado</Badge>}
          </div>
        </div>
        {c.no_leidos > 0 && (
          <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ok text-[10px] font-bold text-white">
            {c.no_leidos > 9 ? "9+" : c.no_leidos}
          </span>
        )}
      </Link>
    </li>
  );
}
