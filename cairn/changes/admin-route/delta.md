---
cairn: delta
change: admin-route
---

## ADDED Requirements

### Requirement: The admin console is an undiscoverable /admin route
The SPA SHALL expose the admin console at `/admin`, reachable only by typing the
path. It SHALL NOT be linked from any nav, menu, button, or other view. The admin
route SHALL sit outside the normal capability-link account gate, since admin
authorization is enforced by the backend admin listener (loopback + email
whitelist / admin token), not by the client.

### Requirement: The admin views are inert off-tunnel
Because the SPA resolves the API base as `window.location.origin`, the admin
views SHALL work only when served from an origin whose admin API answers (the
loopback listener over an SSH tunnel / SOCKS). When the admin API is unreachable
(e.g. loaded over the public origin, where admin routes `404`), the views SHALL
render a plain "admin API not available" state rather than an error, this being
the intended off-tunnel behaviour.
