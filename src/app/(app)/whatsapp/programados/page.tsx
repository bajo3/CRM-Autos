import Link from "next/link";
import { getSessionContext } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { listarProgramados, listarClientesConTelefono, type FiltrosProgramados } from "./data";
import { listarPlantillasAprobadas } from "../data";
import { ProgramadosAdmin } from "@/components/whatsapp/programados-admin";

export const dynamic = "force-dynamic";

export default async function ProgramadosPage({
  searchParams,
}: {
  searchParams: FiltrosProgramados;
}) {
  const ctx = await getSessionContext();
  if (!ctx?.profile?.empresa_id) {
    return (
      <div>
        <PageHeader title="Mensajes programados" />
        <EmptyState title="Sesión inválida" />
      </div>
    );
  }

  const empresaId = ctx.profile.empresa_id;
  const puedeAdministrar = can(ctx.profile.rol, "whatsapp.programados");

  const [{ programados, total, page }, clientes, plantillas] = await Promise.all([
    listarProgramados(empresaId, searchParams),
    listarClientesConTelefono(empresaId),
    listarPlantillasAprobadas(empresaId),
  ]);

  const qs = (extra: Record<string, string>) => {
    const sp = new URLSearchParams();
    if (searchParams.estado) sp.set("estado", searchParams.estado);
    if (searchParams.motivo) sp.set("motivo", searchParams.motivo);
    if (searchParams.q) sp.set("q", searchParams.q);
    Object.entries(extra).forEach(([k, v]) => (v ? sp.set(k, v) : sp.delete(k)));
    return `/whatsapp/programados?${sp.toString()}`;
  };
  const totalPages = Math.max(1, Math.ceil(total / 30));

  return (
    <div>
      <PageHeader
        title="Mensajes programados"
        description="Seguimiento, postventa, cuotas y otros avisos que se envían solos en la fecha indicada."
      />
      <ProgramadosAdmin
        programados={programados}
        clientes={clientes}
        plantillas={plantillas}
        puedeAdministrar={puedeAdministrar}
        filtros={searchParams}
      />
      {totalPages > 1 && (
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <Link href={qs({ page: String(Math.max(1, page - 1)) })} className="hover:underline">← Anterior</Link>
          <span>Página {page} de {totalPages}</span>
          <Link href={qs({ page: String(Math.min(totalPages, page + 1)) })} className="hover:underline">Siguiente →</Link>
        </div>
      )}
    </div>
  );
}
