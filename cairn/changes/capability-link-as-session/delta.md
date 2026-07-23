---
cairn: delta
change: capability-link-as-session
---

## MODIFIED Requirements

### Requirement: Login-less
There SHALL be no password login screen; identity is a magic-link email. The capability link SHALL be an internal bearer **session token** minted by magic-link verification, held in `localStorage` and sent as `Authorization: Bearer <link>` on every request by the `api.ts` wrapper. It SHALL NOT be presented to the user as a credential to copy, store, or safeguard, and SHALL NOT be shown in the UI. Recovery SHALL be by requesting a new magic link, not by retaining the link. Client-side gating SHALL only decide what to render; every protected call carries the token and the server validates it.
