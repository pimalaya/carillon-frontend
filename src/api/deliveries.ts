import { z } from 'zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useEventStream } from '@/lib/sse';
import { queryKeys } from './keys';
import { patchMeWatch } from './cache';
import { parseOr } from './parse';
import { deliverySchema, type Delivery } from './schemas';

const deliveryListSchema = z.array(deliverySchema);

export interface DeliveryFilter {
  /** Filter to one watch (server-side, via the `account` query param). */
  watchId?: string;
  limit?: number;
}

export function useDeliveries(filter: DeliveryFilter = {}) {
  const { activeLink } = useAuth();
  return useQuery({
    queryKey: queryKeys.deliveries(activeLink, filter.watchId ?? 'all'),
    enabled: !!activeLink,
    queryFn: ({ signal }) =>
      apiFetch<unknown>('/deliveries', {
        signal,
        // The server names the watch-id filter `account`.
        query: { account: filter.watchId, limit: filter.limit ?? 100 },
      }).then((d) => parseOr(deliveryListSchema, d)),
  });
}

const CAP = 200;

function prepend(qc: ReturnType<typeof useQueryClient>, key: readonly unknown[], d: Delivery) {
  qc.setQueryData<Delivery[]>(key, (old) => (old ? [d, ...old].slice(0, CAP) : old));
}

/**
 * Wire the live SSE stream into the cache: prepend delivery events into the
 * relevant lists, reflect `status` events on the watch's live state, and toast
 * entitlement `notice`s (refetching the subscription). Returns the connection
 * status for the live/stale indicator. (PLAN §8)
 */
export function useLiveDeliveries(enabled = true): ReturnType<typeof useEventStream> {
  const { activeLink } = useAuth();
  const qc = useQueryClient();

  return useEventStream(enabled, (event) => {
    if (event.type === 'delivery') {
      const d: Delivery = {
        account: event.account,
        event: event.event,
        uid: event.uid,
        ok: event.ok,
        status: event.status ?? null,
        error: null,
        attempts: event.attempts,
        at: event.at,
      };
      prepend(qc, queryKeys.deliveries(activeLink, 'all'), d);
      prepend(qc, queryKeys.deliveries(activeLink, d.account), d);
      patchMeWatch(qc, activeLink, d.account, (w) => ({ ...w, lastEventAt: d.at }));
    } else if (event.type === 'status') {
      patchMeWatch(qc, activeLink, event.account, (w) => ({
        ...w,
        liveState: event.state,
        liveDetail: event.detail ?? null,
      }));
    } else {
      // Entitlement notice — surface it and refresh the subscription state.
      const label =
        event.kind === 'trial_ending'
          ? 'Free trial ending soon'
          : 'Watch paused — subscribe to resume';
      toast.warning(label, { description: event.detail ?? undefined });
      qc.invalidateQueries({ queryKey: queryKeys.me(activeLink) });
    }
  });
}
