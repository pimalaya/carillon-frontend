---
cairn: change
id: capability-link-as-session
status: landed
created: 2026-07-23
---

# Treat the capability link as an internal session token, not a user credential

## Why
The spec and UI still describe the capability link as the login-less account credential (the old D§5 model): the thing the user keeps, copies, safeguards, and re-mints to recover. Since accounts became magic-link identities, that is no longer true. The durable credential is the email; the link is a bearer **session token** minted by magic-link verification, and recovery is by requesting a new magic link — not by keeping the link.

Surfacing the link (the Settings "Capability link" card: masked value, copy button, "this link *is* your login", "store it in a password manager") is now misleading and a needless leak risk — a session token presented as a root password.

## What
Keep the link exactly as it is internally (the `Authorization: Bearer` token in `lib/api.ts`, the query-scope key, the SSE credential) — no mechanism changes. Stop surfacing it to the user:

- Replace the Settings "Capability link" card with a plain identity panel: "Signed in as `<email>`", no token shown, no copy.
- Reconcile the `principles` ("Login-less") and `accounts` capabilities so they describe email as the identity and the link as the internal session token.

Out of scope: how the link is minted or rotated server-side; the account switcher mechanics (still keyed by link under the hood).
