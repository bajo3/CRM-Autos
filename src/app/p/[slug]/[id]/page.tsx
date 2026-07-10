import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import Image from "next/image";
import { ArrowLeft, MapPin, Phone, Mail, MessageCircle, Calendar, Gauge, Fuel, Cog, Palette, Wrench } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { waUrl, mensajeVehiculo } from "@/lib/data/whatsapp";
import { humanize } from "@/lib/format";
import { GaleriaFotos } from "@/components/catalogos/galeria-fotos";
import { contactoPublicoListo } from "@/lib/data/contacto-publico";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type VehiculoDetalle = {
  id: string;
  marca: string;
  modelo: string;
  version: string | null;
  anio: number | null;
  kilometros: number | null;
  combustible: string | null;
  transmision: string | null;
  color: string | null;
  motor: string | null;
  observaciones: string | null;
  precio: number | null;
  mostrar_whatsapp: boolean;
  destacado: boolean;
  fotos: string[];
};

type EmpresaPublica = {
  nombre: string;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  localidad: string | null;
  provincia: string | null;
  logo_url: string | null;
  color_primario: string | null;
  slug: string;
};

type VehiculoPublico = {
  empresa: EmpresaPublica;
  vehiculo: VehiculoDetalle | null;
};

function precioARS(n: number | null): string {
  if (n == null) return "Consultar precio";
  return `$ ${new Intl.NumberFormat("es-AR").format(Math.round(n))}`;
}
function km(n: number | null): string {
  if (n == null) return "—";
  return `${new Intl.NumberFormat("es-AR").format(n)} km`;
}

async function getDetalle(slug: string, id: string): Promise<VehiculoPublico | null> {
  if (!UUID_RE.test(id)) return null;
  const sb = createClient();
  const { data } = await sb.rpc("vehiculo_publico", { p_slug: slug, p_id: id });
  return data as VehiculoPublico | null;
}

export async function generateMetadata({ params }: { params: { slug: string; id: string } }) {
  const data = await getDetalle(params.slug, params.id);
  if (!data?.vehiculo || !data.empresa || !contactoPublicoListo(data.empresa)) {
    return { title: "Unidad no encontrada", robots: { index: false, follow: false } };
  }
  const { vehiculo, empresa } = data;
  const titulo = `${vehiculo.marca} ${vehiculo.modelo} ${vehiculo.anio ?? ""}`.trim();
  return {
    title: `${titulo} — ${empresa.nombre}`,
    description: `${titulo}${vehiculo.version ? ` ${vehiculo.version}` : ""} disponible en ${empresa.nombre}.`,
  };
}

export default async function VehiculoPublicoPage({ params }: { params: { slug: string; id: string } }) {
  const data = await getDetalle(params.slug, params.id);
  if (!data || !data.empresa || !data.vehiculo || !contactoPublicoListo(data.empresa)) notFound();

  const { empresa, vehiculo } = data;
  const color = empresa.color_primario || "#1e3a8a";
  const ubicacion = [empresa.localidad, empresa.provincia].filter(Boolean).join(", ");
  const titulo = `${vehiculo.marca} ${vehiculo.modelo}${vehiculo.anio ? ` ${vehiculo.anio}` : ""}`;
  const requestHeaders = headers();
  const host = requestHeaders.get("host");
  const proto = requestHeaders.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  const publicLink = host
    ? `${proto}://${host}/p/${empresa.slug}/${vehiculo.id}?utm_source=whatsapp&utm_medium=referral&utm_campaign=stock_publico`
    : undefined;

  const specs: { icon: typeof Calendar; label: string; value: string }[] = [];
  if (vehiculo.anio) specs.push({ icon: Calendar, label: "Año", value: String(vehiculo.anio) });
  if (vehiculo.kilometros != null) specs.push({ icon: Gauge, label: "Kilómetros", value: km(vehiculo.kilometros) });
  if (vehiculo.combustible) specs.push({ icon: Fuel, label: "Combustible", value: humanize(vehiculo.combustible) });
  if (vehiculo.transmision) specs.push({ icon: Cog, label: "Transmisión", value: humanize(vehiculo.transmision) });
  if (vehiculo.color) specs.push({ icon: Palette, label: "Color", value: vehiculo.color });
  if (vehiculo.motor) specs.push({ icon: Wrench, label: "Motor", value: vehiculo.motor });

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Encabezado */}
      <header style={{ backgroundColor: color }} className="text-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            {empresa.logo_url ? (
              <Image
                src={empresa.logo_url}
                alt={empresa.nombre}
                width={48}
                height={48}
                className="h-12 w-12 rounded bg-white/10 object-contain"
              />
            ) : null}
            <div>
              <h1 className="text-2xl font-bold">{empresa.nombre}</h1>
              {ubicacion && (
                <p className="flex items-center gap-1 text-sm text-white/80">
                  <MapPin className="h-3.5 w-3.5" /> {ubicacion}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1 text-sm text-white/90">
            {empresa.telefono && (
              <a href={waUrl("¡Hola! Vi su stock y quería hacer una consulta.", empresa.telefono)} target="_blank" className="flex items-center gap-1.5 hover:underline">
                <Phone className="h-3.5 w-3.5" /> {empresa.telefono}
              </a>
            )}
            {empresa.email && (
              <span className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" /> {empresa.email}
              </span>
            )}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-6">
        <Link
          href={`/p/${empresa.slug}`}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 transition hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" /> Volver al stock
        </Link>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
          {/* Galería */}
          <div className="lg:col-span-3">
            <GaleriaFotos fotos={vehiculo.fotos} alt={titulo} />
          </div>

          {/* Info */}
          <div className="lg:col-span-2">
            <div className="rounded-xl border bg-white p-5 shadow-sm sm:p-6">
              {vehiculo.destacado && (
                <span className="mb-2 inline-block rounded bg-amber-400 px-2 py-0.5 text-xs font-semibold text-amber-950">
                  Destacado
                </span>
              )}
              <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">{titulo}</h2>
              {vehiculo.version && <p className="mt-1 text-base text-gray-500">{vehiculo.version}</p>}

              <p className="mt-4 text-3xl font-extrabold" style={{ color }}>
                {precioARS(vehiculo.precio)}
              </p>

              {vehiculo.mostrar_whatsapp && empresa.telefono && (
                <a
                  href={waUrl(
                    mensajeVehiculo(empresa.nombre, {
                      marca: vehiculo.marca,
                      modelo: vehiculo.modelo,
                      anio: vehiculo.anio,
                      precio: vehiculo.precio,
                    }, publicLink),
                    empresa.telefono,
                  )}
                  target="_blank"
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-green-700"
                >
                  <MessageCircle className="h-5 w-5" /> Consultar por WhatsApp
                </a>
              )}

              {specs.length > 0 && (
                <dl className="mt-6 grid grid-cols-2 gap-4 border-t pt-5">
                  {specs.map((s) => (
                    <div key={s.label}>
                      <dt className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-gray-400">
                        <s.icon className="h-3.5 w-3.5" /> {s.label}
                      </dt>
                      <dd className="mt-0.5 text-sm font-medium text-gray-900">{s.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>

            {vehiculo.observaciones && (
              <div className="mt-4 rounded-xl border bg-white p-5 shadow-sm sm:p-6">
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-400">Descripción</h3>
                <p className="whitespace-pre-line text-sm leading-relaxed text-gray-700">{vehiculo.observaciones}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <footer className="mt-4 border-t bg-white py-6 text-center text-xs text-gray-400">
        {empresa.nombre}
        {empresa.direccion ? ` · ${empresa.direccion}` : ""}
        {ubicacion ? ` · ${ubicacion}` : ""}
      </footer>
    </main>
  );
}
