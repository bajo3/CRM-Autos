import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getFormOptions } from "@/lib/data/options";
import { PageHeader } from "@/components/ui/page-header";
import { ClienteForm } from "@/components/forms/cliente-form";
import { actualizarCliente } from "../../actions";

export const dynamic = "force-dynamic";

type ClienteEdit = {
  nombre: string; apellido: string | null; telefono: string | null; whatsapp: string | null;
  email: string | null; dni_cuit: string | null; localidad: string | null;
  origen: string; estado: string; vendedor_id: string | null; vehiculo_interes_id: string | null;
  presupuesto_aprox: number | null; proximo_seguimiento: string | null; fecha_nacimiento: string | null; observaciones: string | null;
};

export default async function EditarClientePage({ params }: { params: { id: string } }) {
  const sb = createClient();
  const [{ data: c }, { vendedores, vehiculos }] = await Promise.all([
    sb.from("cliente")
      .select("nombre,apellido,telefono,whatsapp,email,dni_cuit,localidad,origen,estado,vendedor_id,vehiculo_interes_id,presupuesto_aprox,proximo_seguimiento,fecha_nacimiento,observaciones")
      .eq("id", params.id).maybeSingle<ClienteEdit>(),
    getFormOptions(),
  ]);
  if (!c) notFound();

  const action = actualizarCliente.bind(null, params.id);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/clientes/${params.id}`} className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
        <ArrowLeft className="h-4 w-4" /> Volver a la ficha
      </Link>
      <PageHeader title="Editar cliente" description={`${c.nombre} ${c.apellido ?? ""}`} />
      <ClienteForm
        action={action}
        vendedores={vendedores}
        vehiculos={vehiculos}
        submitLabel="Guardar cambios"
        cancelHref={`/clientes/${params.id}`}
        initial={{
          nombre: c.nombre, apellido: c.apellido ?? undefined, telefono: c.telefono ?? undefined,
          whatsapp: c.whatsapp ?? undefined, email: c.email ?? undefined, dni_cuit: c.dni_cuit ?? undefined,
          localidad: c.localidad ?? undefined, origen: c.origen, estado: c.estado,
          vendedor_id: c.vendedor_id ?? undefined, vehiculo_interes_id: c.vehiculo_interes_id ?? undefined,
          presupuesto_aprox: c.presupuesto_aprox ?? undefined,
          proximo_seguimiento: c.proximo_seguimiento ?? undefined, fecha_nacimiento: c.fecha_nacimiento ?? undefined,
          observaciones: c.observaciones ?? undefined,
        }}
      />
    </div>
  );
}
