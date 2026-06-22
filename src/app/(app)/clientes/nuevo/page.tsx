import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ClienteForm } from "@/components/forms/cliente-form";
import { getFormOptions } from "@/lib/data/options";
import { crearCliente } from "../actions";

export const dynamic = "force-dynamic";

export default async function NuevoClientePage() {
  const { vendedores, vehiculos } = await getFormOptions();
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/clientes" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
        <ArrowLeft className="h-4 w-4" /> Volver a clientes
      </Link>
      <PageHeader title="Nuevo cliente / lead" description="Cargá un contacto a la base comercial." />
      <ClienteForm action={crearCliente} vendedores={vendedores} vehiculos={vehiculos} />
    </div>
  );
}
