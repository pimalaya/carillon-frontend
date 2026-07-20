import { z } from 'zod';

// Typed API boundary — mirrors carillon-server's OpenAPI contract
// (carillon-server/docs/openapi.yaml) field-for-field. Wire fields are
// snake_case; timestamps are unix seconds; watch-time is seconds (float).
// Kept snake_case on purpose so there's no lossy transform between the wire
// and the UI — what the server sends is what we render.
//
// Invariant: nothing here carries message content. Events are {account, event,
// uid} only — no sender, subject, or body. (DECISIONS §1, §4)

// ── Watches ───────────────────────────────────────────────────────────────────

/** A watch's REST view — never the password or HMAC secret. (WatchView) */
export const watchViewSchema = z.object({
  id: z.string(),
  imap_host: z.string(),
  imap_port: z.number(),
  login: z.string(),
  mailbox: z.string(),
  notify_url: z.string(),
  active: z.boolean(),
});
export type WatchView = z.infer<typeof watchViewSchema>;

/**
 * Live connection state, delivered over SSE `status` events (not the REST
 * view, which only exposes `active`). (live.rs WatchState)
 */
export const watchStateSchema = z.enum(['watching', 'reconnecting', 'error', 'stopped']);
export type WatchState = z.infer<typeof watchStateSchema>;

/** REST view + client-side live overlay (from SSE). Rendered by the UI. */
export type Watch = WatchView & {
  /** Latest SSE-reported connection state; undefined until the stream reports one. */
  liveState?: WatchState;
  /** Unix seconds of the last delivery seen for this watch (client-tracked). */
  lastEventAt?: number;
  /** Detail string from the last status event (e.g. an error message). */
  liveDetail?: string | null;
};

/**
 * Body of POST /watches. The client supplies both the watch `id` and the
 * `hmac_secret` (so it can show the secret to the user once). `account_id`
 * joins the watch to a shared billing pool; omit for a per-watch account.
 */
export interface CreateWatchRequest {
  id: string;
  imap_host: string;
  imap_port: number;
  login: string;
  password: string;
  mailbox: string;
  notify_url: string;
  hmac_secret: string;
  account_id?: string;
  active?: boolean;
}

export const createWatchResultSchema = z.object({
  status: z.string(),
  id: z.string(),
});

export const rotateResultSchema = z.object({
  status: z.string(),
  /** The new secret, returned once. */
  secret: z.string(),
  /** Unix seconds until the previous secret stops being signed with. */
  prev_expires_at: z.number(),
});
export type RotateResult = z.infer<typeof rotateResultSchema>;

// ── Test / onboarding ─────────────────────────────────────────────────────────

export interface TestRequest {
  imap_host: string;
  imap_port: number;
  login: string;
  password: string;
  mailbox: string;
}

/**
 * Verdict from POST /test. `ok` is the green light: reachable AND authenticated
 * AND idle AND qresync — never merely authenticated. (TestVerdict)
 */
export const testVerdictSchema = z.object({
  ok: z.boolean(),
  reachable: z.boolean(),
  authenticated: z.boolean(),
  idle: z.boolean(),
  qresync: z.boolean(),
  condstore: z.boolean(),
  missing: z.array(z.string()).default([]),
  error: z.string().nullable().optional(),
});
export type TestVerdict = z.infer<typeof testVerdictSchema>;

// ── Identity (login-less accounts, D§5) ───────────────────────────────────────

export interface AuthRequest {
  imap_host: string;
  imap_port: number;
  login: string;
  password: string;
  mailbox: string;
}

/**
 * Result of POST /auth. First auth `created` an account, a re-auth `recovered`
 * (re-minted) its link, an auth carrying a valid link `joined` the mailbox to
 * that account. `link` is the capability bearer — store it. (AuthResult)
 */
export const authResultSchema = z.object({
  account_id: z.string(),
  action: z.enum(['created', 'recovered', 'joined']),
  link: z.string(),
  watchable: z.boolean(),
  idle: z.boolean(),
  qresync: z.boolean(),
});
export type AuthResult = z.infer<typeof authResultSchema>;

// ── Accounts & balance (two counters, D§3) ────────────────────────────────────

/** A member mailbox's non-refillable trial, within an account view. */
export const accountMailboxSchema = z.object({
  /** Null for a proven mailbox that has no watch yet. */
  watch_id: z.string().nullable(),
  mailbox_key: z.string(),
  trial_secs: z.number(),
});
export type AccountMailbox = z.infer<typeof accountMailboxSchema>;

/** Public view of a billing account: the two counters. (AccountView) */
export const accountViewSchema = z.object({
  id: z.string(),
  /** Account-shared refillable pool, in seconds. The only thing money touches. */
  paid_secs: z.number(),
  /** Unix seconds the pool expires (~12 months), or null. */
  paid_expires: z.number().nullable().optional(),
  pool_expired: z.boolean(),
  auto_refill: z.boolean(),
  auto_refill_threshold: z.number(),
  auto_refill_amount: z.number(),
  mailboxes: z.array(accountMailboxSchema).default([]),
  total_available_secs: z.number(),
});
export type AccountView = z.infer<typeof accountViewSchema>;

/** A proven mailbox membership, as returned by /me. */
export const membershipSchema = z.object({
  mailbox_key: z.string(),
  login: z.string(),
  imap_host: z.string(),
});
export type Membership = z.infer<typeof membershipSchema>;

/** GET /me — the account behind the capability link. */
export const meSchema = z.object({
  account_id: z.string(),
  mailboxes: z.array(membershipSchema).default([]),
  watches: z.array(watchViewSchema).default([]),
  balance: accountViewSchema,
});
export type Me = z.infer<typeof meSchema>;

/**
 * Client-side shape of /me: the same data, but `watches` carry the live overlay
 * (liveState/lastEventAt) the SSE stream patches into the cache. This is what
 * the UI reads.
 */
export type MeData = Omit<Me, 'watches'> & { watches: Watch[] };

export interface AutoRefillRequest {
  enabled: boolean;
  threshold_secs: number;
  amount_secs: number;
}

export interface CreditRequest {
  secs: number;
  ttl_secs?: number;
}

// ── Deliveries ────────────────────────────────────────────────────────────────

export const deliveryEventSchema = z.enum([
  'new',
  'flags_added',
  'flags_removed',
  'removed',
]);
export type DeliveryEvent = z.infer<typeof deliveryEventSchema>;

/** A delivery-log row. `account` is the watch id; `at` is unix seconds. */
export const deliverySchema = z.object({
  /** The watch id (the server calls a watch's key its `account`). */
  account: z.string(),
  event: deliveryEventSchema,
  /** IMAP UID — the only mailbox-derived datum. Never content. */
  uid: z.number(),
  ok: z.boolean(),
  /** HTTP status the receiver returned, or null. */
  status: z.number().nullable().optional(),
  error: z.string().nullable().optional(),
  attempts: z.number(),
  /** Unix seconds. */
  at: z.number(),
});
export type Delivery = z.infer<typeof deliverySchema>;

// ── Billing ───────────────────────────────────────────────────────────────────

/** A credit pack: watch-seconds only. Price lives in the payment provider. */
export const packSchema = z.object({
  id: z.string(),
  secs: z.number(),
});
export type Pack = z.infer<typeof packSchema>;

export const packsResponseSchema = z.object({
  provider: z.string(),
  packs: z.array(packSchema).default([]),
});
export type PacksResponse = z.infer<typeof packsResponseSchema>;

export const checkoutResponseSchema = z.object({
  provider: z.string(),
  session_id: z.string(),
  checkout_url: z.string(),
  pack: z.string(),
  secs: z.number(),
});
export type CheckoutResponse = z.infer<typeof checkoutResponseSchema>;

// ── SSE stream (named events: `delivery`, `status`, `notice`) ──────────────────
//
// Each event's data JSON carries a `type` tag matching its event name.
// Content-free, like everything else. (live.rs LiveEvent)

export const noticeKindSchema = z.enum([
  'low_balance',
  'credit_exhausted',
  'auto_refilled',
]);
export type NoticeKind = z.infer<typeof noticeKindSchema>;

export const streamEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('delivery'),
    account: z.string(),
    event: deliveryEventSchema,
    uid: z.number(),
    ok: z.boolean(),
    status: z.number().nullable().optional(),
    attempts: z.number(),
    at: z.number(),
  }),
  z.object({
    type: z.literal('status'),
    account: z.string(),
    state: watchStateSchema,
    detail: z.string().nullable().optional(),
    at: z.number(),
  }),
  z.object({
    type: z.literal('notice'),
    account: z.string(),
    kind: noticeKindSchema,
    detail: z.string().nullable().optional(),
    at: z.number(),
  }),
]);
export type StreamEvent = z.infer<typeof streamEventSchema>;
