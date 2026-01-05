import type { LeadStage } from "../leads.types";
import { cn } from "@/lib/utils";

const labels: Record<LeadStage, string> = {
  new: "Nuevo",
  contacted: "Contactado",
  interested: "Interesado",
  negotiation: "Negociación",
  won: "Ganado",
  lost: "Perdido",
};

export function LeadStageBadge({ stage }: { stage: LeadStage }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        // default light (negro)
        stage === "new" && "border-slate-300 bg-white text-slate-900",

        stage === "contacted" &&
          "border-blue-300 bg-blue-50 text-blue-900",

        stage === "interested" &&
          "border-amber-300 bg-amber-50 text-amber-900",

        stage === "negotiation" &&
          "border-purple-300 bg-purple-50 text-purple-900",

        stage === "won" &&
          "border-emerald-300 bg-emerald-50 text-emerald-900",

        stage === "lost" &&
          "border-rose-300 bg-rose-50 text-rose-900"
      )}
    >
      {labels[stage]}
    </span>
  );
}
