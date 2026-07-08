import { NotificationBell } from "@/components/notification-bell";
import { getNotificaciones } from "@/lib/data/notificaciones";

/** Wrapper server-side de la campanita, para poder streamearla con Suspense sin bloquear el shell. */
export async function NotificationBellServer() {
  const items = await getNotificaciones();
  return <NotificationBell items={items} />;
}
