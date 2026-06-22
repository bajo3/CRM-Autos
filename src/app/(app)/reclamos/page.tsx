import { ModuloPlaceholder } from "@/components/modulo-placeholder";

export default function Page() {
  return (
    <ModuloPlaceholder
      titulo="Reclamos postventa"
      descripcion="Reclamos de clientes con estado, responsable y resolución."
      etapa="Etapa 12 — Pulido final"
      proximaAccion="CRUD de reclamos con flujo de estados (nuevo → en taller → resuelto)."
      tablaLista="reclamo"
    />
  );
}
