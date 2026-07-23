---
cairn: log
change: bootstrap
landed: 2026-07-23
---

# Adopt Cairn and migrate the docs/ folder

Adopted the Cairn convention for this repository. Created the `cairn/` root, added the activation surface (`AGENTS.md` with `CLAUDE.md`, Cursor and Copilot pointers) and the `verify.sh` Stop hook vendored from pimalaya/cairn, and removed the old `docs/` folder after migrating its content.

Seeded the spec from the current state in `docs/STATUS.md` (2026-07-22, which supersedes the stale `docs/PLAN.md`) as nine capabilities, all ADDED: `architecture`, `principles`, `accounts`, `onboarding`, `services`, `deliveries`, `billing`, `live-stream`, and `i18n`. The spec holds current truth only; the build history and the paths not taken are recorded here.

## Prior history (migrated from docs/STATUS.md)

The dashboard was built in stages; these predate Cairn and are preserved here rather than in the spec:

- **2026-07-20. Initial build against mocks.** Scaffolded the whole SPA (U0–U4): core libs, API layer, every screen, MSW mocks + synthetic SSE, and `format`/`auth` unit tests. Design invariants honored from the start: content-free, login-less, read-only.
- **2026-07-20. Aligned to the real server (OpenAPI).** carillon-backend landed M1–M7 with a full OpenAPI contract; the whole API boundary was rewritten field-for-field to it (snake_case, unix-seconds, float watch-time seconds, `/auth` + `/me` + `/signout`, client-generated watch id/secret, named SSE events). Mocks became the offline fallback.
- **2026-07-20. Authenticated, scoped live stream.** Route scoping + authed SSE (backend M8) meant native `EventSource` (no headers) no longer worked; `lib/sse.ts` switched to an authenticated fetch stream with hand-parsed frames and capped-backoff reconnect.
- **2026-07-20. Discovery in onboarding.** `POST /discover` (io-pim-discovery, backend M9) replaced the client-side domain guess with a real "put anything → discover → choose" flow, grouping results into one card per `(server, auth method)`.
- **2026-07-21. Subscription billing (reverted).** The watch-time credits model was briefly replaced with a single Stripe subscription (`SubscriptionCard`, `PlanPicker`, `usePlans`/`usePortal`). This detour was **reverted**: the current model is a prepaid credit pool. Recorded here so the reversal is not silent.
- **2026-07-22. Current state.** Drives a real carillon-backend (Resend magic-link + Stripe pack checkout verified live). Two-level onboarding split (add account vs add service); Carillon accounts (magic-link) holding PIM accounts; metered service lifecycle (Active / Auto-renew / Activate-Extend spend / delete); free-credit toast; CardDAV service type alongside IMAP; react-i18next (en + fr). `tsc` + `vite build` + 12 unit tests green.

## Still open at migration time

Interactive OAuth end-to-end (real browser consent), production deploy (host + CORS/public_url + live keys + Resend domain verification), deferred features (API keys, auto-recharge), and finishing i18n extraction of the deeper onboarding and billing/settings strings. A known cosmetic `tsc` nit on the `vite.config.ts` `test` key remains (build does not gate on it).

This log entry and the `bootstrap` change are the first stones.
