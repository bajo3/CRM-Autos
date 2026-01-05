"use client";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Modal({
  open,
  title,
  children,
  onClose,
  className,
}: {
  open: boolean;
  title?: string;
  children: React.ReactNode;
  onClose: () => void;
  className?: string;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className={cn("w-full max-w-xl rounded-3xl bg-white shadow-soft border border-slate-200", className)}>
          <div className="flex items-center justify-between p-5 pb-3">
            <div className="text-base font-semibold text-slate-900">{title ?? "Nuevo"}</div>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="p-5 pt-0">{children}</div>
        </div>
      </div>
    </div>
  );
}
