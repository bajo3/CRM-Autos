import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { TallerForm } from "@/components/forms/taller-form";
import { getFormOptions } from "@/lib/data/options";
import { crearTrabajoTaller } from "../actions";

export const dynamic = "force-dynamic";

export default async function NuevoTrabajoTallerPage({
  searchParams,
}: {
  searchParams: { vehiculo?: string };
}) {
  const { vehiculos } = await getFormOptions();
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/taller" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
        <ArrowLeft className="h-4 w-4" /> Volver a taller
      </Link>
      <PageHeader title="Cargar trabajo de taller" description="Preparación de un vehículo antes de publicarlo o entregarlo." />
      <TallerForm action={crearTrabajoTaller} vehiculos={vehiculos} vehiculoId={searchParams.vehiculo} />
    </div>
  );
}
