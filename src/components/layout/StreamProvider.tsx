import { createContext, useContext, type ReactNode } from "react";

import { useLiveDeliveries } from "@/api/deliveries";
import type { StreamStatus } from "@/lib/sse";

// Runs exactly one app-wide SSE subscription (across every page, onboarding
// included) and exposes its status. A single stream avoids duplicate events;
// the wizard's live-verify log and the header indicator both read this. (PLAN §8)
const StreamStatusContext = createContext<StreamStatus>("idle");

export function useStreamStatus(): StreamStatus {
  return useContext(StreamStatusContext);
}

export function StreamProvider({ children }: { children: ReactNode }) {
  const status = useLiveDeliveries(true);
  return (
    <StreamStatusContext.Provider value={status}>
      {children}
    </StreamStatusContext.Provider>
  );
}
