"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { can, type Rol } from "@/lib/auth/permissions";

export type InviteState = { error?: string; ok?: string; fieldErrors?: Record<string, string> };

const ROLES_VALIDOS: Rol[] = [
  "dueno", "encargado", "vendedor", "administrativo", "gestoria", "solo_lectura",
];

const emptyToUndef = <T extends z.ZodTypeAny>(s: T) =>
  z.union([s, z.literal("")]).transform((v) => (v === "" ? undefined : v));

const inviteSchema = z.object({
  email: z.string().email("Email inválido"),
  nombre: z.string().optional(),
  apellido: z.string().optional(),
  rol: z.enum(["dueno", "encargado", "vendedor", "administrativo", "gestoria", "solo_lectura"]),
  telefono: emptyToUndef(z.string()).optional(),
});

function fieldErrors(e: z.ZodError) {
  const fe: Record<string, string> = {};
  for (const i of e.issues) fe[String(i.path[0])] = i.message;
  return fe;
}

/** Cambia el rol de un usuario de la misma empresa. Guardado por RBAC + RLS. */
export async function cambiarRol(formData: FormData): Promise<void> {
  const ctx = await getSessionContext();
  if (!ctx?.profile?.empresa_id) throw new Error("Sesión inválida.");
  if (!can(ctx.profile.rol, "usuarios.crear")) throw new Error("Sin permiso para gestionar usuarios.");

  const userId = String(formData.get("user_id") ?? "");
  const nuevoRol = String(formData.get("rol") ?? "") as Rol;
  if (!userId || !ROLES_VALIDOS.includes(nuevoRol)) return;

  // No te podés cambiar tu propio rol (evita auto-bloqueo del último dueño).
  if (userId === ctx.userId) throw new Error("No podés cambiar tu propio rol.");
  // Solo un dueño puede asignar el rol de dueño.
  if (nuevoRol === "dueno" && ctx.profile.rol !== "dueno") {
    throw new Error("Solo el dueño puede asignar el rol de dueño.");
  }

  const sb = createClient();
  const { error } = await sb.from("profile").update({ rol: nuevoRol }).eq("id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/usuarios");
}

/** Activa o desactiva a un usuario de la empresa. */
export async function cambiarEstado(formData: FormData): Promise<void> {
  const ctx = await getSessionContext();
  if (!ctx?.profile?.empresa_id) throw new Error("Sesión inválida.");
  if (!can(ctx.profile.rol, "usuarios.crear")) throw new Error("Sin permiso para gestionar usuarios.");

  const userId = String(formData.get("user_id") ?? "");
  const activo = String(formData.get("activo") ?? "") === "true";
  if (!userId) return;
  if (userId === ctx.userId) throw new Error("No podés cambiar tu propio estado.");

  const sb = createClient();
  const { error } = await sb.from("profile").update({ activo }).eq("id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/usuarios");
}

/**
 * Alta/invitación de usuario.
 *
 * Crear usuarios en `auth.users` requiere la API de administración de Supabase,
 * que solo puede usarse con la SERVICE_ROLE_KEY (secreta, nunca en el cliente).
 * Si la clave está configurada en el entorno del servidor, invitamos por email
 * y el trigger `handle_new_user` crea el profile con empresa_id/rol. Si no está,
 * degradamos de forma segura con un mensaje claro (no hacemos signUp para no
 * pisar la sesión del admin actual).
 */
export async function invitarUsuario(_prev: InviteState, formData: FormData): Promise<InviteState> {
  const ctx = await getSessionContext();
  if (!ctx?.profile?.empresa_id) return { error: "Sesión inválida." };
  if (!can(ctx.profile.rol, "usuarios.crear")) return { error: "Sin permiso para crear usuarios." };

  const parsed = inviteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Revisá los campos.", fieldErrors: fieldErrors(parsed.error) };

  if (parsed.data.rol === "dueno" && ctx.profile.rol !== "dueno") {
    return { error: "Solo el dueño puede invitar a otro dueño." };
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !url) {
    return {
      error:
        "El alta por invitación requiere configurar SUPABASE_SERVICE_ROLE_KEY en el servidor. " +
        "Mientras tanto, el cambio de rol y el activar/desactivar ya funcionan.",
    };
  }

  const admin = createAdminClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
    data: {
      empresa_id: ctx.profile.empresa_id,
      rol: parsed.data.rol,
      nombre: parsed.data.nombre ?? "",
      apellido: parsed.data.apellido ?? "",
      telefono: parsed.data.telefono ?? null,
    },
  });
  if (error) return { error: `No se pudo invitar: ${error.message}` };

  revalidatePath("/usuarios");
  return { ok: `Invitación enviada a ${parsed.data.email}.` };
}
