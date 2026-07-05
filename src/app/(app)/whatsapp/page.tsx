import { MessageCircle } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { BandejaShell } from "@/components/whatsapp/bandeja-shell";
import type { FiltrosBandeja } from "./data";

export const dynamic = "force-dynamic";

export default async function WhatsappPage({
  searchParams,
}: {
  searchParams: FiltrosBandeja;
}) {
  return (
    <div>
      <PageHeader
        title="WhatsApp"
        description="Bandeja centralizada de conversaciones por WhatsApp Business."
      />
      <BandejaShell searchParams={searchParams}>
        <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
          <MessageCircle className="h-10 w-10 opacity-40" />
          <p className="text-sm">Elegí una conversación de la izquierda para verla.</p>
        </div>
      </BandejaShell>
    </div>
  );
}
