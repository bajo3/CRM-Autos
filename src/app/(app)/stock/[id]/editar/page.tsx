import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { VehiculoForm } from "@/components/forms/vehiculo-form";
import { actualizarAuto } from "../../actions";
import { estadoOperativo } from "@/lib/data/vehiculo-estado";

export const dynamic = "force-dynamic";

type VehiculoEdit = {
  marca: string; modelo: string; version: string | null; anio: number | null;
  kilometros: number | null; patente: string | null; color: string | null;
  combustible: string | null; transmision: string | null;
  precio_venta: number | null; precio_costo: number | null;
  estado: string; titularidad: string; ubicacion: string | null; observaciones: string | null;
};

export default async function EditarAutoPage({ params }: { params: { id: string } }) {
  const ctx = await getSessionContext();
  if (!can(ctx?.profile?.rol, "stock.editar")) notFound();

  const sb = createClient();
  const { data: v } = await sb
    .from("vehiculo")
    .select("marca,modelo,version,anio,kilometros,patente,color,combustible,transmision,precio_venta,precio_costo,estado,titularidad,ubicacion,observaciones")
    .eq("id", params.id)
    .maybeSingle<VehiculoEdit>();
  if (!v) notFound();

  const action = actualizarAuto.bind(null, params.id);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/stock/${params.id}`} className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
        <ArrowLeft className="h-4 w-4" /> Volver a la ficha
      </Link>
      <PageHeader title="Editar auto" description={`${v.marca} ${v.modelo}`} />
      <VehiculoForm
        action={action}
        submitLabel="Guardar cambios"
        cancelHref={`/stock/${params.id}`}
        initial={{
          marca: v.marca, modelo: v.modelo, version: v.version ?? undefined,
          anio: v.anio ?? undefined, kilometros: v.kilometros ?? undefined,
          patente: v.patente ?? undefined, color: v.color ?? undefined,
          combustible: v.combustible ?? undefined, transmision: v.transmision ?? undefined,
          precio_venta: v.precio_venta ?? undefined, precio_costo: v.precio_costo ?? undefined,
          estado: estadoOperativo(v.estado), titularidad: v.titularidad,
          ubicacion: v.ubicacion ?? undefined, observaciones: v.observaciones ?? undefined,
        }}
      />
    </div>
  );
}
