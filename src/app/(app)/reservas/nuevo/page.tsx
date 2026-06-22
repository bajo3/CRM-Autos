import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ReservaForm } from "@/components/forms/reserva-form";
import { getFormOptions } from "@/lib/data/options";
import { crearReserva } from "../actions";

export const dynamic = "force-dynamic";

export default async function NuevaReservaPage() {
  const { clientes, vehiculos } = await getFormOptions();
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/reservas" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
        <ArrowLeft className="h-4 w-4" /> Volver a reservas
      </Link>
      <PageHeader title="Nueva reserva" description="Tomá una seña sobre una unidad." />
      <ReservaForm action={crearReserva} clientes={clientes} vehiculos={vehiculos} />
    </div>
  );
}
