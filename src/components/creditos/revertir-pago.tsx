"use client";

import { useTransition } from "react";
import { Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { revertirUltimoPago } from "@/app/(app)/creditos/actions";

export function RevertirPagoButton({ creditoId, cuota }: { creditoId: string; cuota: number }) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (confirm(`¿Revertir el pago de la cuota ${cuota}? El crédito vuelve un paso atrás.`)) {
          start(() => revertirUltimoPago(creditoId));
        }
      }}
    >
      <Undo2 className="h-4 w-4" /> {pending ? "Revirtiendo…" : "Revertir último pago"}
    </Button>
  );
}
