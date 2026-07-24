---
cairn: spec
capability: admin
status: current
---

# Admin console

The admin console is the frontend for the backend's localhost-only administrative
API (see the backend `auth` capability). It manages accounts: user/signup listing,
credit view and manual adjustment, and account blacklist. It exists as a route in
the same SPA as the dashboard, but is useful only when the SPA is served from an
origin whose admin API answers — the backend serves that API on a loopback
listener reached over an SSH tunnel / SOCKS proxy. See [[principles]].

### Requirement: The admin console is an undiscoverable /admin route
The SPA SHALL expose the admin console at `/admin`, reachable only by typing the
path. It SHALL NOT be linked from any nav, menu, button, or other view. The admin
route SHALL sit outside the normal capability-link account gate (`RequireAccount`),
since admin authorization is enforced by the backend admin listener (loopback +
email whitelist / admin token), not by the client. The active capability link is
still sent as the bearer, so a whitelisted-email session authenticates the admin
API calls. The route SHALL be code-split (loaded lazily) so the admin code and its
`/admin/*` API paths are not part of the main bundle served on the public origin.

### Requirement: Clicking an account opens its services dialog
Clicking an account row SHALL open a dialog listing that account's individual
services (watches) as a table: a service column (mailbox as the title, protocol
as muted subtitle), login, provider, the "watches until" paid-through time, and
active/paused state. The per-account watch list SHALL be lazy-loaded — fetched
only while the dialog is open, not up front with the account list. The row's
inline controls (credit adjust, block/unblock) SHALL keep working without opening
the dialog.

### Requirement: The admin views are inert off-tunnel
Because the SPA resolves the API base as `window.location.origin`, the admin views
SHALL work only when served from an origin whose admin API answers (the loopback
listener over an SSH tunnel / SOCKS). When the admin API is unreachable — loaded
over the public origin, where the admin routes `404`, or with no server on the
origin — the views SHALL render a plain "admin API not available" state rather than
an error, this being the intended off-tunnel behaviour. An authenticated-but-not-
whitelisted session (`403`) SHALL render a distinct "not authorized" state.
