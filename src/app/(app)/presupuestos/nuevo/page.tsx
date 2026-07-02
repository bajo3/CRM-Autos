import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSessionContext } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { getFormOptions } from "@/lib/data/options";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PresupuestoForm } from "@/components/presupuestos/presupuesto-form";

export const dynamic = "force-dynamic";

export default async function NuevoPresupuestoPage({
  searchParams,
}: {
  searchParams: { cliente?: string; vehiculo?: string };
}) {
  const ctx = await getSessionContext();
  if (!can(ctx?.profile?.rol, "documentos.generar")) {
    return (
      <div>
        <PageHeader title="Nuevo presupuesto" />
        <EmptyState title="Sin permiso" description="No tenés permiso para crear presupuestos." />
      </div>
    );
  }

  const opts = await getFormOptions();

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/presupuestos" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
        <ArrowLeft className="h-4 w-4" /> Volver a presupuestos
      </Link>
      <PageHeader title="Nuevo presupuesto" description="Cargá las condiciones; después podés generar el PDF y compartirlo." />
      <Card>
        <CardContent className="p-6">
          <PresupuestoForm
            clientes={opts.clientes}
            vehiculos={opts.vehiculos}
            clienteId={searchParams.cliente}
            vehiculoId={searchParams.vehiculo}
          />
        </CardContent>
      </Card>
    </div>
  );
}
