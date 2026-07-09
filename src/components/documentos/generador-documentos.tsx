import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export type GeneradorItem = {
  id: string;
  titulo: string;
  descripcion: string;
  icono: ReactNode;
  form: ReactNode;
};

/**
 * Grilla de cards "launcher" para generar documentos. Cada card es un
 * <details name="..."> nativo: al abrir uno se cierran los demás (grupo
 * exclusivo del navegador, sin JS) y ocupa todo el ancho de la grilla.
 */
export function GeneradorDocumentos({ items }: { items: GeneradorItem[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <details
          key={item.id}
          name="generador-documento"
          className="group rounded-xl border border-border/70 bg-card shadow-elevate open:col-span-full open:shadow-pop"
        >
          <summary className="flex cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
              {item.icono}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{item.titulo}</span>
              <span className="block truncate text-xs text-muted-foreground">{item.descripcion}</span>
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
          </summary>
          <div className="border-t border-border/60 p-4">{item.form}</div>
        </details>
      ))}
    </div>
  );
}
