import type {
  AccountView,
  AuthResult,
  CheckoutResponse,
  Delivery,
  DeliveryEvent,
  Me,
  PacksResponse,
  TestVerdict,
  WatchView,
} from '@/api/schemas';

// In-browser mock backend, faithful to carillon-server's OpenAPI wire shapes
// (snake_case, unix seconds, watch-time seconds). It stands in when there's no
// real server to point at; the real testing path is VITE_API_BASE_URL +
// VITE_ENABLE_MOCKS=false. Dev-only — lazily imported. (PLAN §7)

export const DEMO_LINK = 'demo-cap-2f9a8c1e';

const DAY = 86_400;
const TRIAL_SECS = 7 * DAY;
const POOL_TTL = 330 * DAY;

const PACKS = [
  { id: 'week', secs: 7 * DAY },
  { id: 'quarter', secs: 90 * DAY },
  { id: 'year', secs: 365 * DAY },
];

interface MockWatch extends WatchView {
  hmac_secret: string;
  account_id: string;
}

interface Membership {
  mailbox_key: string;
  login: string;
  imap_host: string;
}

interface MockAccount {
  id: string;
  link: string | null;
  paid_secs: number;
  paid_expires: number | null;
  auto_refill: boolean;
  auto_refill_threshold: number;
  auto_refill_amount: number;
  memberships: Membership[];
  /** mailbox_key → remaining trial seconds. */
  trials: Map<string, number>;
}

let watchSeq = 100;
let deliverySeq = 1000;
const nowSecs = () => Math.floor(Date.now() / 1000);
const randHex = (n = 16) =>
  Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join('');

// The mock keeps watches and deliveries global (as the server does), plus a map
// of accounts keyed by capability link.
const accounts = new Map<string, MockAccount>();
const watches: MockWatch[] = [];
const deliveries: Delivery[] = [];

/** mailbox_key: the server normalises (login, host); we use the login for a
 *  readable label — the field is opaque to the UI either way. */
const mailboxKey = (login: string) => login.toLowerCase();

function seed() {
  const demo: MockAccount = {
    id: 'acct_demo',
    link: DEMO_LINK,
    paid_secs: 940_000,
    paid_expires: nowSecs() + POOL_TTL,
    auto_refill: false,
    auto_refill_threshold: DAY,
    auto_refill_amount: 7 * DAY,
    memberships: [
      { mailbox_key: mailboxKey('demo@fastmail.com'), login: 'demo@fastmail.com', imap_host: 'imap.fastmail.com' },
      { mailbox_key: mailboxKey('demo@posteo.net'), login: 'demo@posteo.net', imap_host: 'posteo.de' },
    ],
    trials: new Map([
      [mailboxKey('demo@fastmail.com'), 190_000],
      [mailboxKey('demo@posteo.net'), TRIAL_SECS],
    ]),
  };
  accounts.set(DEMO_LINK, demo);

  watches.push(
    mkWatch('wch_inbox', 'demo@fastmail.com', 'imap.fastmail.com', 'INBOX', 'https://hooks.example.com/carillon/inbox', true, demo.id),
    mkWatch('wch_archive', 'demo@fastmail.com', 'imap.fastmail.com', 'Archive', 'https://hooks.example.com/carillon/archive', true, demo.id),
    mkWatch('wch_posteo', 'demo@posteo.net', 'posteo.de', 'INBOX', 'https://hooks.example.com/carillon/posteo', false, demo.id),
  );

  const events: DeliveryEvent[] = ['new', 'flags_added', 'flags_removed', 'removed'];
  for (let i = 0; i < 24; i += 1) {
    const watch = watches[i % 2];
    const ok = i % 7 !== 0;
    deliveries.push({
      account: watch.id,
      event: events[i % events.length],
      uid: 41200 + i * 3,
      ok,
      status: ok ? 200 : 502,
      error: ok ? null : 'connection refused',
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
): MockWatch {
  return {
    id,
    imap_host,
    imap_port: 993,
    login,
    mailbox,
    notify_url,
    active,
    hmac_secret: `whsec_${randHex(24)}`,
    account_id,
  };
}

/** Resolve an account by link, auto-provisioning empty ones so any stored link
 *  keeps working across reloads. */
function resolve(link: string): MockAccount {
  let account = accounts.get(link);
  if (!account) {
    account = {
      id: `acct_${link.slice(-6)}`,
      link,
      paid_secs: 0,
      paid_expires: null,
      auto_refill: false,
      auto_refill_threshold: DAY,
      auto_refill_amount: 7 * DAY,
      memberships: [],
      trials: new Map(),
    };
    accounts.set(link, account);
  }
  return account;
}

function byId(id: string): MockAccount | undefined {
  for (const account of accounts.values()) if (account.id === id) return account;
  return undefined;
}

function toWatchView(w: MockWatch): WatchView {
  const { hmac_secret: _s, account_id: _a, ...view } = w;
  return view;
}

function accountView(account: MockAccount): AccountView {
  const expired = account.paid_expires !== null && nowSecs() >= account.paid_expires;
  const pool = expired ? 0 : account.paid_secs;

  const keyed = new Map<string, string | null>();
  for (const m of account.memberships) if (!keyed.has(m.mailbox_key)) keyed.set(m.mailbox_key, null);
  for (const w of watches.filter((w) => w.account_id === account.id)) {
    keyed.set(mailboxKey(w.login), w.id);
  }

  let trialsTotal = 0;
  const mailboxes = [...keyed.entries()].map(([mailbox_key, watch_id]) => {
    const trial = account.trials.get(mailbox_key) ?? 0;
    trialsTotal += trial;
    return { watch_id, mailbox_key, trial_secs: trial };
  });

  return {
    id: account.id,
    paid_secs: account.paid_secs,
    paid_expires: account.paid_expires,
    pool_expired: expired,
    auto_refill: account.auto_refill,
    auto_refill_threshold: account.auto_refill_threshold,
    auto_refill_amount: account.auto_refill_amount,
    mailboxes,
    total_available_secs: pool + trialsTotal,
  };
}

seed();

// ── Public mock API (consumed by handlers.ts / events.ts) ─────────────────────

export const mockDb = {
  me(link: string): Me {
    const account = resolve(link);
    return {
      account_id: account.id,
      mailboxes: account.memberships.map((m) => ({
        mailbox_key: m.mailbox_key,
        login: m.login,
        imap_host: m.imap_host,
      })),
      watches: watches.filter((w) => w.account_id === account.id).map(toWatchView),
      balance: accountView(account),
    };
  },

  allWatches(): WatchView[] {
    return watches.map(toWatchView);
  },

  createWatch(body: {
    id: string;
    imap_host: string;
    imap_port?: number;
    login: string;
    mailbox?: string;
    notify_url: string;
    hmac_secret: string;
    account_id?: string;
    active?: boolean;
  }): { status: string; id: string } {
    const account_id = body.account_id ?? body.id;
    const watch: MockWatch = {
      id: body.id,
      imap_host: body.imap_host,
      imap_port: body.imap_port ?? 993,
      login: body.login,
      mailbox: body.mailbox ?? 'INBOX',
      notify_url: body.notify_url,
      active: body.active ?? true,
      hmac_secret: body.hmac_secret,
      account_id,
    };
    watches.unshift(watch);
    // Ensure the billing account exists and grant the mailbox its trial.
    const account = byId(account_id) ?? resolve(`orphan-${account_id}`);
    if (!account.trials.has(mailboxKey(body.login))) {
      account.trials.set(mailboxKey(body.login), TRIAL_SECS);
    }
    return { status: 'ok', id: watch.id };
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

  rotateSecret(id: string): { status: string; secret: string; prev_expires_at: number } | null {
    const watch = watches.find((w) => w.id === id);
    if (!watch) return null;
    const secret = `whsec_${randHex(24)}`;
    watch.hmac_secret = secret;
    return { status: 'ok', secret, prev_expires_at: nowSecs() + DAY };
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
      uid: 41000 + Math.floor(Math.random() * 5000),
      ok,
      status: ok ? 200 : 502,
      error: ok ? null : 'connection refused',
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

  addCredit(id: string, secs: number, ttl?: number): AccountView | null {
    const account = byId(id);
    if (!account) return null;
    account.paid_secs += secs;
    account.paid_expires = nowSecs() + (ttl ?? POOL_TTL);
    return accountView(account);
  },

  setAutoRefill(id: string, patch: { enabled: boolean; threshold_secs?: number; amount_secs?: number }): boolean {
    const account = byId(id);
    if (!account) return false;
    account.auto_refill = patch.enabled;
    if (patch.threshold_secs !== undefined) account.auto_refill_threshold = patch.threshold_secs;
    if (patch.amount_secs !== undefined) account.auto_refill_amount = patch.amount_secs;
    return true;
  },

  packs(): PacksResponse {
    return { provider: 'mock', packs: PACKS };
  },

  checkout(link: string, packId: string): CheckoutResponse | null {
    const pack = PACKS.find((p) => p.id === packId);
    if (!pack) return null;
    // A real provider redirects; the mock settles immediately.
    const account = resolve(link);
    account.paid_secs += pack.secs;
    account.paid_expires = nowSecs() + POOL_TTL;
    return {
      provider: 'mock',
      session_id: randHex(12),
      checkout_url: `${location.origin}/#/billing?topup=ok`,
      pack: pack.id,
      secs: pack.secs,
    };
  },

  signout(link: string): boolean {
    return accounts.delete(link);
  },
};

// ── Onboarding: test-connect + capability-link issuance ───────────────────────

export function mockTestConnect(body: {
  login: string;
  password?: string;
  imap_host?: string;
}): TestVerdict {
  // Deterministic by input so each failure mode is demoable:
  //   password "wrong"          → auth fails
  //   host/login contains "nocaps" → server lacks IDLE/QRESYNC
  const authenticated = body.password !== 'wrong';
  const caps = !`${body.imap_host ?? ''}${body.login}`.includes('nocaps');
  const missing: string[] = [];
  if (authenticated && !caps) missing.push('IDLE', 'QRESYNC');
  return {
    ok: authenticated && caps,
    reachable: true,
    authenticated,
    idle: authenticated && caps,
    qresync: authenticated && caps,
    condstore: authenticated && caps,
    missing,
    error: !authenticated
      ? 'authentication failed'
      : !caps
        ? 'server does not advertise IDLE/QRESYNC'
        : null,
  };
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
  let action: AuthResult['action'];
  let link: string;

  if (body.existingLink && accounts.has(body.existingLink)) {
    account = accounts.get(body.existingLink)!;
    link = body.existingLink;
    action = 'joined';
  } else {
    const existing = [...accounts.values()].find((a) => a.memberships.some((m) => m.mailbox_key === key));
    if (existing) {
      account = existing;
      link = `cap-${randHex(20)}`;
      account.link = link;
      accounts.delete([...accounts.entries()].find(([, a]) => a === existing)?.[0] ?? '');
      accounts.set(link, account);
      action = 'recovered';
    } else {
      link = `cap-${randHex(20)}`;
      account = {
        id: `acct_${randHex(6)}`,
        link,
        paid_secs: 0,
        paid_expires: null,
        auto_refill: false,
        auto_refill_threshold: DAY,
        auto_refill_amount: 7 * DAY,
        memberships: [],
        trials: new Map(),
      };
      accounts.set(link, account);
      action = 'created';
    }
  }

  if (!account.memberships.some((m) => m.mailbox_key === key)) {
    account.memberships.push({ mailbox_key: key, login: body.login, imap_host: body.imap_host });
  }
  if (!account.trials.has(key)) account.trials.set(key, TRIAL_SECS);

  return {
    account_id: account.id,
    action,
    link,
    watchable: verdict.ok,
    idle: verdict.idle,
    qresync: verdict.qresync,
  };
}
