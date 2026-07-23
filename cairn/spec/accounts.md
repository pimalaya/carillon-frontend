---
cairn: spec
capability: accounts
status: current
---

# Accounts

There are two account layers. A **Carillon account** is a magic-link email identity that owns the credit pool and holds one or more **PIM accounts** (the watched mailboxes/addressbooks). The email is the identity; the capability link minted at sign-in is the internal session token that authenticates everything under it (see [[principles]]) and is never surfaced to the user.

### Requirement: Carillon accounts via magic link
A Carillon account SHALL be a magic-link email identity. "Add account" SHALL send a magic link; verifying it mints the session token. Accounts SHALL be stored in `localStorage`, keyed by the server `accountId`. Settings SHALL show the signed-in email, not the token.

### Requirement: Account switcher
The header SHALL hold a switcher over the known Carillon accounts. Changing the active account SHALL re-scope every query to that account's capability link. A returning visitor with a cached link SHALL land straight in their dashboard.

### Requirement: PIM accounts under a Carillon account
PIM accounts (watched mailboxes and addressbooks) SHALL live under a single Carillon account, and the dashboard SHALL offer a per-PIM-account filter. The credit pool SHALL be per-Carillon-account, shared across its PIM accounts.

### Requirement: Free credit grant
On `POST /auth` the client SHALL surface the `free_credit` outcome — granted (🎁) or already-claimed-by-another-account — as a toast. The grant is the first service on a Carillon account running free for 7 days, deduplicated per account.

### Requirement: Sign out
Signing out SHALL revoke the link server-side (`/signout`) and remove it from `localStorage`.

### Requirement: Fire-once token exchanges
On-mount, fire-once token exchanges (magic `/verify`, `/mailboxes`) SHALL be a plain awaited `apiFetch` or `useQuery`, never a `useMutation` run from an effect, which desyncs under React StrictMode.
