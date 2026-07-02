import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { TasacionForm } from "@/components/forms/tasacion-form";
import { getFormOptions } from "@/lib/data/options";
import { crearTasacion } from "../actions";

export const dynamic = "force-dynamic";

export default async function NuevaTasacionPage({
  searchParams,
}: {
  searchParams: { cliente?: string };
}) {
  const { clientes } = await getFormOptions();
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/tasaciones" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
        <ArrowLeft className="h-4 w-4" /> Volver a tasaciones
      </Link>
      <PageHeader title="Registrar tasación" description="Evaluación rápida de compra/venta de un usado." />
      <TasacionForm action={crearTasacion} clientes={clientes} clienteId={searchParams.cliente} />
    </div>
  );
}
