/**
 * Redacción asistida de mensajes de WhatsApp: reduce la fricción de "qué le
 * escribo" en seguimientos. El vendedor siempre revisa y confirma el envío
 * (abre wa.me con el texto precargado) — no hay envío automático a clientes.
 */

const FALLBACK_GENERICO = (motivo: string | null) =>
  motivo
    ? `¡Hola! Te escribo por: ${motivo}. ¿Charlamos?`
    : "¡Hola! ¿Pudiste ver la info que te pasé? Cualquier duda quedo a disposición.";

export async function redactarMensajeSeguimiento(params: {
  empresaNombre: string;
  clienteNombre: string;
  motivo: string | null;
  tono?: "profesional" | "cercano" | "breve";
}): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return FALLBACK_GENERICO(params.motivo);

  const tonoDesc = { profesional: "profesional y cordial", cercano: "cercano y amigable", breve: "breve y directo" }[
    params.tono ?? "profesional"
  ];

  const system = `Redactás un único mensaje de WhatsApp corto (1-2 oraciones, sin markdown, en español rioplatense) para que un vendedor de una concesionaria de autos en Argentina retome contacto con un cliente/lead.
Tono: ${tonoDesc}. No inventes datos concretos (precios, fechas, condiciones) que no te den.
Respondé ÚNICAMENTE el texto del mensaje, sin comillas ni explicaciones.`;

  const user = `Agencia: ${params.empresaNombre}
Cliente: ${params.clienteNombre}
Motivo del seguimiento: ${params.motivo || "retomar contacto general"}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 150,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic API respondió ${res.status}`);
    const json = await res.json();
    const texto = (json.content?.[0]?.text as string | undefined)?.trim();
    return texto || FALLBACK_GENERICO(params.motivo);
  } catch (err) {
    console.error("[whatsapp/sugerencias] fallback por error de IA:", err);
    return FALLBACK_GENERICO(params.motivo);
  }
}
