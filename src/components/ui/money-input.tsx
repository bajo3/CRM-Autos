"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

function formatMiles(digits: string): string {
  if (!digits) return "";
  return new Intl.NumberFormat("es-AR").format(Number(digits));
}

/**
 * Input de monto en ARS: muestra separador de miles mientras se escribe
 * y envía el valor numérico limpio en un input oculto con el `name` real.
 */
export const MoneyInput = React.forwardRef<
  HTMLInputElement,
  {
    id?: string;
    name: string;
    defaultValue?: number | string | null;
    required?: boolean;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    onValueChange?: (value: number) => void;
  }
>(({ id, name, defaultValue, required, placeholder = "0", className, disabled, onValueChange }, ref) => {
  const initialDigits =
    defaultValue != null && defaultValue !== "" ? String(Math.trunc(Number(defaultValue))) : "";
  const [digits, setDigits] = React.useState(initialDigits);

  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
        $
      </span>
      <input
        ref={ref}
        type="text"
        inputMode="numeric"
        id={id}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        value={formatMiles(digits)}
        onChange={(e) => {
          const clean = e.target.value.replace(/\D/g, "");
          setDigits(clean);
          onValueChange?.(clean ? Number(clean) : 0);
        }}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-white pl-6 pr-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
      />
      <input type="hidden" name={name} value={digits} />
    </div>
  );
});
MoneyInput.displayName = "MoneyInput";
