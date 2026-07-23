import type { DeliveryEvent, WatchState } from "@/api/schemas";
import type { StreamHandlers } from "@/lib/sse";

import { mockDb } from "./db";

// Synthetic SSE generator standing in for carillon-backend's GET /events. Emits
// `delivery` and `status` events (matching live.rs shapes) for active watches,
// so the "live log firing" moment works offline.

const EVENTS: DeliveryEvent[] = [
  "new",
  "new",
  "flags_added",
  "flags_removed",
  "removed",
];
const nowSecs = () => Math.floor(Date.now() / 1000);

export function startMockStream(handlers: StreamHandlers): () => void {
  handlers.onStatus?.("connecting");
  const open = setTimeout(() => {
    handlers.onStatus?.("live");
    for (const id of mockDb.activeWatchIds()) {
      handlers.onEvent({
        type: "status",
        account: id,
        state: "watching",
        detail: null,
        at: nowSecs(),
      });
    }
  }, 300);

  const tick = setInterval(
    () => {
      const active = mockDb.activeWatchIds();
      if (active.length === 0) return;
      const id = active[Math.floor(Math.random() * active.length)];

      // Occasionally flap a watch's status to exercise the live indicator.
      if (Math.random() < 0.12) {
        const state: WatchState =
          Math.random() < 0.5 ? "reconnecting" : "watching";
        handlers.onEvent({
          type: "status",
          account: id,
          state,
          detail: null,
          at: nowSecs(),
        });
        return;
      }

      const event = EVENTS[Math.floor(Math.random() * EVENTS.length)];
      const d = mockDb.pushDelivery(id, event);
      handlers.onEvent({
        type: "delivery",
        account: d.account,
        event: d.event,
        uid: d.uid,
        ok: d.ok,
        status: d.status ?? null,
        attempts: d.attempts,
        at: d.at,
      });
    },
    3500 + Math.floor(Math.random() * 3000),
  );

  return () => {
    clearTimeout(open);
    clearInterval(tick);
  };
}
