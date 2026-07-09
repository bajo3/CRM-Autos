"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";

export function GaleriaFotos({ fotos, alt }: { fotos: string[]; alt: string }) {
  const [activa, setActiva] = useState(0);

  if (fotos.length === 0) {
    return (
      <div className="flex aspect-[4/3] w-full items-center justify-center rounded-xl bg-gray-100 text-gray-300 sm:aspect-[16/10]">
        <div className="flex flex-col items-center gap-2">
          <ImageOff className="h-10 w-10" />
          <span className="text-sm font-medium">Sin fotos</span>
        </div>
      </div>
    );
  }

  const anterior = () => setActiva((i) => (i - 1 + fotos.length) % fotos.length);
  const siguiente = () => setActiva((i) => (i + 1) % fotos.length);

  return (
    <div>
      <div className="group relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-gray-100 sm:aspect-[16/10]">
        <Image
          key={fotos[activa]}
          src={fotos[activa]}
          alt={alt}
          fill
          priority
          sizes="(min-width: 1024px) 60vw, 100vw"
          className="object-cover"
        />
        {fotos.length > 1 && (
          <>
            <button
              type="button"
              onClick={anterior}
              aria-label="Foto anterior"
              className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-gray-700 opacity-0 shadow transition hover:bg-white group-hover:opacity-100"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={siguiente}
              aria-label="Foto siguiente"
              className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-gray-700 opacity-0 shadow transition hover:bg-white group-hover:opacity-100"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
              {activa + 1} / {fotos.length}
            </span>
          </>
        )}
      </div>

      {fotos.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {fotos.map((foto, i) => (
            <button
              key={foto + i}
              type="button"
              onClick={() => setActiva(i)}
              aria-label={`Ver foto ${i + 1}`}
              className={`relative h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                i === activa ? "border-gray-900" : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              <Image src={foto} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
