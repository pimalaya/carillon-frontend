---
cairn: log
change: capability-link-as-session
landed: 2026-07-23
---

# Treat the capability link as an internal session token, not a user credential

Reconciled the account model with the magic-link architecture. The capability link is unchanged internally — still the `Authorization: Bearer` token in `lib/api.ts`, the query-scope key, and the SSE credential — but it is no longer presented to the user as a credential.

Landed:

- **Settings.** Replaced the "Capability link" card (masked token, copy button, "this link *is* your login", "store it in a password manager") with a "Signed in" panel showing the account email from `/me`. Dropped `maskLink`, the `CopyButton`, and the warning `Alert`. Softened the Sign-out copy from "revokes the link" to "ends this session".
- **Comments.** Reworded the `lib/auth.ts` header from the login-less D§5 framing to "magic-link identity; the link is an internal session token, never surfaced".

Capabilities moved:

- `principles` — **MODIFIED** *Login-less*: identity is a magic-link email; the link is an internal bearer session token, not shown or copyable, recovery is a new magic link.
- `accounts` — reworded the intro and *Carillon accounts via magic link* to match: email is the identity, the token authenticates under it, Settings shows the email.

Rationale kept out of the spec: with email as the durable identity and recovery path, surfacing a bearer session token as a root password was both misleading and a needless leak risk. The old D§5 login-less model (keep/share/re-mint the link) is superseded; only the transport mechanism survives.
