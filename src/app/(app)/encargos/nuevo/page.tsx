import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { EncargoForm } from "@/components/forms/encargo-form";
import { crearEncargo } from "../actions";

export const dynamic = "force-dynamic";

export default async function NuevoEncargoPage() {
  const sb = createClient();
  const { data: clientes } = await sb
    .from("cliente")
    .select("id,nombre,apellido")
    .order("nombre")
    .returns<{ id: string; nombre: string; apellido: string | null }[]>();

  const opts = (clientes ?? []).map((c) => ({ id: c.id, label: `${c.nombre} ${c.apellido ?? ""}`.trim() }));

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/encargos" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
        <ArrowLeft className="h-4 w-4" /> Volver a encargos
      </Link>
      <PageHeader title="Nuevo encargo" description="Registrá qué unidad busca un cliente para detectar coincidencias." />
      <EncargoForm action={crearEncargo} clientes={opts} />
    </div>
  );
}
