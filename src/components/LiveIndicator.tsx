import { cn } from "@/lib/utils";
import type { StreamStatus } from "@/lib/sse";

const meta: Record<StreamStatus, { label: string; dot: string; text: string }> =
  {
    idle: {
      label: "Idle",
      dot: "bg-muted-foreground",
      text: "text-muted-foreground",
    },
    connecting: {
      label: "Connecting",
      dot: "bg-warning",
      text: "text-muted-foreground",
    },
    live: { label: "Live", dot: "bg-success", text: "text-foreground" },
    stale: {
      label: "Reconnecting",
      dot: "bg-warning",
      text: "text-muted-foreground",
    },
  };

/** Live/stale pill for the header and log toolbars. (PLAN §8) */
export function LiveIndicator({ status }: { status: StreamStatus }) {
  const { label, dot, text } = meta[status];
  const animate =
    status === "live" || status === "connecting" || status === "stale";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium",
        text,
      )}
    >
      <span className="relative flex size-2">
        {animate && (
          <span
            className={cn(
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
              dot,
            )}
          />
        )}
        <span className={cn("relative inline-flex size-2 rounded-full", dot)} />
      </span>
      {label}
    </span>
  );
}
