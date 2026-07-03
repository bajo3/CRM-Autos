import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { VehiculoForm } from "@/components/forms/vehiculo-form";
import { crearAuto } from "../actions";

export default function NuevoAutoPage({
  searchParams,
}: {
  searchParams: { precio_costo?: string; observaciones?: string; titularidad?: string };
}) {
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/stock" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
        <ArrowLeft className="h-4 w-4" /> Volver al stock
      </Link>
      <PageHeader title="Nuevo auto" description="Cargá una unidad al inventario." />
      <VehiculoForm
        action={crearAuto}
        submitLabel="Guardar auto"
        pedirVtv
        initial={{
          precio_costo: searchParams.precio_costo ? Number(searchParams.precio_costo) : undefined,
          observaciones: searchParams.observaciones,
          titularidad: searchParams.titularidad,
        }}
      />
    </div>
  );
}
