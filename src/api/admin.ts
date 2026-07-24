import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";

// Client for the backend's localhost-only admin console (see the backend
// `admin-console` change). These routes live only on the loopback admin
// listener; loaded over the public origin they 404, which is the intended
// off-tunnel behaviour — the hooks surface that as an "unavailable" state
// rather than a hard error. The active capability link (a whitelisted-email
// session) is sent as Bearer automatically by apiFetch.

export interface AdminOverview {
  total_accounts: number;
  recent_signups: number;
  signup_window_secs: number;
  total_credits: number;
}

export interface AdminAccount {
  id: string;
  email: string | null;
  credits: number;
  created_at: number | null;
  blocked: boolean;
  watch_count: number;
}

export interface AdminWatch {
  id: string;
  source_kind: string;
  imap_host: string;
  imap_port: number;
  login: string;
  provider: string;
  mailbox: string;
  notify_url: string;
  active: boolean;
  /** Paid-through time (Unix seconds); absent when never activated. */
  watching_until?: number | null;
  carddav_url?: string;
}

const adminKeys = {
  overview: ["admin", "overview"] as const,
  accounts: ["admin", "accounts"] as const,
  watches: (id: string) => ["admin", "accounts", id, "watches"] as const,
};

export function useAdminOverview() {
  return useQuery({
    queryKey: adminKeys.overview,
    // The console is a rarely-open ops tool; don't hammer the loopback API.
    staleTime: 15_000,
    retry: false,
    queryFn: ({ signal }) => apiFetch<AdminOverview>("/admin/overview", { signal }),
  });
}

export function useAdminAccounts() {
  return useQuery({
    queryKey: adminKeys.accounts,
    staleTime: 15_000,
    retry: false,
    queryFn: ({ signal }) =>
      apiFetch<{ accounts: AdminAccount[] }>("/admin/accounts", { signal }).then(
        (d) => d.accounts,
      ),
  });
}

/** One account's watches, lazy-loaded — only fetched when `enabled` (the
 *  admin console expands that user's row). */
export function useAccountWatches(id: string, enabled: boolean) {
  return useQuery({
    queryKey: adminKeys.watches(id),
    enabled,
    staleTime: 15_000,
    retry: false,
    queryFn: ({ signal }) =>
      apiFetch<AdminWatch[]>(`/admin/accounts/${id}/watches`, { signal }),
  });
}

export function useAdjustCredits() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, delta }: { id: string; delta: number }) =>
      apiFetch<{ id: string; credits: number }>(`/admin/accounts/${id}/credits`, {
        method: "POST",
        body: { delta },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.accounts });
      qc.invalidateQueries({ queryKey: adminKeys.overview });
    },
  });
}

export function useSetBlocked() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, blocked }: { id: string; blocked: boolean }) =>
      apiFetch<{ id: string; blocked: boolean }>(`/admin/accounts/${id}/block`, {
        method: "POST",
        body: { blocked },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.accounts }),
  });
}
