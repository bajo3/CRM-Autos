import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

/** Estado vacío reutilizable: nunca dejar una pantalla en blanco sin explicación. */
export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed bg-card px-6 py-14 text-center",
        className,
      )}
    >
      <div className="mb-3 rounded-full bg-muted p-3 text-muted-foreground">
        <Inbox className="h-6 w-6" />
      </div>
      <p className="font-medium text-foreground">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
