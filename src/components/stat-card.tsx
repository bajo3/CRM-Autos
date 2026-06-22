import Link from "next/link";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "ok" | "warn" | "danger";

const TONE_RING: Record<Tone, string> = {
  neutral: "text-brand-700",
  ok: "text-ok",
  warn: "text-warn",
  danger: "text-danger",
};

export function StatCard({
  label,
  value,
  href,
  tone = "neutral",
  icon: Icon,
}: {
  label: string;
  value: number | string;
  href?: string;
  tone?: Tone;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const inner = (
    <div className="flex items-center justify-between rounded-lg border bg-card p-4 shadow-sm transition-colors hover:bg-muted/40">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className={cn("mt-1 text-2xl font-semibold", TONE_RING[tone])}>{value}</p>
      </div>
      {Icon && (
        <div className={cn("rounded-md bg-muted p-2", TONE_RING[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      )}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}
