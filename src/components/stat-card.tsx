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
    <div className="flex items-center justify-between rounded-xl border border-border/70 bg-card p-4 shadow-elevate transition-shadow hover:shadow-elevate-hover">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className={cn("mt-1 text-2xl font-semibold", TONE_RING[tone])}>{value}</p>
      </div>
      {Icon && (
        <div className={cn("rounded-lg bg-muted p-2", TONE_RING[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      )}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}
