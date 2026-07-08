"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Plus, X, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import {
  buscarClientesParaSeguimiento,
  crearSeguimiento,
  type ClienteOpcion,
} from "@/app/(app)/seguimientos/actions";

/** Alta rápida de seguimiento sin salir de la pantalla: busca cliente, elige fecha y motivo. */
export function NuevoSeguimientoForm() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<ClienteOpcion[]>([]);
  const [seleccionado, setSeleccionado] = useState<ClienteOpcion | null>(null);
  const [buscando, startBusqueda] = useTransition();
  const [enviando, startEnvio] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!seleccionado && query.trim().length >= 2) {
      const t = setTimeout(() => {
        startBusqueda(async () => setResultados(await buscarClientesParaSeguimiento(query)));
      }, 250);
      return () => clearTimeout(t);
    }
    setResultados([]);
  }, [query, seleccionado]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setResultados([]);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function cerrar() {
    setOpen(false);
    setSeleccionado(null);
    setQuery("");
    setResultados([]);
    setError(null);
  }

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Nuevo seguimiento
      </Button>
    );
  }

  return (
    <div className="rounded-xl border border-border/70 bg-card shadow-elevate p-4">
      <form
        action={(fd) => {
          setError(null);
          if (!seleccionado) {
            setError("Elegí un cliente de la lista.");
            return;
          }
          fd.set("cliente_id", seleccionado.id);
          startEnvio(async () => {
            const res = await crearSeguimiento(fd);
            if (res.error) {
              setError(res.error);
              return;
            }
            cerrar();
          });
        }}
        className="grid gap-3 sm:grid-cols-4"
      >
        <div ref={containerRef} className="relative sm:col-span-2">
          <Label htmlFor="seg-cliente">Cliente *</Label>
          {seleccionado ? (
            <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-sm">
              <span className="truncate font-medium">
                {seleccionado.nombre} {seleccionado.apellido ?? ""}
              </span>
              <button
                type="button"
                onClick={() => setSeleccionado(null)}
                className="ml-2 text-muted-foreground hover:text-foreground"
                aria-label="Cambiar cliente"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Input
              id="seg-cliente"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nombre o teléfono…"
              autoComplete="off"
            />
          )}
          {!seleccionado && resultados.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-md border bg-white shadow-lg">
              {resultados.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setSeleccionado(c);
                    setResultados([]);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                >
                  <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{c.nombre} {c.apellido ?? ""}</span>
                  {c.telefono && <span className="ml-auto shrink-0 text-xs text-muted-foreground">{c.telefono}</span>}
                </button>
              ))}
            </div>
          )}
          {!seleccionado && buscando && (
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Buscando…
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="seg-fecha">Fecha *</Label>
          <Input id="seg-fecha" name="fecha" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
        </div>
        <div>
          <Label htmlFor="seg-hora">Hora</Label>
          <Input id="seg-hora" name="hora" type="time" />
        </div>
        <div className="sm:col-span-3">
          <Label htmlFor="seg-motivo">Motivo</Label>
          <Input id="seg-motivo" name="motivo" placeholder="Ej: Llamar por presupuesto enviado" />
        </div>

        {error && <p className="sm:col-span-4 text-sm text-danger">{error}</p>}

        <div className="flex items-center gap-2 sm:col-span-4">
          <Button type="submit" disabled={enviando}>{enviando ? "Guardando…" : "Agendar"}</Button>
          <button type="button" onClick={cerrar} className="text-sm text-muted-foreground hover:underline">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
