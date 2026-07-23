import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { queryKeys } from "./keys";
import { parseOr } from "./parse";
import { meSchema, type MeData, type Watch } from "./schemas";

// GET /me is the scoped source of truth for the signed-in account (members,
// watches, subscription); one request and cache entry drives the whole app.

export function useMe() {
  const { activeLink } = useAuth();
  return useQuery({
    queryKey: queryKeys.me(activeLink),
    enabled: !!activeLink,
    // Subscription state changes out of band (checkout redirect, cancel).
    refetchInterval: 30_000,
    queryFn: ({ signal }) =>
      apiFetch<unknown>("/me", { signal }).then(
        (d) => parseOr(meSchema, d) as MeData,
      ),
  });
}

/** The account's watches with any live overlay, derived from /me. */
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

/** The account's subscription/trial view, derived from /me. */
export function useBalance() {
  const me = useMe();
  return {
    data: me.data?.balance,
    isLoading: me.isLoading,
    isError: me.isError,
  };
}

export function useAccountId(): string | undefined {
  return useMe().data?.account_id;
}
