# carillon-frontend — build status

A running record of what's built, what's real, and what's left. Pairs with the
plan in [`PLAN.md`](PLAN.md) (milestones **U0–U6**) and the server design in
[`../../carillon-backend/docs/`](../../carillon-backend/docs).

## Current state — 2026-07-22 (supersedes the dated entries below)

Drives a **real carillon-backend** (Resend magic-link email + Stripe pack
checkout both verified live). `tsc` + `vite build` + 12 unit tests green.
Billing model = **prepaid credit pool + magic-link accounts** (the subscription
entry below was reverted; ignore it).

- **Two-level onboarding split.** *Add account* (`/onboarding`) = Identify +
  Authenticate only — stores the PIM-account credential + mints the capability
  link, then stops. *Add service* (`/services/new`) = folder pick + notify +
  verify, reusing the stored credential (empty-password `POST /mailboxes` /
  `/watches`). Onboarding requires a Carillon account first (magic-link only).
- **Accounts.** Top-right switcher = **Carillon accounts** (magic-link
  identities, localStorage, keyed by server `accountId`; "Add account" → magic
  link). PIM accounts live under one Carillon account; the dashboard has a
  per-PIM-account filter. Credit pool is per-Carillon-account.
- **Service lifecycle (metered).** Per row: **Active** switch (pause/resume
  webhook deliveries — server honors `active`) + **Auto-renew** switch, an
  **Activate/Extend** button opening a confirm-and-spend dialog (quantity picker
  → `POST /watches/{id}/activate {credits}`, all-or-nothing; empty pool → toast,
  no dialog), and an inline **trash** delete (the `⋯` menu is gone — row-click =
  detail). Activating a stopped service turns auto-renew on. Extend icon =
  Hourglass. Self-host (unmetered) keeps free pause/resume, no credits UI.
- **Free credit.** Client toasts the `POST /auth` `free_credit` outcome
  (granted 🎁 / already-claimed-by-another-account). Dedup is per-account.
- **Billing page** mirrors the dashboard grid (services wide left, credit card
  right). `components/ui/switch.tsx` is hand-written.
- **Gotcha fixed:** fire-once on-mount token exchanges (magic `/verify`,
  `/mailboxes`) must be a plain awaited `apiFetch` / `useQuery`, **not** a
  `useMutation` in an effect — the latter desyncs under React StrictMode
  (eternal spinner / empty list).
- **CardDAV services.** "Add service" now offers a service-type toggle —
  **Email folder (IMAP)** or **Addressbook (CardDAV)**. The CardDAV branch takes
  a collection URL + display name, has its own **Test** (`POST /test`
  `source_kind=carddav`, reusing the account's stored credential via the link),
  and creates a `source_kind=carddav` watch. The dashboard tags addressbook rows
  with an **Addressbook** chip. Schemas gained `source_kind` / `carddav_url` /
  `sync`; `useTestCardDav` added. (Server side: `carillon-backend/docs/CARDDAV.md`.)
- **i18n (react-i18next, en + fr).** `src/i18n/` (config + `locales/en.json` /
  `fr.json`), browser-language-detected, remembered in `localStorage`
  (`carillon.lang`), `<html lang>` synced. A header **language switcher**. Wired:
  the shell (sidebar/nav, account switcher, header), the four page headers, the
  services list, and the "Add service" wizard. Deeper onboarding wizard strings
  (Identify / Authenticate / Verify / Commit) and the billing/settings inner
  cards still hold English literals — extract into the same key structure as they
  come up.

Remaining: interactive OAuth e2e (real browser consent), production deploy
(host + CORS/public_url + live keys + Resend domain verification), and deferred
features (API keys, auto-recharge, CardDAV service type). `PLAN.md` is stale.

## Landed — 2026-07-21 · subscription billing (credits removed)

The watch-time credits model was replaced with a **single subscription** (server
§3a). Front-end fallout:

- **Schemas:** `AccountView` now carries subscription state (`subscribed`,
  `status`, `plan`, `current_period_end`, per-mailbox `trial_active` /
  `trial_expires`) instead of pool/trial-seconds; billing is `planSchema` +
  `checkoutResponse{plan}` + `portalResponse`; notices are `trial_ending` /
  `watch_paused`.
- **UI:** `BalanceCard` → **`SubscriptionCard`** (status + renew/trial date +
  Manage-via-portal / Subscribe); `CreditPacks` → **`PlanPicker`** (month/year,
  no quantity); `AutoRefill` and the Settings "add credit" helper are gone.
- **API hooks:** `useUnits`→`usePlans`, `useCheckout({plan})`, new `usePortal`;
  `api/account.ts` (credit/auto-refill) removed.
- **format.ts:** dropped `formatDuration`/`formatRunway`/`formatWatchTime`/
  `formatRunoutDate`; added `formatDate` + `daysUntil`.
- Typecheck + build + 12 tests green. (Also fixed the `vite.config.ts` vitest
  duplicate-`vite` typing so `tsc -b` is clean.)

## Landed — 2026-07-20 · aligned to the real server (OpenAPI)

carillon-backend landed M1–M7 with a full OpenAPI contract
([`openapi.yaml`](../../carillon-backend/docs/openapi.yaml)). The whole API
boundary was rewritten to match that contract field-for-field, so the dashboard
now **drives the real server** (mocks became the offline fallback). Point it with
`VITE_API_BASE_URL=http://127.0.0.1:3000` (mocks auto-off).

What changed from the first mock-shaped build:

- **Wire shapes:** snake_case fields, unix-seconds timestamps, watch-time as
  float seconds — no transform layer; the UI reads what the server sends.
- **No `/discovery`:** the onboarding "Identify" step collects IMAP host/port
  directly, with a client-side domain→host guess (no network).
- **`/test` verdict:** `reachable / authenticated / idle / qresync / condstore`
  (was `tls/auth/...`); `ok` is the green light.
- **Identity:** `/auth` → `{account_id, action, link, watchable}`; `/me` is the
  single scoped source for the account's watches + balance; `/signout` revokes.
- **Watches:** REST exposes `active` only; the live connection state
  (`watching/reconnecting/error/stopped`) arrives over the SSE `status` event and
  is overlaid onto the watch in the cache. The **client generates the watch `id`
  and `hmac_secret`** on create (so the secret is shown once); rotate reveals a
  fresh one.
- **Deliveries:** `{account(=watch id), event, uid, ok, status, error, attempts,
  at}`; filter param is `account`; the "failures" filter is client-side (the
  server has no such param).
- **Accounts/billing:** `AccountView` two counters; packs are `{id, secs}` (price
  is the provider's, shown at checkout); `/billing/checkout` → provider URL;
  credit via `/accounts/{id}/credit`; auto-refill via `/accounts/{id}/auto-refill`.
- **SSE:** named events (`delivery` / `status` / `notice`), consumed with
  `EventSource.addEventListener`; `notice`s toast + refetch the balance.
- **Testing affordance:** Settings has an "add credit" button (calls
  `/accounts/{id}/credit`) to exercise metering without a real payment. The
  header shows which API/base it's talking to.

## Earlier — 2026-07-20 · initial build against mocks

Scaffolded the whole SPA (U0), core libs, API layer, every screen (onboarding
wizard, dashboard, watch detail, deliveries, billing, settings, welcome), MSW
mocks + synthetic SSE, and `format`/`auth` unit tests. Milestones U0–U4.

### Design invariants honored

- Content-free: no screen renders sender/subject/body; events show `{event, uid}`.
- Login-less: capability link is the only credential; account switcher = a list
  of links; no login screen.
- Read-only: no send/APPEND/"test mail" action; verify waits for a real change.
- Two counters: per-mailbox trial before the refillable paid pool; both surfaced.

## Landed — 2026-07-20 · authenticated, scoped live stream

The server gained **route scoping + authed SSE** (carillon-backend M8), so the
admin's stream had to change: browsers' native `EventSource` can't send an
`Authorization` header, so `lib/sse.ts` now reads `GET /events` via an
**authenticated fetch stream** — Bearer capability link in the header, SSE
frames parsed by hand, reconnect with capped backoff — instead of
`EventSource`. Every REST call already carried the Bearer link, so the whole
UI now drives the scoped server (each account sees only its own data).
`vite build` green.

## Landed — 2026-07-20 · discovery in onboarding

The server gained `POST /discover` (io-pim-discovery; carillon-backend M9), so
the **Identify stage was rewritten** from a client-side domain guess to a real
"put anything → discover → choose" flow (himalaya/ortie-style, web):

- One "email address or server" input + a Discover button → `POST /discover`
  (public, rate-limited). `useDiscover` hook + `imapChoice`/`authMethod`/
  `discoverResponse` zod schemas mirror the server.
- The server groups results into **choices** — one per `(server, auth method)`,
  mechanism/source dropped — so e.g. Fastmail shows exactly one **Password**
  card and one **OAuth** card (see carillon-backend discover.rs). Each card
  shows the auth label + `host:port` + a TLS badge; the chosen `auth` method
  (kind + OAuth endpoints) is stored in the wizard for the next stage. The
  first TLS choice is auto-picked; a **typed email defaults the login**;
  login/host/port/folder stay editable; OAuth-only or non-TLS picks get an
  inline note (OAuth login lands with M9's OAuth half). Unresolvable input →
  manual entry.
- **tsc cleanup:** `parseOr` now returns the schema's exact `output<S>` type,
  which cleared the onboarding test-verdict and CreditPacks nits; only the
  pre-existing `vite.config.ts` `test`-key nit remains (1, was 3). Added a
  vitest `exclude` for the nix `.direnv/` source snapshot so `npm run test` is
  clean again (11 pass). `vite build` green.

## Known gaps / caveats

- **`vite.config.ts` `test`-key tsc nit** (1) remains — the `/// <reference
  types="vitest/config" />` augmentation isn't applied to Vite's `defineConfig`
  in this setup; importing from `vitest/config` regressed it (plugin overload
  clash). `build` (`vite build`) doesn't gate on `tsc`, so it's cosmetic.
- **shadcn primitives are hand-written** (no `npx shadcn add` offline); diff
  against the registry when convenient.
- **MSW service worker** needs a one-time `npm run mocks:init` for mock REST; the
  synthetic SSE stream works regardless.

## Next

- Run against a live carillon-backend and reconcile any shape drift; consider
  generating a typed client from the OpenAPI instead of the hand-written schemas.
- Wire real OAuth (Gmail/MS) once the server grows it.
- U6: verify the two serve paths — `rust-embed` (self-host, same-origin) and CDN
  (SaaS, cross-origin + CORS).
