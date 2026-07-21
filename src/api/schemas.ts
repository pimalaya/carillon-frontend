import { z } from 'zod';

// Typed API boundary — mirrors carillon-server's OpenAPI contract
// (carillon-server/docs/openapi.yaml) field-for-field. Wire fields are
// snake_case; timestamps are unix seconds. Kept snake_case on purpose so
// there's no lossy transform between the wire and the UI — what the server
// sends is what we render.
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
 * joins the watch to a shared billing account; omit for a per-watch account.
 */
export interface CreateWatchRequest {
  id: string;
  imap_host: string;
  imap_port: number;
  login: string;
  /** Omitted for an OAuth watch — the server uses the mailbox's stored OAuth
   *  credential (proved via /oauth/callback) instead. */
  password?: string;
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

// ── Discovery (email/server → IMAP config, D§2) ────────────────────────────────

/**
 * A discovered auth method. `kind` discriminates; OAuth variants carry the
 * endpoints where known. Surfaced now; OAuth login is wired later. (AuthMethod)
 */
export const authMethodSchema = z.object({
  kind: z.enum(['password', 'bearer', 'oauth', 'oauth_device', 'oauth_issuer']),
  authorization_endpoint: z.string().optional(),
  token_endpoint: z.string().optional(),
  device_authorization_endpoint: z.string().optional(),
  scope: z.string().nullable().optional(),
  issuer: z.string().optional(),
});
export type AuthMethod = z.infer<typeof authMethodSchema>;

/**
 * One onboarding choice — a server endpoint + a single auth method, grouped
 * across discovery mechanisms (the mechanism is not exposed). A hint the wizard
 * confirms. (ImapChoice)
 */
export const imapChoiceSchema = z.object({
  host: z.string(),
  port: z.number(),
  security: z.enum(['tls', 'starttls', 'plain']),
  auth: authMethodSchema,
});
export type ImapChoice = z.infer<typeof imapChoiceSchema>;

export const discoverResponseSchema = z.object({
  input: z.string(),
  choices: z.array(imapChoiceSchema).default([]),
});
export type DiscoverResponse = z.infer<typeof discoverResponseSchema>;

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
  /** Advisory: this mailbox already has a watch (create is a hard 409). */
  already_watched: z.boolean().default(false),
  error: z.string().nullable().optional(),
});
export type TestVerdict = z.infer<typeof testVerdictSchema>;

// ── Mailboxes (folder picker, POST /mailboxes) ─────────────────────────────────

/** One selectable mailbox with its special-use role, if the server flags one. */
export const mailboxEntrySchema = z.object({
  name: z.string(),
  role: z.string().nullable().optional(),
});
export type MailboxEntry = z.infer<typeof mailboxEntrySchema>;

export const mailboxesResponseSchema = z.object({
  mailboxes: z.array(mailboxEntrySchema).default([]),
});
export type MailboxesResponse = z.infer<typeof mailboxesResponseSchema>;

// ── Webhook test (POST /webhook/test) ──────────────────────────────────────────

/** Result of a one-shot test POST: did the endpoint ack, with which status. */
export const webhookTestResultSchema = z.object({
  ok: z.boolean(),
  status: z.number().nullable().optional(),
  error: z.string().nullable().optional(),
});
export type WebhookTestResult = z.infer<typeof webhookTestResultSchema>;

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

// ── Accounts & per-mailbox subscription ───────────────────────────────────────

/** A member mailbox's own subscription + free-trial state, within an account
 *  view. Subscriptions are per-mailbox. */
export const accountMailboxSchema = z.object({
  /** Null for a proven mailbox that has no watch yet. */
  watch_id: z.string().nullable(),
  mailbox_key: z.string(),
  /** Whether this mailbox's one-time free trial is still open. */
  trial_active: z.boolean(),
  /** Unix seconds the free trial ends, or null. */
  trial_expires: z.number().nullable().optional(),
  /** Whether this mailbox's own subscription is active (incl. dunning grace). */
  subscribed: z.boolean(),
  /** Coarse status: `active`/`trialing`/`past_due`/`canceled` from Stripe,
   *  `trial` when only the free trial is open, else `none`. */
  status: z.string(),
  /** Plan id this mailbox is subscribed on (`month`/`year`), if any. */
  plan: z.string().nullable().optional(),
  /** Unix seconds this mailbox's paid period ends, if subscribed. */
  current_period_end: z.number().nullable().optional(),
  /** Whether a billing-portal session can be opened (a Stripe customer exists). */
  can_manage: z.boolean().default(false),
});
export type AccountMailbox = z.infer<typeof accountMailboxSchema>;

/** Public view of a billing account: each mailbox's own subscription +
 *  free-trial state (subscriptions are per-mailbox). (AccountView) */
export const accountViewSchema = z.object({
  id: z.string(),
  /** Whether any of the account's mailboxes may currently watch. */
  entitled: z.boolean(),
  mailboxes: z.array(accountMailboxSchema).default([]),
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

// ── Billing (subscription) ─────────────────────────────────────────────────────

/** A subscription plan (`month`/`year`); the price is the provider's, shown on
 *  its hosted checkout page. `cadence_secs` is the nominal billing period. */
export const planSchema = z.object({
  id: z.string(),
  cadence_secs: z.number(),
});
export type Plan = z.infer<typeof planSchema>;

export const plansResponseSchema = z.object({
  provider: z.string(),
  plans: z.array(planSchema).default([]),
});
export type PlansResponse = z.infer<typeof plansResponseSchema>;

export const checkoutResponseSchema = z.object({
  provider: z.string(),
  session_id: z.string(),
  checkout_url: z.string(),
  plan: z.string(),
  mailbox_key: z.string(),
});
export type CheckoutResponse = z.infer<typeof checkoutResponseSchema>;

export const portalResponseSchema = z.object({
  portal_url: z.string(),
});
export type PortalResponse = z.infer<typeof portalResponseSchema>;

// ── SSE stream (named events: `delivery`, `status`, `notice`) ──────────────────
//
// Each event's data JSON carries a `type` tag matching its event name.
// Content-free, like everything else. (live.rs LiveEvent)

export const noticeKindSchema = z.enum(['trial_ending', 'watch_paused']);
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
