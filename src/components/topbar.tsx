import { logout } from "@/app/login/actions";
import { humanize } from "@/lib/format";
import { GlobalSearch } from "@/components/global-search";
import { NuevoMenu } from "@/components/nuevo-menu";

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
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-white/80 px-4 backdrop-blur lg:px-6">
      <div className="ml-14 flex-1 lg:ml-0">
        <GlobalSearch />
      </div>
      <div className="flex items-center gap-1.5 sm:gap-3">
        <NuevoMenu />
        <div className="hidden text-right leading-tight sm:block">
          <p className="text-sm font-medium">{nombre || "Usuario"}</p>
          <p className="text-xs text-muted-foreground">{humanize(rol)}</p>
        </div>
        <div className="hidden h-9 w-9 items-center justify-center rounded-full bg-brand-800 text-sm font-semibold text-white sm:flex">
          {iniciales}
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="rounded-md border px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted sm:px-3"
          >
            Salir
          </button>
        </form>
      </div>
    </header>
  );
}
