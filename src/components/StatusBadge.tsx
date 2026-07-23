import { cn } from "@/lib/utils";
import { watchDisplay, type Tone } from "@/lib/format";
import type { WatchState } from "@/api/schemas";

const toneToDot: Record<Tone, string> = {
  default: "bg-foreground/50",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  muted: "bg-muted-foreground",
};

const toneToText: Record<Tone, string> = {
  default: "text-muted-foreground",
  success: "text-foreground",
  warning: "text-muted-foreground",
  destructive: "text-destructive",
  muted: "text-muted-foreground",
};

/** Renders a watch's status from its REST `active` flag plus any live SSE
 *  state. REST only knows active/paused; the connection detail arrives over the
 *  stream. */
export function StatusBadge({
  active,
  liveState,
}: {
  active: boolean;
  liveState?: WatchState;
}) {
  const { label, tone, pulse } = watchDisplay(active, liveState);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium",
        toneToText[tone],
      )}
    >
      <span className="relative flex size-2">
        {pulse && (
          <span
            className={cn(
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
              toneToDot[tone],
            )}
          />
        )}
        <span
          className={cn(
            "relative inline-flex size-2 rounded-full",
            toneToDot[tone],
          )}
        />
      </span>
      {label}
    </span>
  );
}
