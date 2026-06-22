"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { guardarEstadoDocumental } from "@/app/(app)/stock/[id]/actions";
import { Select } from "@/components/ui/input";

type Estado = "completo" | "incompleto" | "pendiente" | "observado";

export function EstadoDocumentalSelect({ vehiculoId, value }: { vehiculoId: string; value: Estado }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <Select
      defaultValue={value}
      disabled={pending}
      onChange={(e) =>
        start(() =>
          guardarEstadoDocumental(vehiculoId, e.target.value as Estado).then(() => router.refresh()),
        )
      }
    >
      <option value="completo">Completo</option>
      <option value="incompleto">Incompleto</option>
      <option value="pendiente">Pendiente</option>
      <option value="observado">Observado</option>
    </Select>
  );
}
