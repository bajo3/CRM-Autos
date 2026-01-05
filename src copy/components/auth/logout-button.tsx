"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function LogoutButton({ fullWidth = false }: { fullWidth?: boolean }) {
  const [closing, setClosing] = useState(false);

  async function logout() {
    if (closing) return;
    setClosing(true);

    try {
      await supabase.auth.signOut();
    } finally {
      // el redirect puede tardar un toque, por eso dejamos el cartel visible
      window.location.href = "/login";
    }
  }

  return (
    <>
      {closing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="rounded-xl bg-white px-5 py-4 shadow-lg border border-slate-200 flex items-center gap-3">
            <div className="h-5 w-5 rounded-full border-2 border-slate-300 border-t-slate-700 animate-spin" />
            <div className="text-sm text-slate-900 font-medium">Cerrando sesión…</div>
          </div>
        </div>
      )}

      <Button
        variant="outline"
        onClick={logout}
        disabled={closing}
        className={fullWidth ? "w-full" : ""}
        title="Cerrar sesión"
      >
        <LogOut className="mr-2 h-4 w-4" />
        {closing ? "Cerrando sesión…" : "Cerrar sesión"}
      </Button>
    </>
  );
}
