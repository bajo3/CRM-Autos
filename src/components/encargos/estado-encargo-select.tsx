"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { cambiarEstadoEncargo, type EstadoEncargo } from "@/app/(app)/encargos/actions";
import { Select } from "@/components/ui/input";

export function EstadoEncargoSelect({ encargoId, value }: { encargoId: string; value: EstadoEncargo }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <Select
      defaultValue={value}
      disabled={pending}
      className="h-8 text-xs"
      onChange={(e) =>
        start(() =>
          cambiarEstadoEncargo(encargoId, e.target.value as EstadoEncargo).then(() => router.refresh()),
        )
      }
    >
      <option value="buscando">Buscando</option>
      <option value="unidad_encontrada">Unidad encontrada</option>
      <option value="ofrecido">Ofrecido al cliente</option>
      <option value="cerrado">Cerrado</option>
      <option value="perdido">Perdido</option>
    </Select>
  );
}
