import { useMutation } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";

// Magic-link sign-in (§ BILLING_MODEL: the human identity flow). Requesting a
// link emails a single-use token; opening the emailed link lands on the app's
// /verify route, which exchanges the token for a capability link (a plain
// awaited apiFetch — see VerifyPage). Both calls are unauthenticated (no active
// account yet).

/** POST /auth/magic/request — email a single-use sign-in link. */
export function useRequestMagicLink() {
  return useMutation<{ status: string }, Error, string>({
    mutationFn: (email: string) =>
      apiFetch<{ status: string }>("/auth/magic/request", {
        method: "POST",
        body: { email },
        token: null,
      }),
  });
}
