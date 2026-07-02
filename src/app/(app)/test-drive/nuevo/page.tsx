import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { TestDriveForm } from "@/components/forms/test-drive-form";
import { getFormOptions } from "@/lib/data/options";
import { crearTestDrive } from "../actions";

export const dynamic = "force-dynamic";

export default async function NuevoTestDrivePage({
  searchParams,
}: {
  searchParams: { cliente?: string; vehiculo?: string };
}) {
  const { clientes, vehiculos } = await getFormOptions();
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/test-drive" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
        <ArrowLeft className="h-4 w-4" /> Volver a test drive
      </Link>
      <PageHeader title="Agendar test drive" description="Prueba de manejo con datos del conductor." />
      <TestDriveForm
        action={crearTestDrive}
        clientes={clientes}
        vehiculos={vehiculos}
        clienteId={searchParams.cliente}
        vehiculoId={searchParams.vehiculo}
      />
    </div>
  );
}
