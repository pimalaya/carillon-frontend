import { useMutation } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { parseOr } from './parse';
import {
  authResultSchema,
  testVerdictSchema,
  type AuthRequest,
  type AuthResult,
  type TestRequest,
  type TestVerdict,
} from './schemas';

// Onboarding + identity flows. /test and /auth are public (pre-account) and
// rate-limited per (IP, login); /signout carries the capability link. (D§5)

/** POST /test — probe credentials read-only (no credit spent). */
export function useTestConnect() {
  return useMutation<TestVerdict, Error, TestRequest>({
    mutationFn: (input) =>
      apiFetch<unknown>('/test', { method: 'POST', body: input, token: null }).then((d) =>
        parseOr(testVerdictSchema, d),
      ),
  });
}

export interface AuthenticateInput extends AuthRequest {
  /** Send the active link so the server joins this mailbox to that account. */
  associate?: boolean;
}

/**
 * POST /auth — prove control of a mailbox → mint/recover/join a capability
 * link. Presenting a valid link joins; otherwise the server recovers the
 * mailbox's existing account or creates a new one. (D§5)
 */
export function useAuthenticate() {
  return useMutation<AuthResult, Error, AuthenticateInput>({
    mutationFn: ({ associate, ...body }) =>
      apiFetch<unknown>('/auth', {
        method: 'POST',
        body,
        token: associate ? undefined : null,
      }).then((d) => parseOr(authResultSchema, d)),
  });
}

/** POST /signout — revoke the presented capability link server-side. */
export function useSignout() {
  return useMutation<void, Error, void>({
    mutationFn: () => apiFetch<void>('/signout', { method: 'POST' }),
  });
}
