// TanStack Query keys, scoped by the active account's capability link so that
// switching accounts re-scopes (and refetches) everything. /me is the single
// scoped source for the account's watches + credit pool. (PLAN §8)

export const queryKeys = {
  me: (link: string | null) => ["me", link] as const,
  deliveries: (link: string | null, filter?: string) =>
    ["deliveries", link, filter ?? "all"] as const,
  mailboxes: (link: string | null, login: string, host: string, port: number) =>
    ["mailboxes", link, login, host, port] as const,
};
