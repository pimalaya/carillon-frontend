# carillon-frontend — build-from-scratch plan

A complete plan for a separate session to build the Carillon frontend dashboard from
nothing. Read this top-to-bottom before scaffolding.

**What this is:** the default/reference SPA for Carillon — a **pure client** of the
`carillon-backend` REST + SSE API. It's what the SaaS serves and what self-hosters
get by default, but it's decoupled on purpose (the daemon owns the API contract;
this is one consumer). See the product design it implements in
[`carillon-backend/docs/`](../../carillon-backend/docs): `CARILLON_PLAN.md` (vision),
`DECISIONS.md` (the design decisions — referenced below as **D§n**), `ROADMAP.md`
(server milestones **M0–M8**).

**Governing constraints from the product design — internalise these:**

- **Signal, not sync; content-free.** The UI never shows message content (no
  sender/subject/body). Events carry `{account, event, uid}` only. (D§1, D§4)
- **No signup, login-less account.** Access = a **capability link** (bearer) per
  account, held in localStorage. No email/password. (D§5)
- **Read-only.** Carillon never writes to mailboxes; the UI never offers a
  "write"/"send" action, and the onboarding demo is read-only. (D§7)
- **Two watch-time counters.** Per-mailbox **trial** (non-refillable) is drained
  **before** the account **paid pool** (refillable). Surface both. (D§3)
- **Serve-per-front.** One `dist/`; self-host embeds it, SaaS CDN-serves it. API
  base URL is an env var. (D§6)

---

## 1. Stack & principles

- **Vite + React + TypeScript** — static build to `dist/`, no SSR.
- **Tailwind CSS + shadcn/ui** — copy-in components you own (mirrors the charlie
  web kit). Radix under the hood.
- **TanStack Query** — all REST data (queries, mutations, cache, invalidation,
  optimistic updates).
- **TanStack Router** *or* React Router — routing (TanStack Router pairs nicely
  with Query and is type-safe; either is fine).
- **Native `EventSource`** — the SSE live log/status. No WebSocket, no lib.
- **Zod** — validate/type API responses at the boundary (optional but recommended;
  or generate types from the server's OpenAPI once it exists).
- **MSW (Mock Service Worker)** — develop against mocked endpoints that the server
  hasn't shipped yet (see §6).

Principles: pure client SPA; typed API boundary; keep components dumb, put data in
Query hooks; every mutation invalidates the right query; never render message
content.

## 2. Scaffold (exact steps)

The repo already exists (`carillon-frontend/`, git-initialised) with `README.md`,
`docs/`, `.gitignore`. Scaffold *in place*:

```sh
# from carillon-frontend/
npm create vite@latest . -- --template react-ts   # keep existing files when prompted
npm i
npm i @tanstack/react-query
npm i @tanstack/react-router          # or: react-router-dom
npm i zod
npm i -D tailwindcss @tailwindcss/vite   # Tailwind v4 (charlie uses v4)
npm i -D vitest @testing-library/react @testing-library/jest-dom jsdom msw
# shadcn/ui:
npx shadcn@latest init
npx shadcn@latest add button input card table dialog form badge sonner tabs skeleton
```

Wire Tailwind v4 via the Vite plugin (`@tailwindcss/vite`) + `@import "tailwindcss"`
in the CSS entry. Add path alias `@/*` → `src/*` in `tsconfig` + `vite.config.ts`.

## 3. Config / env

- `VITE_API_BASE_URL` — the carillon-backend base. **Default empty = same-origin**
  (self-host embed). SaaS sets it to the API host (cross-origin → CORS + Bearer).
- `.env.example` documents it; never commit real `.env`.
- A single `src/lib/config.ts` reads it; everything else imports from there.

## 4. Folder structure

```
src/
  main.tsx, App.tsx, index.css
  lib/
    config.ts          # env
    api.ts             # fetch wrapper: base URL + Authorization: Bearer + errors
    sse.ts             # useEventStream hook over EventSource
    auth.ts            # capability-link store (localStorage) + account switcher
    format.ts          # dates, durations (watch-time), event labels
  api/                 # one module per resource: typed calls + Query hooks
    watches.ts         # list/create/get/pause/resume/delete + useWatches()
    deliveries.ts      # list + stream
    account.ts         # balance (two counters), test-connect, capability link
    billing.ts         # checkout, packs, auto-refill
    schemas.ts         # zod schemas / TS types (or generated from OpenAPI)
  components/          # shadcn primitives (ui/) + app-level shared components
  features/
    onboarding/        # the 5-stage wizard
    watches/           # list, detail, status
    deliveries/        # live log table
    billing/           # balance, packs, auto-refill
    account/           # switcher, sign-out
  routes/ (or pages/)  # route components wiring features together
  mocks/               # MSW handlers for not-yet-shipped endpoints
  test/                # setup + component tests
```

## 5. Auth & account model in the UI (D§5)

There is **no login screen**. Instead:

- **Capability link = the credential.** Stored in localStorage; sent on every
  request as `Authorization: Bearer <link-token>` by the `api.ts` wrapper.
- **Account switcher** = a localStorage list of `{ label, link, addedAt }`. The UI
  renders a dropdown to switch the "active" account; the active link drives all
  queries. A returning visitor lands straight in their dashboard (link cached).
- **Add / first run:** an "Add mailbox" flow runs the onboarding wizard (§6.1). On
  first successful auth the server **creates an account and returns its capability
  link**; the UI stores it and marks it active. Authenticating another mailbox
  *while an account is active* adds that mailbox to the same account (send the
  active link so the server associates it).
- **Recovery:** "lost your link?" → re-run auth to any member mailbox → server
  re-mints the account link. No email involved.
- **Sign out** = remove the link(s) from localStorage (server can also invalidate).
- **Hygiene:** tight CSP, don't put the link in `Referer`-leaking URLs (keep it in
  storage/headers, not query strings), support the server's link expiry/rotation.

Never gate purely client-side — every protected call carries the Bearer link and
the server validates it. The client gating is only for UX (what to render).

## 6. Screens / features

Each screen lists **what it shows**, **which API it calls**, and **UX rules** tied
to the design.

### 6.1 Onboarding wizard (the conversion path — D§2)

Five stages, one thing each:

1. **Identify** — email input → call discovery → present the discovered
   host/port/security; let the user confirm or override. (Server: discovery via
   `io-pim-discovery`; endpoint TBD, mock meanwhile.)
2. **Authenticate / Test** — credential entry (password or OAuth start) → **Test**
   (`POST /test`, M2). Show a structured verdict: `TLS ✓ · auth ✓ · IDLE ✓ ·
   QRESYNC ✓`. **The green light requires the capabilities, not just auth** — a
   server can auth and still fail the watch. Show which capability is missing if
   any. Rate-limited server-side; surface a friendly "too many attempts" state.
3. **Configure output** — notify URL input + display the signing secret (with a
   "copy" + a short "how to verify the signature" link). Validate `https://`.
4. **Verify end-to-end (read-only)** — activate the watch, then instruct: "send
   yourself an email (or wait for the next one)". Show the **live delivery log**
   (SSE) filling in as the webhook fires. **No `APPEND`, no "send test mail" button
   from us** (read-only, D§7). This is the "it works" moment.
5. **Commit** — confirm; the watch is live and metering begins (D§3).

On success, store/refresh the capability link and route to the dashboard.

### 6.2 Dashboard / account view

- **Account balance** — render **both counters** clearly: per-mailbox trial
  (non-refillable, "free trial" chip, drained first) and the account paid pool
  (refillable, with "Add credits"). Show projected runway (balance ÷ active
  watch-rate) and a **low-balance warning** state. (D§3)
- **Watches list** — one row per watch (mailbox + folder): live connection status
  (watching / reconnecting / error / paused), last event time, per-watch spend.
  Status is live via SSE.
- **Add mailbox** button → onboarding wizard (adds to the active account).
- **Account switcher** in the header (§5).

### 6.3 Watch detail

- Status, mailbox/folder, notify URL, signing secret (reveal/rotate), pause/resume
  (`POST /watches/{id}/pause|resume`), delete (`DELETE /watches/{id}`).
- **Delivery log** for this watch — live via SSE; columns: time, event
  (`new`/`flags_added`/`flags_removed`/`removed`), UID, HTTP status, attempts,
  ok/fail. **UID only — never content.**
- Redelivery / test-fire is out (read-only + no synthetic events beyond real ones).

### 6.4 Deliveries (global log)

- Table across the account's watches: `GET /deliveries?account=&limit=`, live
  updates via SSE. Filter by watch, by ok/fail. Pagination.

### 6.5 Billing / credits (D§3, M7)

- Show the paid-pool balance; **buy credit packs** → Stripe Checkout redirect
  (server creates the session tied to the active account via its link, so payment
  is stateless on our side and the two-emails problem stays solved).
- **Auto-refill** toggle (opt-in) with threshold — frames it as "never miss a
  notification". Low-balance + pre-expiry banners.
- Trials are shown as the per-mailbox counter, clearly non-refillable.

### 6.6 Settings / account

- Manage the capability link (rotate, sign out), list member mailboxes, per-account
  webhook defaults, docs links (signature verification recipe, self-host).

## 7. API map

**Exists in `carillon-backend` today** (see its `src/api.rs`):
`GET /health` · `GET /watches` · `POST /watches` · `DELETE /watches/{id}` ·
`POST /watches/{id}/pause` · `POST /watches/{id}/resume` ·
`GET /deliveries?account=&limit=`.

**Planned server-side (build the UI against MSW mocks until they land):**
- `POST /test` — connect + auth + capability check (M2).
- Discovery endpoint — email → server config (M-onboarding).
- Auth / capability-link issuance — mailbox auth → account + link (M7); add-mailbox
  associates to the active account.
- **SSE** stream — `GET /events` (delivery log + connection status). (M4)
- Account **balance** (two counters) + metering (M5).
- **Billing** — create-checkout, packs, auto-refill (M7).

Track the **OpenAPI** spec the server will publish (M6) as the source of truth for
types; generate a typed client from it when available, else hand-write in
`api/schemas.ts` and keep them in sync.

## 8. Data & state patterns

- **TanStack Query** for all REST. Query keys: `['watches', accountLink]`,
  `['deliveries', accountLink, filter]`, `['account', accountLink]`. Mutations
  (create/pause/resume/delete/buy) invalidate the relevant keys; use optimistic
  updates for pause/resume.
- **SSE → cache.** `useEventStream(url)` opens one `EventSource` for the active
  account; on each event, push into the deliveries query cache (or a local store)
  and update watch status. Reconnect with backoff on error; show a "live/stale"
  indicator.
- **Active account** (the current link) lives in a small context/store; changing it
  re-scopes every query.

## 9. Design / brand

- Carillon = bells/chime; keep it calm and status-focused (this is an ops
  dashboard). shadcn neutral theme, one accent.
- The recurring emotional beats: the **green capability check** (onboarding) and
  the **live log firing** (verify) — make those visually satisfying.
- Never render content; when tempted to show "what changed", show the event type +
  UID and stop.

## 10. Build & deploy (D§6)

- `vite build` → static `dist/`. No server.
- **Self-host:** carillon-backend embeds a pinned `dist/` via `rust-embed` (its
  build step vendors this repo's build), served at the daemon's origin (no CORS).
  Or the self-hoster serves `dist/` themselves / BYO UI.
- **SaaS:** deploy `dist/` to a CDN/Netlify; set `VITE_API_BASE_URL` to the API
  host; API sends permissive-but-scoped CORS for that origin.

## 11. Testing

- **Vitest + Testing Library** for components; **MSW** to mock the API (same
  handlers power local dev against unshipped endpoints).
- Focus tests on: the onboarding capability-verdict rendering, the two-counter
  balance display, the account switcher, and the SSE-driven live log.

## 12. Milestones (for the dev session)

- **U0 — Scaffold.** §2 + §3 + Tailwind/shadcn wired; `App` shell, routing, base
  layout, theme. Green `vite build`.
- **U1 — API + auth.** `api.ts` (Bearer wrapper), `auth.ts` (link store +
  switcher), TanStack Query provider, MSW handlers. A working "add account →
  store link → land on dashboard" using mocks.
- **U2 — Watches + live log.** Watches list + detail, SSE `useEventStream`, live
  delivery log (mocked stream). Pause/resume/delete with optimistic updates.
- **U3 — Onboarding wizard.** The 5 stages, incl. the capability-verdict UI and the
  read-only verify step.
- **U4 — Billing/credits.** Two-counter balance, buy-pack (Checkout redirect stub),
  auto-refill, low-balance states.
- **U5 — Polish + real API.** Swap MSW for the real endpoints as they land
  (`VITE_API_BASE_URL`), OpenAPI-generated types, error/empty/loading states,
  a11y, CSP.
- **U6 — Ship both fronts.** Verify embed path (rust-embed in carillon-backend) and
  CDN path; document the two deploys.

## 13. Depends-on / open

- Server endpoints in §7 marked *planned* gate U3–U5 against real data (mock until
  then). Coordinate with carillon-backend **M2/M4/M5/M7**.
- Capability-link format + expiry/rotation semantics come from the server (D§5);
  the UI just stores and sends. Confirm the header/param convention when M7 lands.
- OAuth flows (Gmail/MS) for read-only scopes (D§7) — the UI initiates and handles
  the redirect; details land with the server's OAuth support.
