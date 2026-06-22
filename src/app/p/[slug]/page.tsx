import { notFound } from "next/navigation";
import { MessageCircle, MapPin, Phone, Mail, Gauge, Calendar, Fuel } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { waUrl, mensajeVehiculo } from "@/lib/data/whatsapp";
import { humanize } from "@/lib/format";

export const dynamic = "force-dynamic";

type VehPublico = {
  id: string;
  marca: string;
  modelo: string;
  version: string | null;
  anio: number | null;
  kilometros: number | null;
  combustible: string | null;
  transmision: string | null;
  color: string | null;
  precio: number | null;
  mostrar_whatsapp: boolean;
  destacado: boolean;
  foto: string | null;
};
type StockPublico = {
  empresa: {
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
  vehiculos: VehPublico[];
};

function precioARS(n: number | null): string {
  if (n == null) return "Consultar precio";
  return `$ ${new Intl.NumberFormat("es-AR").format(Math.round(n))}`;
}
function km(n: number | null): string {
  if (n == null) return "—";
  return `${new Intl.NumberFormat("es-AR").format(n)} km`;
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const sb = createClient();
  const { data } = await sb.rpc("stock_publico", { p_slug: params.slug });
  const d = data as StockPublico | null;
  return {
    title: d?.empresa?.nombre ? `${d.empresa.nombre} — Stock` : "Stock",
    description: d?.empresa?.nombre ? `Unidades disponibles en ${d.empresa.nombre}.` : undefined,
  };
}

export default async function StockPublicoPage({ params }: { params: { slug: string } }) {
  const sb = createClient();
  const { data } = await sb.rpc("stock_publico", { p_slug: params.slug });
  const stock = data as StockPublico | null;
  if (!stock || !stock.empresa) notFound();

  const { empresa, vehiculos } = stock;
  const color = empresa.color_primario || "#1e3a8a";
  const ubicacion = [empresa.localidad, empresa.provincia].filter(Boolean).join(", ");

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Encabezado */}
      <header style={{ backgroundColor: color }} className="text-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            {empresa.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={empresa.logo_url} alt={empresa.nombre} className="h-12 w-12 rounded bg-white/10 object-contain" />
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

      {/* Listado */}
      <section className="mx-auto max-w-5xl px-4 py-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">
          {vehiculos.length} {vehiculos.length === 1 ? "unidad disponible" : "unidades disponibles"}
        </h2>

        {vehiculos.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-white p-10 text-center text-gray-500">
            Por el momento no hay unidades publicadas. Volvé pronto.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {vehiculos.map((v) => (
              <article key={v.id} className="flex flex-col overflow-hidden rounded-lg border bg-white shadow-sm transition hover:shadow-md">
                <div className="relative aspect-[4/3] bg-gray-100">
                  {v.foto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={v.foto} alt={`${v.marca} ${v.modelo}`} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-300">Sin foto</div>
                  )}
                  {v.destacado && (
                    <span className="absolute left-2 top-2 rounded bg-amber-400 px-2 py-0.5 text-xs font-semibold text-amber-950">
                      Destacado
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="font-semibold text-gray-900">
                    {v.marca} {v.modelo}
                  </h3>
                  {v.version && <p className="text-sm text-gray-500">{v.version}</p>}
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600">
                    {v.anio && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {v.anio}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Gauge className="h-3 w-3" /> {km(v.kilometros)}
                    </span>
                    {v.combustible && (
                      <span className="flex items-center gap-1">
                        <Fuel className="h-3 w-3" /> {humanize(v.combustible)}
                      </span>
                    )}
                    {v.transmision && <span>{humanize(v.transmision)}</span>}
                  </div>
                  <p className="mt-3 text-lg font-bold" style={{ color }}>
                    {precioARS(v.precio)}
                  </p>
                  {v.mostrar_whatsapp && empresa.telefono && (
                    <a
                      href={waUrl(
                        mensajeVehiculo(empresa.nombre, { marca: v.marca, modelo: v.modelo, anio: v.anio, precio: v.precio }),
                        empresa.telefono,
                      )}
                      target="_blank"
                      className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-green-700"
                    >
                      <MessageCircle className="h-4 w-4" /> Consultar por WhatsApp
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <footer className="border-t bg-white py-6 text-center text-xs text-gray-400">
        {empresa.nombre}
        {empresa.direccion ? ` · ${empresa.direccion}` : ""}
        {ubicacion ? ` · ${ubicacion}` : ""}
      </footer>
    </main>
  );
}
