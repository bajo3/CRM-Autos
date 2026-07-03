import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/types/database.types";

/** Refresca la sesión y protege las rutas de la app. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getClaims() valida la firma del JWT localmente (el proyecto usa claves asimétricas
  // ES256) contra un JWKS cacheado en memoria, en vez de pegarle a la red en cada
  // navegación como hace getUser(). Es seguro para la decisión de redirect del middleware
  // porque el gate real de datos es RLS: un JWT alterado no puede pasar la verificación
  // de firma, y si expiró simplemente no hay claims válidas.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims ?? null;

  const path = request.nextUrl.pathname;
  const isAuthRoute = path.startsWith("/login");
  const isPublic =
    isAuthRoute ||
    path.startsWith("/p/") || // stock público por empresa
    path.startsWith("/api/mercadolibre/"); // callback OAuth + webhook de ML

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}
