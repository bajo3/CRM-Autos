"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star, Trash2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { registrarFoto, eliminarFoto, marcarPrincipal } from "@/app/(app)/stock/[id]/actions";
import { Button } from "@/components/ui/button";

type Foto = { id: string; url: string; es_principal: boolean };

function pathFromUrl(url: string): string {
  const marker = "/vehiculos/";
  const i = url.indexOf(marker);
  return i >= 0 ? url.slice(i + marker.length) : url;
}

export function FotosManager({
  vehiculoId,
  empresaId,
  fotos,
}: {
  vehiculoId: string;
  empresaId: string;
  fotos: Foto[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploading(true);
    setError(null);
    const sb = createClient();
    try {
      for (let idx = 0; idx < files.length; idx++) {
        const file = files[idx];
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `${empresaId}/${vehiculoId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await sb.storage.from("vehiculos").upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        });
        if (upErr) throw upErr;
        const { data } = sb.storage.from("vehiculos").getPublicUrl(path);
        await registrarFoto(vehiculoId, data.publicUrl, fotos.length === 0 && idx === 0);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border bg-white px-3 py-1.5 text-sm shadow-sm hover:bg-muted">
          <Upload className="h-4 w-4" />
          {uploading ? "Subiendo…" : "Subir fotos"}
          <input type="file" accept="image/*" multiple className="hidden" onChange={onFiles} disabled={uploading} />
        </label>
        <span className="text-xs text-muted-foreground">{fotos.length} foto(s)</span>
      </div>

      {error && <p className="mb-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {fotos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin fotos cargadas todavía.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {fotos.map((f) => (
            <div key={f.id} className="group relative overflow-hidden rounded-md border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.url} alt="Foto del vehículo" className="aspect-[4/3] w-full object-cover" />
              {f.es_principal && (
                <span className="absolute left-1 top-1 rounded bg-brand-800 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  Principal
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-black/60 to-transparent p-1 opacity-0 transition-opacity group-hover:opacity-100">
                {!f.es_principal && (
                  <Button type="button" size="icon" variant="subtle" disabled={pending}
                    onClick={() => start(() => marcarPrincipal(vehiculoId, f.id).then(() => router.refresh()))}
                    title="Marcar como principal">
                    <Star className="h-4 w-4" />
                  </Button>
                )}
                <Button type="button" size="icon" variant="danger" disabled={pending}
                  onClick={() => {
                    if (confirm("¿Eliminar esta foto?")) {
                      start(() => eliminarFoto(vehiculoId, f.id, pathFromUrl(f.url)).then(() => router.refresh()));
                    }
                  }}
                  title="Eliminar">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
