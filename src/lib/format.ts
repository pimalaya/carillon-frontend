import type { DeliveryEvent, WatchState } from "@/api/schemas";

// Presentation helpers over server timestamps (unix seconds) plus label/tone
// maps for event types and watch state. Pure, dependency-free.

/** Coerce a unix-seconds number (or ISO string) to epoch millis. */
function toMillis(t?: number | string | null): number | null {
  if (t === null || t === undefined) return null;
  if (typeof t === "number") return t * 1000;
  const parsed = Date.parse(t);
  return Number.isNaN(parsed) ? null : parsed;
}

const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

/** "2 minutes ago", "just now". Accepts unix seconds. '—' on empty. */
export function formatRelativeTime(at?: number | string | null): string {
  const ms = toMillis(at);
  if (ms === null) return "—";
  const deltaSec = Math.round((ms - Date.now()) / 1000);
  const abs = Math.abs(deltaSec);
  if (abs < 45) return "just now";
  const steps: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["week", 604_800],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];
  for (const [unit, size] of steps) {
    if (abs >= size) return rtf.format(Math.round(deltaSec / size), unit);
  }
  return rtf.format(deltaSec, "second");
}

export function formatDateTime(at?: number | string | null): string {
  const ms = toMillis(at);
  if (ms === null) return "—";
  return new Date(ms).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** An absolute short date from a unix-seconds timestamp — "Aug 3, 2026".
 *  Used for subscription renewal and trial-end dates. */
export function formatDate(at?: number | string | null): string {
  const ms = toMillis(at);
  if (ms === null) return "—";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(ms));
}

/** Whole days from now until `at` (unix seconds); negative if past. */
export function daysUntil(at?: number | string | null): number | null {
  const ms = toMillis(at);
  if (ms === null) return null;
  return Math.ceil((ms - Date.now()) / 86_400_000);
}

export type Tone = "default" | "success" | "warning" | "destructive" | "muted";

export function eventMeta(event: DeliveryEvent): { label: string; tone: Tone } {
  switch (event) {
    case "new":
      return { label: "New", tone: "success" };
    case "changed":
      return { label: "Changed", tone: "default" };
    case "flags_added":
      return { label: "Flags +", tone: "default" };
    case "flags_removed":
      return { label: "Flags −", tone: "muted" };
    case "removed":
      return { label: "Removed", tone: "warning" };
  }
}

/**
 * Display a watch's status from its `active` flag plus any live SSE state. REST
 * only knows active/paused; the connection detail arrives over the `status`
 * stream.
 */
export function watchDisplay(
  active: boolean,
  liveState?: WatchState,
): { label: string; tone: Tone; pulse: boolean } {
  if (!active) return { label: "Paused", tone: "muted", pulse: false };
  switch (liveState) {
    case "watching":
      return { label: "Watching", tone: "success", pulse: true };
    case "reconnecting":
      return { label: "Reconnecting", tone: "warning", pulse: true };
    case "error":
      return { label: "Error", tone: "destructive", pulse: false };
    case "stopped":
      return { label: "Stopped", tone: "muted", pulse: false };
    default:
      // Active in the store but the stream hasn't reported a state yet; treat
      // active as healthy (green) until it says otherwise.
      return { label: "Active", tone: "success", pulse: true };
  }
}
