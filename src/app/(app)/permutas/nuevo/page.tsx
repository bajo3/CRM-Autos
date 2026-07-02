import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { PermutaForm } from "@/components/forms/permuta-form";
import { getFormOptions } from "@/lib/data/options";
import { crearPermuta } from "../actions";

export const dynamic = "force-dynamic";

export default async function NuevaPermutaPage({
  searchParams,
}: {
  searchParams: { cliente?: string };
}) {
  const { clientes } = await getFormOptions();
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/permutas" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
        <ArrowLeft className="h-4 w-4" /> Volver a permutas
      </Link>
      <PageHeader title="Registrar permuta" description="Usado que el cliente entrega en parte de pago." />
      <PermutaForm action={crearPermuta} clientes={clientes} clienteId={searchParams.cliente} />
    </div>
  );
}
