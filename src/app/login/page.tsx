import { Suspense } from "react";
import LoginClient from "./login-client";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center text-sm text-slate-600">
          Cargando…
        </div>
      }
    >
      <LoginClient />
    </Suspense>
  );
}
