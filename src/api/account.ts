import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { queryKeys } from './keys';
import { useAccountId } from './me';
import type { AutoRefillRequest, CreditRequest } from './schemas';

// Account-level billing config, keyed by the billing account id (from /me).
// (api.rs /accounts/{id}/...)

/** POST /accounts/{id}/auto-refill — configure opt-in auto-refill. */
export function useSetAutoRefill() {
  const { activeLink } = useAuth();
  const accountId = useAccountId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AutoRefillRequest) => {
      if (!accountId) throw new Error('no account');
      return apiFetch<unknown>(`/accounts/${accountId}/auto-refill`, {
        method: 'POST',
        body,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.me(activeLink) }),
  });
}

/**
 * POST /accounts/{id}/credit — top up the paid pool directly. Normally the
 * billing webhook's job; exposed here so server metering can be exercised
 * from the dashboard without a real payment.
 */
export function useAddCredit() {
  const { activeLink } = useAuth();
  const accountId = useAccountId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreditRequest) => {
      if (!accountId) throw new Error('no account');
      return apiFetch<unknown>(`/accounts/${accountId}/credit`, { method: 'POST', body });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.me(activeLink) }),
  });
}
