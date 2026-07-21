import { BellRing } from "lucide-react";

import { cn } from "@/lib/utils";

/** Carillon wordmark: a bell (chime) + name. Calm, status-focused. (PLAN §9) */
export function Brand({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <BellRing className="size-4" />
      </span>
      <span className="text-sm font-semibold tracking-tight">Carillon</span>
    </div>
  );
}
