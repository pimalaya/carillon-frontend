---
cairn: tasks
change: admin-route
---

- [x] Add `src/api/admin.ts`: typed client for the backend admin routes (list users/signups, credits, adjust credits, block/unblock)
- [x] Add admin views under `src/features/admin/` (users+signups list, credit adjust, block/unblock)
- [x] Add `/admin` route(s) to `src/routes/router.tsx`, OUTSIDE `RequireAccount`; no nav/menu/link anywhere
- [x] Off-tunnel behaviour: when the admin API `404`s / is unreachable, render a plain "admin API not available" state, not an error
- [x] Fold delta into the frontend spec (new `admin` capability or under `principles`); write `log/2026-..-admin-route.md`; set status `landed`
