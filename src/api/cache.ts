import type { QueryClient } from '@tanstack/react-query';

import { queryKeys } from './keys';
import type { MeData, Watch } from './schemas';

// Shared cache mutators for the /me query (the account's watches + balance).
// Mutations and the live stream both patch it in place. (PLAN §8)

export function patchMe(
  qc: QueryClient,
  link: string | null,
  fn: (me: MeData) => MeData,
) {
  qc.setQueryData<MeData>(queryKeys.me(link), (old) => (old ? fn(old) : old));
}

/** Patch a single watch in the /me cache by id (== the SSE `account` field). */
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
