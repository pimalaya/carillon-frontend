---
cairn: change
id: admin-route
status: landed
created: 2026-07-24
---

# A bare /admin route for the localhost-only admin console

## Why
The backend is adding a localhost-only admin console (see the backend
`admin-console` change): user/signup listing, credit view + manual adjust, and
account blacklist, served only on a loopback listener reached via SSH tunnel /
SOCKS. The console needs a frontend, but it must add **no public surface**: no
nav entry, no button, no link discoverable from the normal dashboard. A bare
route is enough — the operator types `/admin` after tunnelling in.

The design relies on same-origin API resolution (`src/lib/config.ts` →
`window.location.origin`): the *same* SPA build is inert off-tunnel for free.
Loaded over the public URL, the admin views' `/admin/*` API calls hit the public
origin and `404`; loaded over the tunnel they hit the loopback origin and work.
So there is no separate build and no separate app — only new routes that happen
to be useful solely when the API answers.

## What
Add an `/admin` route tree to `src/routes/router.tsx`, outside `RequireAccount`
(admin auth is the loopback listener + email whitelist / admin token on the
server, resolved by the admin API calls themselves — not the capability-link
gate the normal app uses):

- `/admin` — users & signups: account list (email, credits, blocked, created)
  with new-signup counts.
- credit view + manual adjust (add/remove) on an account.
- block / unblock (blacklist) an account.

New admin API client module (`src/api/admin.ts`) calling the backend admin
routes through the existing typed `fetch` wrapper. Views live under
`src/features/admin/` (or `src/routes/Admin*.tsx`), matching existing structure.
The admin route SHALL NOT appear in any nav, menu, or link; it is reachable only
by typing the path. When the admin API is unreachable (off-tunnel, `404`), the
views SHALL render a plain "admin API not available" state rather than erroring —
this is the expected off-tunnel behaviour, not a fault.

## Non-goals
No nav/menu/link to `/admin` anywhere. No client-side gating beyond what the
server enforces (the server is the boundary; the client only reflects its
responses). No role UI beyond the flat capabilities above.
