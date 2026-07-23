import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { queryKeys } from "./keys";
import { parseOr } from "./parse";
import { checkoutResponseSchema, type CheckoutResponse } from "./schemas";

/**
 * POST /billing/checkout — buy `packs` 5-credit packs (§ BILLING_MODEL, the only
 * refill unit). Returns the provider checkout URL; the pool is credited later via
 * /billing/webhook (mock mode settles immediately).
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
