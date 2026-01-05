export function toErrorMessage(err: unknown, fallback = "Ocurrió un error") {
  if (!err) return fallback;
  if (typeof err === "string") return err;

  // Supabase / PostgrestError suele tener { message, details, hint, code }
  const anyErr = err as any;
  const msg = anyErr?.message || anyErr?.error_description || anyErr?.error || anyErr?.details;
  if (typeof msg === "string" && msg.trim()) return msg;

  try {
    return JSON.stringify(anyErr);
  } catch {
    return fallback;
  }
}
