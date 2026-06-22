import { ModuloPlaceholder } from "@/components/modulo-placeholder";

export default function Page() {
  return (
    <ModuloPlaceholder
      titulo="Configuración de empresa"
      descripcion="Datos de la agencia, logo, colores y calendario VTV por jurisdicción."
      etapa="Etapa 1 — Base del proyecto"
      proximaAccion="Formulario de edición de empresa (nombre, CUIT, logo, vtv_calendario configurable)."
      tablaLista="empresa"
    />
  );
}
