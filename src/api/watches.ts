import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { queryKeys } from './keys';
import { patchMe } from './cache';
import { parseOr } from './parse';
import {
  createWatchResultSchema,
  rotateResultSchema,
  type CreateWatchRequest,
  type MeData,
} from './schemas';

// Watch mutations. The list itself lives in the /me cache (see api/me.ts); these
// patch it optimistically and invalidate on settle. Endpoints are global on the
// server (no per-account scoping), keyed by watch id. (api.rs)

export function useCreateWatch() {
  const { activeLink } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateWatchRequest) =>
      apiFetch<unknown>('/watches', { method: 'POST', body: input }).then((d) =>
        parseOr(createWatchResultSchema, d),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.me(activeLink) }),
  });
}

function useActiveToggle(action: 'pause' | 'resume', active: boolean) {
  const { activeLink } = useAuth();
  const qc = useQueryClient();
  const key = queryKeys.me(activeLink);
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<unknown>(`/watches/${id}/${action}`, { method: 'POST' }),
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<MeData>(key);
      patchMe(qc, activeLink, (me) => ({
        ...me,
        watches: me.watches.map((w) => (w.id === id ? { ...w, active } : w)),
      }));
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) qc.setQueryData(key, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function usePauseWatch() {
  return useActiveToggle('pause', false);
}

export function useResumeWatch() {
  return useActiveToggle('resume', true);
}

export function useDeleteWatch() {
  const { activeLink } = useAuth();
  const qc = useQueryClient();
  const key = queryKeys.me(activeLink);
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/watches/${id}`, { method: 'DELETE' }),
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<MeData>(key);
      patchMe(qc, activeLink, (me) => ({
        ...me,
        watches: me.watches.filter((w) => w.id !== id),
      }));
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) qc.setQueryData(key, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

/**
 * Rotate a watch's HMAC secret. Returns the NEW secret once (the server never
 * exposes it again), plus when the previous one stops being signed with.
 */
export function useRotateSecret() {
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<unknown>(`/watches/${id}/rotate-secret`, { method: 'POST', body: {} }).then(
        (d) => parseOr(rotateResultSchema, d),
      ),
  });
}
