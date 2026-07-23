// Query keys scoped by the active capability link, so switching accounts
// re-scopes and refetches everything.

export const queryKeys = {
  me: (link: string | null) => ["me", link] as const,
  deliveries: (link: string | null, filter?: string) =>
    ["deliveries", link, filter ?? "all"] as const,
  mailboxes: (link: string | null, login: string, host: string, port: number) =>
    ["mailboxes", link, login, host, port] as const,
};
