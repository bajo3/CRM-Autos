import Link from "next/link";
import { getSessionContext } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { EmptyState } from "@/components/ui/empty-state";
import { LiveRefresh } from "@/components/whatsapp/live-refresh";
import { ConversationRow } from "@/components/whatsapp/conversation-row";
import { listarConversaciones, type FiltrosBandeja } from "@/app/(app)/whatsapp/data";
import { PAGE_SIZE } from "@/app/(app)/whatsapp/lib";

/**
 * Shell de 2 paneles (lista + detalle) compartido por /whatsapp y /whatsapp/[id].
 * Next.js App Router no pasa `searchParams` a layout.tsx, así que este
 * componente se invoca desde ambas páginas hoja con sus propios searchParams.
 */
export async function BandejaShell({
  searchParams,
  activeId,
  children,
}: {
  searchParams: FiltrosBandeja;
  activeId?: string;
  children: React.ReactNode;
}) {
  const ctx = await getSessionContext();
  const puedeVer = can(ctx?.profile?.rol, "whatsapp.ver");

  if (!puedeVer || !ctx?.profile?.empresa_id) {
    return (
      <EmptyState
        title="Sin acceso a WhatsApp"
        description="Tu rol no tiene permiso para ver esta sección. Pedile a un encargado o al dueño que te lo habilite."
      />
    );
  }

  const { conversaciones, total, page } = await listarConversaciones(
    ctx.profile.empresa_id,
    searchParams,
  );
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const qs = (extra: Record<string, string>) => {
    const sp = new URLSearchParams();
    if (searchParams.q) sp.set("q", searchParams.q);
    if (searchParams.estado) sp.set("estado", searchParams.estado);
    if (searchParams.sin_asignar) sp.set("sin_asignar", searchParams.sin_asignar);
    if (searchParams.bot) sp.set("bot", searchParams.bot);
    Object.entries(extra).forEach(([k, v]) => (v ? sp.set(k, v) : sp.delete(k)));
    return `/whatsapp?${sp.toString()}`;
  };

  return (
    <div className="flex h-[calc(100vh-6.5rem)] min-w-0 gap-4 overflow-x-auto overflow-y-hidden">
      <LiveRefresh />
      <aside className="flex w-64 shrink-0 flex-col overflow-hidden rounded-lg border bg-card">
        <div className="border-b p-3">
          <form action="/whatsapp" method="get" className="space-y-2">
            <input
              type="text"
              name="q"
              defaultValue={searchParams.q ?? ""}
              placeholder="Nombre, teléfono o auto…"
              className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <div className="flex flex-wrap gap-1.5 text-xs">
              <FiltroChip href={qs({ estado: "" })} activo={!searchParams.estado}>Todas</FiltroChip>
              <FiltroChip href={qs({ estado: "abierta" })} activo={searchParams.estado === "abierta"}>Abiertas</FiltroChip>
              <FiltroChip href={qs({ estado: "pendiente" })} activo={searchParams.estado === "pendiente"}>Pendientes</FiltroChip>
              <FiltroChip href={qs({ estado: "cerrada" })} activo={searchParams.estado === "cerrada"}>Cerradas</FiltroChip>
              <FiltroChip href={qs({ sin_asignar: searchParams.sin_asignar === "1" ? "" : "1" })} activo={searchParams.sin_asignar === "1"}>Sin asignar</FiltroChip>
              <FiltroChip href={qs({ bot: searchParams.bot === "on" ? "" : "on" })} activo={searchParams.bot === "on"}>Bot activo</FiltroChip>
              <FiltroChip href={qs({ bot: searchParams.bot === "off" ? "" : "off" })} activo={searchParams.bot === "off"}>Bot pausado</FiltroChip>
            </div>
          </form>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {conversaciones.length === 0 ? (
            <div className="p-4">
              <EmptyState title="Sin conversaciones" description="Todavía no llegaron mensajes por WhatsApp con estos filtros." />
            </div>
          ) : (
            <ul className="divide-y">
              {conversaciones.map((c) => (
                <ConversationRow key={c.id} conversacion={c} activa={c.id === activeId} />
              ))}
            </ul>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t p-2 text-xs text-muted-foreground">
            <Link href={qs({ page: String(Math.max(1, page - 1)) })} className="hover:underline">← Anterior</Link>
            <span>Página {page} de {totalPages}</span>
            <Link href={qs({ page: String(Math.min(totalPages, page + 1)) })} className="hover:underline">Siguiente →</Link>
          </div>
        )}
      </aside>

      <div className="min-w-[420px] flex-1 overflow-hidden rounded-lg border bg-card">{children}</div>
    </div>
  );
}

function FiltroChip({ href, activo, children }: { href: string; activo: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={
        activo
          ? "rounded-full bg-brand-800 px-2.5 py-1 font-medium text-white"
          : "rounded-full border px-2.5 py-1 text-muted-foreground hover:bg-muted"
      }
    >
      {children}
    </Link>
  );
}
