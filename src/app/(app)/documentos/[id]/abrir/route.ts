import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Devuelve una URL firmada temporal del PDF y redirige a ella (bucket privado). */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const sb = createClient();
  const { data: doc } = await sb
    .from("documento_comercial")
    .select("pdf_url")
    .eq("id", params.id)
    .maybeSingle<{ pdf_url: string | null }>();
  if (!doc?.pdf_url) return new NextResponse("Documento no encontrado", { status: 404 });

  const { data, error } = await sb.storage.from("documentos").createSignedUrl(doc.pdf_url, 600);
  if (error || !data) return new NextResponse("No se pudo abrir el documento", { status: 500 });

  return NextResponse.redirect(data.signedUrl);
}
