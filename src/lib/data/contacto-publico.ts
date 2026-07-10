type DatosContactoPublico = {
  telefono?: string | null;
  email?: string | null;
};

export function telefonoPublicoValido(value: string | null | undefined): boolean {
  const digits = (value ?? "").replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) return false;
  if (/^(\d)\1+$/.test(digits)) return false;
  if (/0{6,}$/.test(digits)) return false;
  return digits !== "5492494000000";
}

export function emailPublicoValido(value: string | null | undefined): boolean {
  const email = (value ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
  return !["example.com", "agencia.com", "test.com"].some((domain) => email.endsWith(`@${domain}`));
}

export function problemasContactoPublico(datos: DatosContactoPublico): string[] {
  const problemas: string[] = [];
  if (!telefonoPublicoValido(datos.telefono)) problemas.push("Cargá un teléfono/WhatsApp real.");
  if (!emailPublicoValido(datos.email)) problemas.push("Cargá un email comercial real.");
  return problemas;
}

export function contactoPublicoListo(datos: DatosContactoPublico): boolean {
  return problemasContactoPublico(datos).length === 0;
}
