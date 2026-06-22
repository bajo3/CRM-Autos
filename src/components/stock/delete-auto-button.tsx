"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { eliminarAuto } from "@/app/(app)/stock/actions";

export function DeleteAutoButton({ id }: { id: string }) {
  const [pending, start] = useTransition();

  return (
    <Button
      type="button"
      variant="danger"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (confirm("¿Eliminar este auto del stock? Esta acción no se puede deshacer.")) {
          start(() => eliminarAuto(id));
        }
      }}
    >
      <Trash2 className="h-4 w-4" /> {pending ? "Eliminando…" : "Eliminar"}
    </Button>
  );
}
