import { notFound } from "next/navigation";
import { MapPin, Phone, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { waUrl } from "@/lib/data/whatsapp";
import { VitrinaFiltros } from "@/components/catalogos/vitrina-filtros";

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
          <VitrinaFiltros vehiculos={vehiculos} empresaNombre={empresa.nombre} telefono={empresa.telefono} color={color} />
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
