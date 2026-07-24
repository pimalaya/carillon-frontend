---
cairn: log
change: admin-route
landed: 2026-07-24
---

# A bare /admin route for the localhost-only admin console

Added an `/admin` route to `src/routes/router.tsx`, **outside** `RequireAccount`
and linked from nowhere — it is reached only by typing the path. Admin
authorization is the backend's job (loopback admin listener + email whitelist /
admin token); the client only reflects the API's responses. The active capability
link is sent as the bearer by the existing `apiFetch`, so a whitelisted-email
session authenticates the admin calls.

New `src/api/admin.ts` — react-query hooks over the backend admin routes:
`useAdminOverview`, `useAdminAccounts`, and mutations `useAdjustCredits` /
`useSetBlocked` (both invalidate the account list). Queries use `retry: false` so
the off-tunnel `404` surfaces immediately.

New `src/features/admin/AdminConsole.tsx` + `src/routes/AdminPage.tsx` — overview
stat cards (accounts, recent signups, pooled credits) and an accounts table with
per-row credit adjust (signed delta, `409` → "not enough credits") and
block/unblock. Off-tunnel behaviour is explicit: a `404` (routes not mounted on
the public listener) or a bare network error renders an "Admin API not available"
card explaining the SSH-tunnel access path; a `403` renders a "not authorized"
card. Kept in plain English (not run through i18n) as an internal ops tool.

Typecheck, `vite build`, and `vitest` all green.

## Follow-up: per-user watch visibility (same day)

Added a "Watches" count column to the account list. Clicking an account row opens
a dialog listing that account's services (watches) as a table (protocol, mailbox,
login, provider, active/paused). The watches lazy-load via
`useAccountWatches(id, open)` — fetched only while the dialog is open — and the
row's inline controls (credit adjust, block) stop propagation so they still work
without opening the dialog. Backed by the backend `GET /admin/accounts/{id}/watches`
and the `watch_count` field on `/admin/accounts`. (An earlier inline collapsible
sub-row was replaced by this dialog for legibility.) Iterated on the UI: dropped
the account-list "Watches" column and the redundant "active" badge; the services
table merges mailbox (title) + protocol (muted subtitle) into one column and adds
a "Watches until" column from the watch's `watching_until` (added to the shared
`WatchView`, additive/non-strict so existing consumers are unaffected).

## Follow-up: code-split the admin route (same day)

To keep the admin code and its `/admin/*` API paths out of the main bundle served
on the public origin, the `/admin` route is now loaded via React Router's route
`lazy` (`import("./AdminPage")`) instead of a static import. The build emits a
separate `AdminPage-*.js` chunk; the main `index-*.js` bundle contains zero
`/admin/*` references (verified against `dist/assets`). The chunk is still served
as a static asset (the loopback bind, not obscurity, remains the control), but it
is no longer in what every public visitor downloads.

## Capabilities moved

- **admin** (new) — ADDED "The admin console is an undiscoverable /admin route",
  "The admin views are inert off-tunnel", and "The account list shows watches per
  user".
