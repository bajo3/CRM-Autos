import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** URL firmada temporal del PDF del presupuesto (bucket privado, RLS por empresa). */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const sb = createClient();
  const { data: p } = await sb
    .from("presupuesto")
    .select("pdf_url")
    .eq("id", params.id)
    .maybeSingle<{ pdf_url: string | null }>();
  if (!p?.pdf_url) return new NextResponse("Presupuesto sin PDF generado", { status: 404 });

  const { data, error } = await sb.storage.from("documentos").createSignedUrl(p.pdf_url, 600);
  if (error || !data) return new NextResponse("No se pudo abrir el PDF", { status: 500 });

  return NextResponse.redirect(data.signedUrl);
}
