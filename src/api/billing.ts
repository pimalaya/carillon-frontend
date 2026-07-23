import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { queryKeys } from "./keys";
import { parseOr } from "./parse";
import { checkoutResponseSchema, type CheckoutResponse } from "./schemas";

/**
 * POST /billing/checkout — buy `packs` packs of credits in one payment
 * (§ BILLING_MODEL: the only refill unit is a 5-credit pack). The server records
 * a pending session and returns the provider checkout URL; the pool is credited
 * later via /billing/webhook (in mock mode it settles immediately).
 */
export function useCheckout() {
  const { activeLink } = useAuth();
  const qc = useQueryClient();
  return useMutation<CheckoutResponse, Error, number>({
    mutationFn: (packs: number) =>
      apiFetch<unknown>("/billing/checkout", {
        method: "POST",
        body: { packs },
      }).then((d) => parseOr(checkoutResponseSchema, d)),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.me(activeLink) }),
  });
}
