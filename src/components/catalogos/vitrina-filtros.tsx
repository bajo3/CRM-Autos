"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { MessageCircle, Gauge, Calendar, Fuel } from "lucide-react";
import { waUrl, mensajeVehiculo } from "@/lib/data/whatsapp";
import { humanize } from "@/lib/format";

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

function precioARS(n: number | null): string {
  if (n == null) return "Consultar precio";
  return `$ ${new Intl.NumberFormat("es-AR").format(Math.round(n))}`;
}
function km(n: number | null): string {
  if (n == null) return "—";
  return `${new Intl.NumberFormat("es-AR").format(n)} km`;
}

const ORDENES = [
  { value: "recientes", label: "Más recientes" },
  { value: "precio_asc", label: "Precio: menor a mayor" },
  { value: "precio_desc", label: "Precio: mayor a menor" },
  { value: "anio_desc", label: "Año: más nuevos" },
] as const;

export function VitrinaFiltros({
  vehiculos, empresaNombre, telefono, color, slug, publicBaseUrl,
}: {
  vehiculos: VehPublico[]; empresaNombre: string; telefono: string | null; color: string; slug: string; publicBaseUrl: string;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [orden, setOrden] = useState<(typeof ORDENES)[number]["value"]>("recientes");

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    let lista = q
      ? vehiculos.filter((v) =>
          `${v.marca} ${v.modelo} ${v.version ?? ""}`.toLowerCase().includes(q))
      : vehiculos;

    lista = [...lista];
    if (orden === "precio_asc") lista.sort((a, b) => (a.precio ?? Infinity) - (b.precio ?? Infinity));
    else if (orden === "precio_desc") lista.sort((a, b) => (b.precio ?? -Infinity) - (a.precio ?? -Infinity));
    else if (orden === "anio_desc") lista.sort((a, b) => (b.anio ?? 0) - (a.anio ?? 0));
    return lista;
  }, [vehiculos, busqueda, orden]);

  return (
    <>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar marca o modelo…"
          className="h-10 w-full max-w-xs rounded-md border border-gray-300 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <select
          value={orden}
          onChange={(e) => setOrden(e.target.value as typeof orden)}
          className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm shadow-sm"
        >
          {ORDENES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <span className="text-sm text-gray-500">
          {filtrados.length} {filtrados.length === 1 ? "resultado" : "resultados"}
        </span>
      </div>

      {filtrados.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-white p-10 text-center text-gray-500">
          No hay unidades que coincidan con la búsqueda.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((v) => (
            <article key={v.id} className="group flex flex-col overflow-hidden rounded-xl border bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg">
              <Link href={`/p/${slug}/${v.id}`} className="flex flex-1 flex-col">
                <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                  {v.foto ? (
                    <Image
                      src={v.foto}
                      alt={`${v.marca} ${v.modelo}`}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover transition duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-300">Sin foto</div>
                  )}
                  {v.destacado && (
                    <span className="absolute left-2 top-2 rounded-full bg-amber-400 px-2.5 py-0.5 text-xs font-semibold text-amber-950 shadow-sm">
                      Destacado
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="font-semibold text-gray-900 transition group-hover:text-gray-700">
                    {v.marca} {v.modelo}
                  </h3>
                  {v.version && <p className="text-sm text-gray-500">{v.version}</p>}
                  <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-gray-600">
                    {v.anio && (
                      <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5">
                        <Calendar className="h-3 w-3" /> {v.anio}
                      </span>
                    )}
                    <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5">
                      <Gauge className="h-3 w-3" /> {km(v.kilometros)}
                    </span>
                    {v.combustible && (
                      <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5">
                        <Fuel className="h-3 w-3" /> {humanize(v.combustible)}
                      </span>
                    )}
                    {v.transmision && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5">{humanize(v.transmision)}</span>
                    )}
                  </div>
                  <p className="mt-3 text-xl font-extrabold" style={{ color }}>
                    {precioARS(v.precio)}
                  </p>
                </div>
              </Link>
              {v.mostrar_whatsapp && telefono && (
                <div className="px-4 pb-4">
                  <a
                    href={waUrl(
                      mensajeVehiculo(
                        empresaNombre,
                        { marca: v.marca, modelo: v.modelo, anio: v.anio, precio: v.precio },
                        `${publicBaseUrl}/p/${slug}/${v.id}?utm_source=whatsapp&utm_medium=referral&utm_campaign=stock_publico`,
                      ),
                      telefono,
                    )}
                    target="_blank"
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-green-700"
                  >
                    <MessageCircle className="h-4 w-4" /> Consultar por WhatsApp
                  </a>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </>
  );
}
