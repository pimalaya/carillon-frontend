import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { queryKeys } from './keys';
import { parseOr } from './parse';
import {
  checkoutResponseSchema,
  plansResponseSchema,
  portalResponseSchema,
  type CheckoutResponse,
  type PortalResponse,
} from './schemas';

/** GET /billing/plans — the subscription plans on offer (price is the
 *  provider's, shown on its hosted checkout page). */
export function usePlans() {
  return useQuery({
    queryKey: queryKeys.plans(),
    staleTime: 5 * 60_000,
    queryFn: ({ signal }) =>
      apiFetch<unknown>('/billing/plans', { signal, token: null }).then((d) =>
        parseOr(plansResponseSchema, d),
      ),
  });
}

/**
 * POST /billing/checkout — start a subscription to `plan` for one of the
 * link's mailboxes (subscriptions are per-mailbox). The server records a
 * pending session and returns the provider checkout URL; the subscription is
 * activated later via /billing/webhook (in mock mode it settles immediately).
 */
export function useCheckout() {
  const { activeLink } = useAuth();
  const qc = useQueryClient();
  return useMutation<CheckoutResponse, Error, { plan: string; mailbox_key: string }>({
    mutationFn: (body) =>
      apiFetch<unknown>('/billing/checkout', { method: 'POST', body }).then((d) =>
        parseOr(checkoutResponseSchema, d),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.me(activeLink) }),
  });
}

/**
 * POST /billing/portal — open a self-service billing-portal session (update
 * card, cancel) for ONE mailbox's subscription. Requires that mailbox to have
 * a Stripe customer (i.e. having subscribed at least once).
 */
export function usePortal() {
  return useMutation<PortalResponse, Error, { mailbox_key: string }>({
    mutationFn: (body) =>
      apiFetch<unknown>('/billing/portal', { method: 'POST', body }).then((d) =>
        parseOr(portalResponseSchema, d),
      ),
  });
}
