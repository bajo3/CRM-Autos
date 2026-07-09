import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EncargoForm } from "@/components/forms/encargo-form";
import { getFormOptions } from "@/lib/data/options";
import { crearEncargo } from "../actions";

export const dynamic = "force-dynamic";

export default async function NuevoEncargoPage({
  searchParams,
}: {
  searchParams: { cliente?: string };
}) {
  const { clientes } = await getFormOptions();

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/encargos" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
        <ArrowLeft className="h-4 w-4" /> Volver a encargos
      </Link>
      <PageHeader title="Nuevo encargo" description="Registrá qué unidad busca un cliente para detectar coincidencias." />
      <EncargoForm action={crearEncargo} clientes={clientes} clienteId={searchParams.cliente} />
    </div>
  );
}
