# carillon-admin — build status

A running record of what's built, what's real, and what's left. Pairs with the
plan in [`PLAN.md`](PLAN.md) (milestones **U0–U6**) and the server design in
[`../../carillon-server/docs/`](../../carillon-server/docs).

## Landed — 2026-07-20 · aligned to the real server (OpenAPI)

carillon-server landed M1–M7 with a full OpenAPI contract
([`openapi.yaml`](../../carillon-server/docs/openapi.yaml)). The whole API
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

## Known gaps / caveats

- **Not yet built/verified in a real toolchain.** No Node on this machine, so
  `npm install` / `vite build` / `vitest` have **not** run here. Dep versions are
  known-good ranges; expect minor reconciliation on first install. `build` is
  `vite build` (no `tsc` gate) so a stray type nit won't block a bundle; run
  `npm run typecheck` separately. Not yet exercised against a live server either.
- **`/watches`, `/deliveries`, `/events` are global on the server** (no per-account
  scoping / auth). Fine for self-host (one box, one user); the UI reads scoped
  data via `/me` where it can, but the live stream and global delivery list are
  server-global. A SaaS deployment would need server-side scoping.
- **SSE is unauthenticated** in the server today; the UI just opens
  `EventSource(/events)`. No token in the URL (good), but also no scoping (above).
- **shadcn primitives are hand-written** (no `npx shadcn add` offline); diff
  against the registry when convenient.
- **MSW service worker** needs a one-time `npm run mocks:init` for mock REST; the
  synthetic SSE stream works regardless.

## Next

- Run against a live carillon-server and reconcile any shape drift; consider
  generating a typed client from the OpenAPI instead of the hand-written schemas.
- Wire real OAuth (Gmail/MS) once the server grows it.
- U6: verify the two serve paths — `rust-embed` (self-host, same-origin) and CDN
  (SaaS, cross-origin + CORS).
