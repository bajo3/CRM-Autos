import { logout } from "@/app/login/actions";
import { humanize } from "@/lib/format";

export function Topbar({
  nombre,
  rol,
}: {
  nombre: string;
  rol: string;
}) {
  const iniciales =
    nombre
      .split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-end gap-3 border-b bg-white/80 px-4 backdrop-blur lg:px-6">
      <div className="flex items-center gap-3">
        <div className="text-right leading-tight">
          <p className="text-sm font-medium">{nombre || "Usuario"}</p>
          <p className="text-xs text-muted-foreground">{humanize(rol)}</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-800 text-sm font-semibold text-white">
          {iniciales}
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="rounded-md border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted"
          >
            Salir
          </button>
        </form>
      </div>
    </header>
  );
}
