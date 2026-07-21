import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { STAGES } from "./types";

export function Stepper({
  current,
  stages = STAGES,
}: {
  current: number;
  stages?: readonly string[];
}) {
  return (
    <ol className="flex items-center gap-2">
      {stages.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                done && "bg-success text-success-foreground",
                active && "bg-primary text-primary-foreground",
                !done && !active && "bg-muted text-muted-foreground",
              )}
            >
              {done ? <Check className="size-3.5" /> : i + 1}
            </span>
            <span
              className={cn(
                "hidden text-xs font-medium sm:inline",
                active ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {label}
            </span>
            {i < stages.length - 1 && (
              <span
                className={cn("h-px flex-1", done ? "bg-success" : "bg-border")}
                aria-hidden
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
