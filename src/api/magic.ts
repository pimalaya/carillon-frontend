import { useMutation } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";

// Magic-link sign-in: request emails a single-use token; the /verify route
// exchanges it for a capability link (see VerifyPage). Both calls are
// unauthenticated (no active account yet).

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
