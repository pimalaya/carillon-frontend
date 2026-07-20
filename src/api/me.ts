import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { queryKeys } from './keys';
import { parseOr } from './parse';
import { meSchema, type MeData, type Watch } from './schemas';

// GET /me is the scoped source of truth for the signed-in account: its members,
// watches and balance. The dashboard, watches list and billing all derive from
// it, so a single request (and a single cache entry) drives the app. (api.rs)

export function useMe() {
  const { activeLink } = useAuth();
  return useQuery({
    queryKey: queryKeys.me(activeLink),
    enabled: !!activeLink,
    // Balance drains continuously; keep it reasonably fresh.
    refetchInterval: 30_000,
    queryFn: ({ signal }) =>
      apiFetch<unknown>('/me', { signal }).then((d) => parseOr(meSchema, d) as MeData),
  });
}

/** The account's watches (with any live overlay), derived from /me. */
export function useWatches() {
  const me = useMe();
  return {
    data: me.data?.watches as Watch[] | undefined,
    isLoading: me.isLoading,
    isError: me.isError,
  };
}

export function useWatch(id: string) {
  const me = useMe();
  return {
    data: me.data?.watches.find((w) => w.id === id),
    isLoading: me.isLoading,
    isError: me.isError,
  };
}

/** The account's two-counter balance, derived from /me. */
export function useBalance() {
  const me = useMe();
  return {
    data: me.data?.balance,
    isLoading: me.isLoading,
    isError: me.isError,
  };
}

/** The billing account id (needed for /accounts/{id}/... calls). */
export function useAccountId(): string | undefined {
  return useMe().data?.account_id;
}
