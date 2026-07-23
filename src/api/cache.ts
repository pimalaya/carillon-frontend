import type { QueryClient } from "@tanstack/react-query";

import { queryKeys } from "./keys";
import type { MeData, Watch } from "./schemas";

// Shared /me cache mutators; both mutations and the live SSE stream patch in place.

export function patchMe(
  qc: QueryClient,
  link: string | null,
  fn: (me: MeData) => MeData,
) {
  qc.setQueryData<MeData>(queryKeys.me(link), (old) => (old ? fn(old) : old));
}

/** Patch one watch in the /me cache by id (== the SSE `account` field). */
export function patchMeWatch(
  qc: QueryClient,
  link: string | null,
  watchId: string,
  fn: (watch: Watch) => Watch,
) {
  patchMe(qc, link, (me) => ({
    ...me,
    watches: me.watches.map((w) => (w.id === watchId ? fn(w) : w)),
  }));
}
