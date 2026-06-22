import { getSessionContext } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { EmpresaForm } from "@/components/forms/empresa-form";

export const dynamic = "force-dynamic";

export default async function ConfiguracionPage() {
  const ctx = await getSessionContext();
  const empresa = ctx?.empresa;

  if (!empresa) {
    return (
      <div>
        <PageHeader title="Configuración de empresa" />
        <EmptyState title="No se encontró la empresa" description="Tu usuario no está asociado a ninguna agencia." />
      </div>
    );
  }

  const puedeEditar = can(ctx?.profile?.rol, "empresa.configurar");

  const vtv =
    empresa.vtv_calendario && typeof empresa.vtv_calendario === "object" && !Array.isArray(empresa.vtv_calendario)
      ? (empresa.vtv_calendario as Record<string, number>)
      : undefined;

  return (
    <div>
      <PageHeader
        title="Configuración de empresa"
        description="Datos de la agencia, marca y calendario VTV. Estos valores alimentan documentos, catálogos y alertas."
      />

      {!puedeEditar ? (
        <Card>
          <CardContent className="space-y-3 p-6">
            <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Solo el <strong>dueño</strong> puede editar estos datos. Te mostramos la configuración actual en modo lectura.
            </div>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div><dt className="text-muted-foreground">Nombre</dt><dd className="font-medium">{empresa.nombre}</dd></div>
              <div><dt className="text-muted-foreground">CUIT</dt><dd>{empresa.cuit ?? "—"}</dd></div>
              <div><dt className="text-muted-foreground">Teléfono</dt><dd>{empresa.telefono ?? "—"}</dd></div>
              <div><dt className="text-muted-foreground">Email</dt><dd>{empresa.email ?? "—"}</dd></div>
              <div><dt className="text-muted-foreground">Dirección</dt><dd>{empresa.direccion ?? "—"}</dd></div>
              <div><dt className="text-muted-foreground">Localidad</dt><dd>{empresa.localidad ?? "—"}</dd></div>
              <div><dt className="text-muted-foreground">Provincia</dt><dd>{empresa.provincia ?? "—"}</dd></div>
            </dl>
          </CardContent>
        </Card>
      ) : (
        <EmpresaForm
          initial={{
            nombre: empresa.nombre,
            cuit: empresa.cuit ?? undefined,
            telefono: empresa.telefono ?? undefined,
            email: empresa.email ?? undefined,
            direccion: empresa.direccion ?? undefined,
            localidad: empresa.localidad ?? undefined,
            provincia: empresa.provincia ?? undefined,
            logo_url: empresa.logo_url ?? undefined,
            color_primario: empresa.color_primario ?? undefined,
            vtv_calendario: vtv,
          }}
        />
      )}
    </div>
  );
}
