"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Car } from "lucide-react";
import { login } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Ingresando…" : "Ingresar"}
    </Button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useFormState(login, {});
  const showDemoCredentials = process.env.NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS === "1";

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-900 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-brand-800 text-white">
            <Car className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold">CRM Automotor</h1>
          <p className="text-sm text-muted-foreground">Gestión integral para agencias</p>
        </div>

        <form action={formAction} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required autoComplete="email"
              placeholder="vos@agencia.com" defaultValue={showDemoCredentials ? "dueno@jesusdiaz.com" : undefined} />
          </div>
          <div>
            <Label htmlFor="password">Contraseña</Label>
            <Input id="password" name="password" type="password" required
              autoComplete="current-password" defaultValue={showDemoCredentials ? "demo1234" : undefined} />
          </div>

          {state?.error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
          )}

          <SubmitButton />
        </form>

        {showDemoCredentials && (
          <p className="mt-6 rounded-md bg-muted px-3 py-2 text-center text-xs text-muted-foreground">
            Demo: <strong>dueno@jesusdiaz.com</strong> · <strong>demo1234</strong>
          </p>
        )}
      </div>
    </div>
  );
}
