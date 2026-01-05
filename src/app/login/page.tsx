"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const rawNext = params.get("next") || "/dashboard";
  const nextPath = rawNext.startsWith("/") ? rawNext : "/dashboard";

  // Si ya está logueado, mandalo al destino
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      if (data.session) router.replace(nextPath);
    })();
    return () => {
      mounted = false;
    };
  }, [router, nextPath]);

  async function onLogin() {
    if (loading) return;
    setMsg(null);

    const e = email.trim();
    if (!e || !password) {
      setMsg("Completá email y contraseña.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: e,
      password,
    });
    setLoading(false);

    if (error) {
      setMsg(error.message);
      return;
    }

    router.replace(nextPath);
  }

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Login</CardTitle>
        </CardHeader>

        <CardContent>
          <form
            className="space-y-3"
            onSubmit={(ev) => {
              ev.preventDefault();
              onLogin();
            }}
          >
            <Input
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              inputMode="email"
            />

            <Input
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />

            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>

            {msg ? <div className="text-sm text-slate-600">{msg}</div> : null}
          </form>

          <div className="mt-4 text-xs text-slate-500">
            Tip: si actualizaste <span className="font-medium">dealership_id</span> /{" "}
            <span className="font-medium">role</span> en el usuario, cerrá sesión y volvé a
            iniciar para que el token se actualice.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
