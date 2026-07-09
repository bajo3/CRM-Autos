import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ConsignacionForm } from "@/components/forms/consignacion-form";
import { getFormOptions } from "@/lib/data/options";
import { crearConsignacion } from "../actions";

export const dynamic = "force-dynamic";

export default async function NuevaConsignacionPage({
  searchParams,
}: {
  searchParams: { vehiculo?: string };
}) {
  const { vehiculos, clientes } = await getFormOptions();
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/consignados" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
        <ArrowLeft className="h-4 w-4" /> Volver a consignados
      </Link>
      <PageHeader title="Registrar consignación" description="Vehículo de un tercero que la agencia vende por comisión." />
      {vehiculos.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Primero cargá el vehículo en{" "}
          <Link href="/stock/nuevo" className="text-brand-800 hover:underline">Stock</Link>, y después registrá acá la consignación.
        </p>
      ) : (
        <ConsignacionForm action={crearConsignacion} vehiculos={vehiculos} clientes={clientes} vehiculoId={searchParams.vehiculo} />
      )}
    </div>
  );
}
