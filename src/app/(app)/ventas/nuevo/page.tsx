import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { VentaForm } from "@/components/forms/venta-form";
import { getFormOptions } from "@/lib/data/options";
import { crearVenta } from "../actions";

export const dynamic = "force-dynamic";

export default async function NuevaVentaPage() {
  const { clientes, vehiculos } = await getFormOptions();
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/ventas" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
        <ArrowLeft className="h-4 w-4" /> Volver a ventas
      </Link>
      <PageHeader title="Nueva venta" description="Registrá una operación de venta." />
      <VentaForm action={crearVenta} clientes={clientes} vehiculos={vehiculos} />
    </div>
  );
}
