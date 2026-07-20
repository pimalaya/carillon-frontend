import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { queryKeys } from './keys';
import { parseOr } from './parse';
import {
  checkoutResponseSchema,
  packsResponseSchema,
  type CheckoutResponse,
} from './schemas';

/** GET /billing/packs — the catalogue (watch-time only; price is the provider's). */
export function usePacks() {
  return useQuery({
    queryKey: queryKeys.packs(),
    staleTime: 5 * 60_000,
    queryFn: ({ signal }) =>
      apiFetch<unknown>('/billing/packs', { signal, token: null }).then((d) =>
        parseOr(packsResponseSchema, d),
      ),
  });
}

/**
 * POST /billing/checkout — start a purchase for the link's account. The server
 * records a pending session and returns the provider checkout URL; the top-up
 * lands later via /billing/webhook (in mock mode it settles immediately). (D§3)
 */
export function useCheckout() {
  const { activeLink } = useAuth();
  const qc = useQueryClient();
  return useMutation<CheckoutResponse, Error, string>({
    mutationFn: (pack) =>
      apiFetch<unknown>('/billing/checkout', { method: 'POST', body: { pack } }).then((d) =>
        parseOr(checkoutResponseSchema, d),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.me(activeLink) }),
  });
}
