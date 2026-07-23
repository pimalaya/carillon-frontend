import { z } from "zod";

// Typed API boundary — mirrors carillon-backend's OpenAPI contract
// (carillon-backend/docs/openapi.yaml) field-for-field. Wire fields are
// snake_case; timestamps are unix seconds. Kept snake_case on purpose so
// there's no lossy transform between the wire and the UI — what the server
// sends is what we render.
//
// Invariant: nothing here carries message content. Events are {account, event,
// uid} only — no sender, subject, or body. (DECISIONS §1, §4)

/**
 * Free-credit outcome when the account earns its welcome credit (its first
 * service, § SERVICE_MODEL v3): the credit was `granted`, the account had
 * `already_credited` used its one credit, or this mailbox's credit was
 * `already_claimed` by another Carillon account (the sybil barrier — the mailbox
 * can still be watched, just without a free credit).
 */
export const freeCreditSchema = z.enum([
  "granted",
  "already_credited",
  "already_claimed",
]);
export type FreeCredit = z.infer<typeof freeCreditSchema>;

// ── Watches ───────────────────────────────────────────────────────────────────

/** A watch's REST view — never the password or HMAC secret. (WatchView) */
export const watchViewSchema = z.object({
  id: z.string(),
  /** Source protocol: `imap` (a mailbox, held IDLE) or `carddav` (a polled
   *  addressbook). Defaults to `imap` for older servers. */
  source_kind: z.enum(["imap", "carddav"]).default("imap"),
  imap_host: z.string(),
  imap_port: z.number(),
  login: z.string(),
  /** Provider domain (registrable domain of the server host, e.g. `fastmail.com`)
   *  — the label the UI groups + names services by. */
  provider: z.string().default(""),
  mailbox: z.string(),
  notify_url: z.string(),
  active: z.boolean(),
  /** CardDAV collection URL; absent for IMAP. */
  carddav_url: z.string().optional(),
});
export type WatchView = z.infer<typeof watchViewSchema>;

/**
 * Live connection state, delivered over SSE `status` events (not the REST
 * view, which only exposes `active`). (live.rs WatchState)
 */
export const watchStateSchema = z.enum([
  "watching",
  "reconnecting",
  "error",
  "stopped",
]);
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
  /** `imap` (default) or `carddav`. For `carddav`, `imap_host`/`login` carry
   *  the PIM-account identity and `carddav_url` is the polled collection. */
  source_kind?: "imap" | "carddav";
  imap_host: string;
  imap_port: number;
  login: string;
  /** Omitted for an OAuth watch — the server uses the mailbox's stored OAuth
   *  credential (proved via /oauth/callback) instead. */
  password?: string;
  /** IMAP folder, or a display name for a CardDAV addressbook. */
  mailbox: string;
  notify_url: string;
  hmac_secret: string;
  account_id?: string;
  active?: boolean;
  /** CardDAV collection URL (required when `source_kind` is `carddav`). */
  carddav_url?: string;
}

export const createWatchResultSchema = z.object({
  status: z.string(),
  id: z.string(),
  /** Whether a free-trial head start was granted to this service (§ v3): the
   *  account's first service on a provider auto-watches free for a week. */
  free_trial: z.boolean().optional(),
  /** The provider domain the service was grouped/trial-gated under (e.g.
   *  `fastmail.com` — the registrable domain of the server host). */
  provider: z.string().optional(),
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
  kind: z.enum(["password", "bearer", "oauth", "oauth_device", "oauth_issuer"]),
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
  security: z.enum(["tls", "starttls", "plain"]),
  auth: authMethodSchema,
});
export type ImapChoice = z.infer<typeof imapChoiceSchema>;

/** One contacts (CardDAV) onboarding choice — a discovered context-root URL +
 *  how to authenticate. No host/port (CardDAV is HTTP). (CardDavChoice) */
export const cardDavChoiceSchema = z.object({
  url: z.string(),
  auth: authMethodSchema,
});
export type CardDavChoice = z.infer<typeof cardDavChoiceSchema>;

export const contactsDiscoverResponseSchema = z.object({
  input: z.string(),
  kind: z.string().optional(),
  choices: z.array(cardDavChoiceSchema).default([]),
});
export type ContactsDiscoverResponse = z.infer<
  typeof contactsDiscoverResponseSchema
>;

export const discoverResponseSchema = z.object({
  input: z.string(),
  choices: z.array(imapChoiceSchema).default([]),
});
export type DiscoverResponse = z.infer<typeof discoverResponseSchema>;

// ── Test / onboarding ─────────────────────────────────────────────────────────

export interface TestRequest {
  source_kind?: "imap" | "carddav";
  imap_host: string;
  imap_port: number;
  login: string;
  password: string;
  mailbox: string;
  /** CardDAV collection URL (required when `source_kind` is `carddav`). */
  carddav_url?: string;
}

/**
 * Verdict from POST /test. `ok` is the green light: for IMAP, reachable AND
 * authenticated AND idle; for CardDAV, reachable AND authenticated AND sync.
 * (TestVerdict)
 */
export const testVerdictSchema = z.object({
  ok: z.boolean(),
  reachable: z.boolean(),
  authenticated: z.boolean(),
  idle: z.boolean(),
  qresync: z.boolean(),
  condstore: z.boolean(),
  /** CardDAV: the collection reports a change token (sync-token/ctag). */
  sync: z.boolean().default(false),
  missing: z.array(z.string()).default([]),
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

/** One addressbook collection a CardDAV service can watch (POST /addressbooks). */
export const addressbookEntrySchema = z.object({
  name: z.string(),
  url: z.string(),
});
export type AddressbookEntry = z.infer<typeof addressbookEntrySchema>;

export const addressbooksResponseSchema = z.object({
  addressbooks: z.array(addressbookEntrySchema).default([]),
});
export type AddressbooksResponse = z.infer<typeof addressbooksResponseSchema>;

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
  /** `imap` (default) or `carddav`. Selects how the credential is validated
   *  (IMAP LOGIN vs a CardDAV PROPFIND) and the PIM account's protocol. */
  protocol?: "imap" | "carddav";
  imap_host: string;
  imap_port: number;
  login: string;
  password: string;
  mailbox: string;
  /** CardDAV context-root URL (required when `protocol` is `carddav`). */
  carddav_url?: string;
}

/**
 * Result of POST /auth. First auth `created` an account, a re-auth `recovered`
 * (re-minted) its link, an auth carrying a valid link `joined` the mailbox to
 * that account. `link` is the capability bearer — store it. (AuthResult)
 */
export const authResultSchema = z.object({
  account_id: z.string(),
  action: z.enum(["created", "recovered", "joined"]),
  link: z.string(),
  protocol: z.string().optional(),
  watchable: z.boolean(),
  idle: z.boolean(),
  qresync: z.boolean(),
  free_credit: freeCreditSchema.optional(),
});
export type AuthResult = z.infer<typeof authResultSchema>;

// ── Account & credit pool (per-service, § BILLING_MODEL) ──────────────────────

/** Credits per pack — the only refill unit. Mirrors billing.rs PACK_SIZE. */
export const PACK_SIZE = 4;

/** Per-credit price in EUR, for display only. The real charge is the Stripe
 *  Price object; this just labels the UI (1 credit = one service-month). */
export const CREDIT_PRICE_EUR = 2.5;

/** A service (or proven-but-unwatched mailbox) within an account view, with its
 *  per-service activation state. */
export const accountMailboxSchema = z.object({
  mailbox_key: z.string(),
  /** The service (watch) on this PIM account, or null (proven, no service yet). */
  watch_id: z.string().nullable(),
  /** The watched folder — distinguishes several services on one PIM account. */
  mailbox: z.string().nullable().optional(),
  /** Unix seconds watching is paid up to; null/past = not currently watching. */
  watching_until: z.number().nullable().optional(),
  /** Currently watching (a paid month in the future). */
  watching: z.boolean().default(false),
  /** Next credit drawn from the pool at expiry. */
  auto_renew: z.boolean().default(false),
});
export type AccountMailbox = z.infer<typeof accountMailboxSchema>;

/** Public view of a Carillon account: the prepaid credit pool and each service's
 *  activation state. 1 credit = one service-month. (AccountView) */
export const accountViewSchema = z.object({
  id: z.string(),
  /** Magic-link email identity, if any. */
  email: z.string().nullable().optional(),
  /** Fungible credit-pool balance. */
  credits: z.number().default(0),
  mailboxes: z.array(accountMailboxSchema).default([]),
});
export type AccountView = z.infer<typeof accountViewSchema>;

/** A proven PIM account (identity + protocol), as returned by /me. */
export const membershipSchema = z.object({
  mailbox_key: z.string(),
  /** Source protocol: `imap` or `carddav`. */
  protocol: z.enum(["imap", "carddav"]).default("imap"),
  login: z.string(),
  imap_host: z.string(),
  imap_port: z.number().default(993),
  /** CardDAV context-root URL (for listing addressbooks); absent for IMAP. */
  base_url: z.string().nullable().optional(),
});
export type Membership = z.infer<typeof membershipSchema>;

/** GET /me — the account behind the capability link. */
export const meSchema = z.object({
  account_id: z.string(),
  mailboxes: z.array(membershipSchema).default([]),
  watches: z.array(watchViewSchema).default([]),
  balance: accountViewSchema,
  /** Whether watching is credit-metered (SaaS); false on an unmetered self-host. */
  metered: z.boolean().default(true),
  /** Default CardDAV poll interval (seconds) — shown on a contacts service's
   *  capability panel. */
  carddav_poll_secs: z.number().default(300),
});
export type Me = z.infer<typeof meSchema>;

/**
 * Client-side shape of /me: the same data, but `watches` carry the live overlay
 * (liveState/lastEventAt) the SSE stream patches into the cache. This is what
 * the UI reads.
 */
export type MeData = Omit<Me, "watches"> & { watches: Watch[] };

// ── Deliveries ────────────────────────────────────────────────────────────────

export const deliveryEventSchema = z.enum([
  "new",
  "changed",
  "flags_added",
  "flags_removed",
  "removed",
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

// ── Billing (credit packs) ────────────────────────────────────────────────────

/** Result of POST /billing/checkout — a pending session + the provider checkout
 *  URL. The pool is credited on the verified webhook (mock settles immediately). */
export const checkoutResponseSchema = z.object({
  provider: z.string(),
  session_id: z.string(),
  checkout_url: z.string(),
  packs: z.number(),
  credits: z.number(),
});
export type CheckoutResponse = z.infer<typeof checkoutResponseSchema>;

/** Result of POST /watches/{id}/activate. */
export const activateResultSchema = z.object({
  status: z.string(),
  id: z.string(),
  watching_until: z.number(),
  credits: z.number(),
});
export type ActivateResult = z.infer<typeof activateResultSchema>;

// ── Magic-link sign-in ────────────────────────────────────────────────────────

/** Result of POST /auth/magic/verify — the account and its capability link. */
export const magicVerifyResultSchema = z.object({
  account_id: z.string(),
  link: z.string(),
});
export type MagicVerifyResult = z.infer<typeof magicVerifyResultSchema>;

// ── SSE stream (named events: `delivery`, `status`, `notice`) ──────────────────
//
// Each event's data JSON carries a `type` tag matching its event name.
// Content-free, like everything else. (live.rs LiveEvent)

export const noticeKindSchema = z.enum([
  "watch_ending",
  "watch_stopped",
  "low_pool",
]);
export type NoticeKind = z.infer<typeof noticeKindSchema>;

export const streamEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("delivery"),
    account: z.string(),
    event: deliveryEventSchema,
    uid: z.number(),
    ok: z.boolean(),
    status: z.number().nullable().optional(),
    attempts: z.number(),
    at: z.number(),
  }),
  z.object({
    type: z.literal("status"),
    account: z.string(),
    state: watchStateSchema,
    detail: z.string().nullable().optional(),
    at: z.number(),
  }),
  z.object({
    type: z.literal("notice"),
    account: z.string(),
    kind: noticeKindSchema,
    detail: z.string().nullable().optional(),
    at: z.number(),
  }),
]);
export type StreamEvent = z.infer<typeof streamEventSchema>;
