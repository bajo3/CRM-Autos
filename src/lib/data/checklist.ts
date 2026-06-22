/** Ítems del checklist de entrega de una venta (se guardan en `venta.checklist_entrega`). */
export const CHECKLIST_ENTREGA: { key: string; label: string }[] = [
  { key: "transferencia", label: "Transferencia iniciada" },
  { key: "verificacion_policial", label: "Verificación policial" },
  { key: "titulo", label: "Título entregado" },
  { key: "cedula", label: "Cédula (verde / azul)" },
  { key: "formulario_08", label: "Formulario 08 firmado" },
  { key: "libre_deuda", label: "Libre deuda (patentes / multas)" },
  { key: "vtv", label: "VTV vigente" },
  { key: "llaves", label: "Llaves y duplicado" },
  { key: "manual_service", label: "Manual y service al día" },
  { key: "seguro", label: "Seguro endosado" },
];

export type ChecklistEntrega = Record<string, boolean>;

/** Cantidad de ítems cumplidos sobre el total. */
export function checklistProgreso(value: ChecklistEntrega | null | undefined) {
  const done = CHECKLIST_ENTREGA.filter((i) => value?.[i.key]).length;
  return { done, total: CHECKLIST_ENTREGA.length };
}
