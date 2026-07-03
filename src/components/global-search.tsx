"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, User, Car, Loader2 } from "lucide-react";
import { buscarGlobal, type ResultadoBusqueda } from "@/app/actions/buscar";
import { cn } from "@/lib/utils";

const VACIO: ResultadoBusqueda = { clientes: [], vehiculos: [] };

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<ResultadoBusqueda>(VACIO);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Atajo Ctrl+K / Cmd+K para enfocar el buscador desde cualquier pantalla.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
        inputRef.current?.focus();
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Cerrar el dropdown al clickear afuera.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Búsqueda con debounce.
  useEffect(() => {
    if (query.trim().length < 2) {
      setResultados(VACIO);
      return;
    }
    const t = setTimeout(() => {
      startTransition(async () => {
        const r = await buscarGlobal(query);
        setResultados(r);
      });
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const hayResultados = resultados.clientes.length > 0 || resultados.vehiculos.length > 0;
  const mostrarDropdown = open && query.trim().length >= 2;

  function ir(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Buscar cliente o auto…"
          className="h-9 w-full rounded-md border border-input bg-white pl-8 pr-14 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          Ctrl K
        </kbd>
      </div>

      {mostrarDropdown && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-96 overflow-y-auto rounded-md border bg-white shadow-lg">
          {pending && (
            <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Buscando…
            </div>
          )}

          {!pending && !hayResultados && (
            <p className="px-3 py-3 text-sm text-muted-foreground">Sin resultados para &quot;{query}&quot;.</p>
          )}

          {!pending && resultados.clientes.length > 0 && (
            <div className="border-b py-1">
              <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Clientes</p>
              {resultados.clientes.map((c) => (
                <button
                  key={c.id}
                  onClick={() => ir(`/clientes/${c.id}`)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted",
                  )}
                >
                  <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{c.nombre} {c.apellido ?? ""}</span>
                  {c.telefono && <span className="ml-auto shrink-0 text-xs text-muted-foreground">{c.telefono}</span>}
                </button>
              ))}
            </div>
          )}

          {!pending && resultados.vehiculos.length > 0 && (
            <div className="py-1">
              <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Vehículos</p>
              {resultados.vehiculos.map((v) => (
                <button
                  key={v.id}
                  onClick={() => ir(`/stock/${v.id}`)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                >
                  <Car className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{v.marca} {v.modelo}{v.anio ? ` ${v.anio}` : ""}</span>
                  {v.patente && <span className="ml-auto shrink-0 text-xs text-muted-foreground">{v.patente}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
