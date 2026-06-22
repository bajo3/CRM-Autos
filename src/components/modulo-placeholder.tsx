import { Hammer } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Placeholder honesto para módulos con estructura creada pero UI pendiente.
 * Nunca dejamos una pantalla en blanco: explicamos estado y próxima acción.
 */
export function ModuloPlaceholder({
  titulo,
  descripcion,
  etapa,
  proximaAccion,
  tablaLista,
}: {
  titulo: string;
  descripcion: string;
  etapa: string;
  proximaAccion: string;
  tablaLista?: string;
}) {
  return (
    <div>
      <PageHeader title={titulo} description={descripcion} />
      <Card>
        <CardContent className="flex flex-col items-start gap-3 p-6">
          <div className="flex items-center gap-2 rounded-md bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800">
            <Hammer className="h-4 w-4" /> Módulo en construcción
          </div>
          <dl className="grid gap-2 text-sm">
            <div className="flex gap-2">
              <dt className="font-medium text-muted-foreground">Estado:</dt>
              <dd>Modelo de datos y tabla creados en Supabase{tablaLista ? ` (public.${tablaLista})` : ""}, con RLS por empresa.</dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-medium text-muted-foreground">Etapa:</dt>
              <dd>{etapa}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-medium text-muted-foreground">Próxima acción:</dt>
              <dd>{proximaAccion}</dd>
            </div>
          </dl>
          <p className="text-xs text-muted-foreground">
            Seguimiento detallado en <code className="rounded bg-muted px-1">/docs/PENDIENTES.md</code> y{" "}
            <code className="rounded bg-muted px-1">/docs/ETAPAS_DESARROLLO.md</code>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
