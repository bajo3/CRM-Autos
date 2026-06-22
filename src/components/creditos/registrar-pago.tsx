"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { CreditCard } from "lucide-react";
import { registrarPago, type FormState } from "@/app/(app)/creditos/actions";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label } from "@/components/ui/input";

function Submit() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? "Guardando…" : "Registrar pago"}</Button>;
}

export function RegistrarPagoButton({
  creditoId, proximaCuota, totalCuotas,
}: {
  creditoId: string; proximaCuota: number; totalCuotas: number;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useFormState<FormState, FormData>(
    registrarPago.bind(null, creditoId),
    {},
  );

  // Cerrar el modal cuando el pago se registró bien.
  useEffect(() => {
    if (state.ok) setOpen(false);
  }, [state.ok]);

  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <CreditCard className="h-4 w-4" /> Registrar pago
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-lg border bg-card p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold">Registrar pago de cuota</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Se registrará el pago de la <strong>cuota {proximaCuota}/{totalCuotas}</strong> y se avanzará el crédito.
            </p>

            <form action={formAction} className="mt-4 space-y-4">
              <div>
                <Label htmlFor="monto">Monto pagado (ARS)</Label>
                <Input id="monto" name="monto" type="number" min={0} step="0.01" placeholder="50000" />
              </div>
              <div>
                <Label htmlFor="fecha">Fecha de pago</Label>
                <Input id="fecha" name="fecha" type="date" defaultValue={hoy} />
              </div>
              <div>
                <Label htmlFor="observacion">Observación (opcional)</Label>
                <Textarea id="observacion" name="observacion" placeholder="Transferencia, efectivo, etc." />
              </div>

              {state.error && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
              )}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Submit />
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
