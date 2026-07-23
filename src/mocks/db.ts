import type {
  AccountMailbox,
  AccountView,
  AuthResult,
  CheckoutResponse,
  Delivery,
  DeliveryEvent,
  Me,
  TestVerdict,
  WatchView,
} from "@/api/schemas";

// In-browser mock backend, faithful to carillon-backend's OpenAPI wire shapes
// (snake_case, unix seconds). Billing model: per-service credit pool, 1 credit =
// one month watching one service, refilled in packs of 5.

export const DEMO_LINK = "demo-cap-2f9a8c1e";

const DAY = 86_400;
const MONTH = 30 * DAY;
const PACK_SIZE = 5;
const FREE_CREDITS = 1;

interface MockWatch extends WatchView {
  hmac_secret: string;
  account_id: string;
  /** Unix seconds watching is paid up to; null = never activated. */
  watching_until: number | null;
  auto_renew: boolean;
}

interface Membership {
  mailbox_key: string;
  login: string;
  imap_host: string;
}

interface MockAccount {
  id: string;
  link: string | null;
  email: string | null;
  credits: number;
  free_credited: boolean;
  memberships: Membership[];
}

let deliverySeq = 1000;
const nowSecs = () => Math.floor(Date.now() / 1000);
const randHex = (n = 16) =>
  Array.from({ length: n }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join("");

// Watches and deliveries are global (as the server keeps them); accounts are
// keyed by capability link. Magic-link tokens map to the email they prove.
const accounts = new Map<string, MockAccount>();
const watches: MockWatch[] = [];
const deliveries: Delivery[] = [];
const magicTokens = new Map<string, string>();
// Sybil barrier: mailbox_keys whose one free credit has already been claimed.
const freeCreditClaims = new Set<string>();

// Server normalises (login, host); we key on login, opaque to the UI either way.
const mailboxKey = (login: string) => login.toLowerCase();

function newAccount(
  id: string,
  link: string | null,
  email: string | null = null,
): MockAccount {
  return { id, link, email, credits: 0, free_credited: false, memberships: [] };
}

/** Grant the one free credit only if the account isn't yet credited AND this
 *  mailbox_key is unclaimed. Mirrors the server's `claim_free_credit`. */
function claimFreeCredit(
  account: MockAccount,
  mailboxKey: string,
): "granted" | "already_credited" | "already_claimed" {
  if (account.free_credited) return "already_credited";
  if (freeCreditClaims.has(mailboxKey)) return "already_claimed";
  freeCreditClaims.add(mailboxKey);
  account.credits += FREE_CREDITS;
  account.free_credited = true;
  return "granted";
}

function seed() {
  // Demo account: small pool and services in the states worth showing (healthy,
  // ending-soon with auto-renew, and not-yet-activated).
  const demo = newAccount("acct_demo", DEMO_LINK, "demo@fastmail.com");
  demo.credits = 6;
  demo.free_credited = true;
  demo.memberships = [
    {
      mailbox_key: mailboxKey("demo@fastmail.com"),
      login: "demo@fastmail.com",
      imap_host: "imap.fastmail.com",
    },
    {
      mailbox_key: mailboxKey("demo@posteo.net"),
      login: "demo@posteo.net",
      imap_host: "posteo.de",
    },
    {
      mailbox_key: mailboxKey("demo@gmail.com"),
      login: "demo@gmail.com",
      imap_host: "imap.gmail.com",
    },
  ];
  accounts.set(DEMO_LINK, demo);
  demo.memberships.forEach((m) => freeCreditClaims.add(m.mailbox_key));

  watches.push(
    mkWatch(
      "wch_fastmail",
      "demo@fastmail.com",
      "imap.fastmail.com",
      "INBOX",
      "https://hooks.example.com/carillon/fastmail",
      true,
      demo.id,
      nowSecs() + 20 * DAY,
      false,
    ),
    // Second service on the same PIM account (different folder): multi-service.
    mkWatch(
      "wch_fastmail_archive",
      "demo@fastmail.com",
      "imap.fastmail.com",
      "Archive",
      "https://hooks.example.com/carillon/fastmail-archive",
      true,
      demo.id,
      null,
      false,
    ),
    mkWatch(
      "wch_posteo",
      "demo@posteo.net",
      "posteo.de",
      "INBOX",
      "https://hooks.example.com/carillon/posteo",
      true,
      demo.id,
      nowSecs() + 2 * DAY,
      true,
    ),
    mkWatch(
      "wch_gmail",
      "demo@gmail.com",
      "imap.gmail.com",
      "INBOX",
      "https://hooks.example.com/carillon/gmail",
      true,
      demo.id,
      null,
      false,
    ),
  );

  const events: DeliveryEvent[] = [
    "new",
    "flags_added",
    "flags_removed",
    "removed",
  ];
  for (let i = 0; i < 24; i += 1) {
    const watch = watches[i % 2];
    const ok = i % 7 !== 0;
    deliveries.push({
      account: watch.id,
      event: events[i % events.length],
      uid: 41200 + i * 3,
      ok,
      status: ok ? 200 : 502,
      error: ok ? null : "connection refused",
      attempts: ok ? 1 : 3,
      at: nowSecs() - (i * 900 + 120),
    });
  }
  deliveries.sort((a, b) => b.at - a.at);
}

function mkWatch(
  id: string,
  login: string,
  imap_host: string,
  mailbox: string,
  notify_url: string,
  active: boolean,
  account_id: string,
  watching_until: number | null,
  auto_renew: boolean,
): MockWatch {
  return {
    id,
    source_kind: "imap",
    imap_host,
    imap_port: 993,
    login,
    provider: providerOf(imap_host),
    mailbox,
    notify_url,
    active,
    hmac_secret: `whsec_${randHex(24)}`,
    account_id,
    watching_until,
    auto_renew,
  };
}

/** Registrable domain (last two labels), mirroring the server's provider. */
function providerOf(host: string): string {
  const labels = host.toLowerCase().split(".").filter(Boolean);
  return labels.length >= 2 ? labels.slice(-2).join(".") : host;
}

/** Resolve an account by link, auto-provisioning empty ones so any stored link
 *  keeps working across reloads. */
function resolve(link: string): MockAccount {
  let account = accounts.get(link);
  if (!account) {
    account = newAccount(`acct_${link.slice(-6)}`, link);
    accounts.set(link, account);
  }
  return account;
}

function byId(id: string): MockAccount | undefined {
  for (const account of accounts.values())
    if (account.id === id) return account;
  return undefined;
}

function byEmail(email: string): MockAccount | undefined {
  for (const account of accounts.values())
    if (account.email === email) return account;
  return undefined;
}

function toWatchView(w: MockWatch): WatchView {
  const {
    hmac_secret: _s,
    account_id: _a,
    watching_until: _u,
    auto_renew: _r,
    ...view
  } = w;
  return view;
}

function accountView(account: MockAccount): AccountView {
  const now = nowSecs();
  const covered = new Set<string>();
  const mailboxes: AccountMailbox[] = [];
  for (const w of watches.filter((w) => w.account_id === account.id)) {
    const key = mailboxKey(w.login);
    covered.add(key);
    mailboxes.push({
      mailbox_key: key,
      watch_id: w.id,
      mailbox: w.mailbox,
      watching_until: w.watching_until,
      watching: w.watching_until !== null && now < w.watching_until,
      auto_renew: w.auto_renew,
    });
  }
  for (const m of account.memberships) {
    if (!covered.has(m.mailbox_key)) {
      mailboxes.push({
        mailbox_key: m.mailbox_key,
        watch_id: null,
        mailbox: null,
        watching_until: null,
        watching: false,
        auto_renew: false,
      });
    }
  }
  return {
    id: account.id,
    email: account.email,
    credits: account.credits,
    mailboxes,
  };
}

seed();

export const mockDb = {
  me(link: string): Me {
    const account = resolve(link);
    return {
      account_id: account.id,
      mailboxes: account.memberships.map((m) => ({
        mailbox_key: m.mailbox_key,
        protocol: "imap" as const,
        login: m.login,
        imap_host: m.imap_host,
        imap_port: 993,
        base_url: null,
      })),
      watches: watches
        .filter((w) => w.account_id === account.id)
        .map(toWatchView),
      balance: accountView(account),
      metered: true,
      carddav_poll_secs: 300,
    };
  },

  allWatches(): WatchView[] {
    return watches.map(toWatchView);
  },

  createWatch(body: {
    id: string;
    source_kind?: "imap" | "carddav";
    imap_host: string;
    imap_port?: number;
    login: string;
    mailbox?: string;
    notify_url: string;
    hmac_secret: string;
    account_id?: string;
    active?: boolean;
    carddav_url?: string;
  }): { status: string; id: string; free_trial?: boolean } | "duplicate" {
    const account_id = body.account_id ?? body.id;
    const mailbox = body.mailbox ?? "INBOX";
    // Dedup by (account, login, target): target is the CardDAV collection URL
    // else the mailbox. Different accounts may watch the same target (server 409).
    const target = body.carddav_url ?? mailbox;
    const clash = watches.some(
      (w) =>
        w.account_id === account_id &&
        w.login.toLowerCase() === body.login.toLowerCase() &&
        (w.carddav_url ?? w.mailbox) === target,
    );
    if (clash) return "duplicate";
    // Free-trial head start: a new service auto-watches for a week, no credit
    // spent. The server gates this once per mailbox; the mock always grants it.
    const trialUntil = nowSecs() + 7 * 86_400;
    const watch: MockWatch = {
      id: body.id,
      source_kind: body.source_kind ?? "imap",
      imap_host: body.imap_host,
      imap_port: body.imap_port ?? 993,
      login: body.login,
      provider: providerOf(body.imap_host),
      mailbox,
      notify_url: body.notify_url,
      active: body.active ?? true,
      carddav_url: body.carddav_url,
      hmac_secret: body.hmac_secret,
      account_id,
      watching_until: trialUntil,
      auto_renew: false,
    };
    watches.unshift(watch);
    byId(account_id) ?? resolve(`orphan-${account_id}`);
    return { status: "ok", id: watch.id, free_trial: true };
  },

  setActive(id: string, active: boolean): boolean {
    const watch = watches.find((w) => w.id === id);
    if (!watch) return false;
    watch.active = active;
    return true;
  },

  deleteWatch(id: string): boolean {
    const i = watches.findIndex((w) => w.id === id);
    if (i < 0) return false;
    watches.splice(i, 1);
    return true;
  },

  rotateSecret(
    id: string,
  ): { status: string; secret: string; prev_expires_at: number } | null {
    const watch = watches.find((w) => w.id === id);
    if (!watch) return null;
    const secret = `whsec_${randHex(24)}`;
    watch.hmac_secret = secret;
    return { status: "ok", secret, prev_expires_at: nowSecs() + DAY };
  },

  /** POST /watches/{id}/activate — spend `credits` months (all-or-nothing),
   *  stacking onto remaining time. */
  activate(
    id: string,
    credits = 1,
  ):
    | { status: "ok"; id: string; watching_until: number; credits: number }
    | "gone"
    | "no_credits" {
    const n = Math.max(1, Math.floor(credits));
    const watch = watches.find((w) => w.id === id);
    if (!watch) return "gone";
    const account = byId(watch.account_id);
    if (!account || account.credits < n) return "no_credits";
    account.credits -= n;
    const now = nowSecs();
    const base =
      watch.watching_until && watch.watching_until > now
        ? watch.watching_until
        : now;
    watch.watching_until = base + n * MONTH;
    return {
      status: "ok",
      id,
      watching_until: watch.watching_until,
      credits: account.credits,
    };
  },

  setAutoRenew(id: string, enabled: boolean): boolean {
    const watch = watches.find((w) => w.id === id);
    if (!watch) return false;
    watch.auto_renew = enabled;
    return true;
  },

  deliveries(watchId: string | undefined, limit: number): Delivery[] {
    let items = deliveries;
    if (watchId) items = items.filter((d) => d.account === watchId);
    return items.slice(0, limit);
  },

  /** Append a synthetic delivery (used by the SSE mock generator). */
  pushDelivery(watchId: string, event: DeliveryEvent): Delivery {
    const ok = Math.random() > 0.12;
    const delivery: Delivery = {
      account: watchId,
      event,
      uid: 41000 + (deliverySeq++ % 5000),
      ok,
      status: ok ? 200 : 502,
      error: ok ? null : "connection refused",
      attempts: ok ? 1 : 3,
      at: nowSecs(),
    };
    deliveries.unshift(delivery);
    return delivery;
  },

  activeWatchIds(): string[] {
    return watches.filter((w) => w.active).map((w) => w.id);
  },

  accountsList(): AccountView[] {
    return [...accounts.values()].map(accountView);
  },

  getAccount(id: string): AccountView | null {
    const account = byId(id);
    return account ? accountView(account) : null;
  },

  /** POST /billing/checkout — buy `packs` packs. A real provider redirects to
   *  Stripe; the mock credits the pool immediately. */
  checkout(link: string, packs: number): CheckoutResponse {
    const account = resolve(link);
    const credits = packs * PACK_SIZE;
    account.credits += credits;
    return {
      provider: "mock",
      session_id: randHex(12),
      checkout_url: `${location.origin}/billing?checkout=success`,
      packs,
      credits,
    };
  },

  signout(link: string): boolean {
    return accounts.delete(link);
  },

  magicRequest(email: string): string {
    const token = `magic-${randHex(20)}`;
    magicTokens.set(token, email.toLowerCase());
    // No email is sent in the mock; log the verify URL for dev sign-in.
    // eslint-disable-next-line no-console
    console.info(`[mock] magic link: ${location.origin}/verify?token=${token}`);
    return token;
  },

  magicVerify(token: string): { account_id: string; link: string } | null {
    const email = magicTokens.get(token);
    if (!email) return null;
    magicTokens.delete(token);
    let account = byEmail(email);
    if (!account) {
      const link = `cap-${randHex(20)}`;
      account = newAccount(`acct_${randHex(6)}`, link, email);
      accounts.set(link, account);
    }
    return { account_id: account.id, link: account.link! };
  },
};

export function mockTestConnect(body: {
  login: string;
  password?: string;
  imap_host?: string;
}): TestVerdict {
  // Deterministic failure modes: password "wrong" fails auth; host/login
  // containing "nocaps" means the server lacks IDLE/QRESYNC.
  const authenticated = body.password !== "wrong";
  const caps = !`${body.imap_host ?? ""}${body.login}`.includes("nocaps");
  const missing: string[] = [];
  if (authenticated && !caps) missing.push("IDLE", "QRESYNC");
  return {
    ok: authenticated && caps,
    reachable: true,
    authenticated,
    idle: authenticated && caps,
    qresync: authenticated && caps,
    condstore: authenticated && caps,
    sync: false,
    missing,
    error: !authenticated
      ? "authentication failed"
      : !caps
        ? "server does not advertise IDLE/QRESYNC"
        : null,
  };
}

/** POST /mailboxes — a plausible folder list for the onboarding picker. */
export function mockListMailboxes(): {
  mailboxes: { name: string; role: string | null }[];
} {
  return {
    mailboxes: [
      { name: "INBOX", role: "inbox" },
      { name: "Sent", role: "sent" },
      { name: "Drafts", role: "drafts" },
      { name: "Archive", role: "archive" },
      { name: "Junk", role: "junk" },
      { name: "Trash", role: "trash" },
    ],
  };
}

/** POST /webhook/test — pretend the endpoint acked. */
export function mockTestWebhook(): {
  ok: boolean;
  status: number | null;
  error: string | null;
} {
  return { ok: true, status: 200, error: null };
}

/** POST /auth — mint/recover/join a capability link. (D§5) */
export function mockAuthenticate(body: {
  login: string;
  password?: string;
  imap_host: string;
  imap_port?: number;
  existingLink?: string | null;
}): AuthResult {
  const verdict = mockTestConnect(body);
  const key = mailboxKey(body.login);

  let account: MockAccount;
  let action: AuthResult["action"];
  let link: string;

  if (body.existingLink && accounts.has(body.existingLink)) {
    account = accounts.get(body.existingLink)!;
    link = body.existingLink;
    action = "joined";
  } else {
    const existing = [...accounts.values()].find((a) =>
      a.memberships.some((m) => m.mailbox_key === key),
    );
    if (existing) {
      account = existing;
      link = `cap-${randHex(20)}`;
      account.link = link;
      accounts.delete(
        [...accounts.entries()].find(([, a]) => a === existing)?.[0] ?? "",
      );
      accounts.set(link, account);
      action = "recovered";
    } else {
      link = `cap-${randHex(20)}`;
      account = newAccount(`acct_${randHex(6)}`, link);
      accounts.set(link, account);
      action = "created";
    }
  }

  if (!account.memberships.some((m) => m.mailbox_key === key)) {
    account.memberships.push({
      mailbox_key: key,
      login: body.login,
      imap_host: body.imap_host,
    });
  }
  // First Carillon account to validate this mailbox earns its free credit.
  const free_credit = claimFreeCredit(account, key);

  return {
    account_id: account.id,
    action,
    link,
    watchable: verdict.ok,
    idle: verdict.idle,
    qresync: verdict.qresync,
    free_credit,
  };
}
