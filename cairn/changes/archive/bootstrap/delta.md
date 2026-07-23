---
cairn: delta
change: bootstrap
---

## ADDED Requirements

### Requirement: Pure client SPA
The dashboard is a Vite + React + TypeScript pure client of the carillon-backend API, built to one static `dist/` bundle.

### Requirement: Typed API boundary
Screens are typed against the carillon-backend OpenAPI contract, reading the server's wire shapes with no transform layer.

### Requirement: Runtime configuration
`VITE_API_BASE_URL` selects the backend base (empty = same-origin), read through a single `src/lib/config.ts`.

### Requirement: Serve-per-front
The one bundle is served embedded same-origin by the daemon and from a CDN for the hosted service.

### Requirement: Offline mock backend
An in-browser MSW backend + synthetic SSE lets the interface run offline; mocks turn off against a real server.

### Requirement: Content-free
No screen renders sender, subject or body; events show the event type and UID only.

### Requirement: Login-less
A capability link (bearer, in `localStorage`) is the only credential; there is no login screen.

### Requirement: Read-only
The UI offers no send, `APPEND`, or synthetic test action; verify waits for a real change.

### Requirement: Carillon accounts via magic link
Carillon accounts are magic-link identities stored in `localStorage`, keyed by server `accountId`, with a header switcher that re-scopes every query.

### Requirement: PIM accounts under a Carillon account
PIM accounts (mailboxes/addressbooks) live under one Carillon account with a per-account filter; the credit pool is per-Carillon-account.

### Requirement: Free credit grant
The first service on a Carillon account runs free for 7 days, surfaced as the `free_credit` outcome at sign-in.

### Requirement: Two-level onboarding
Onboarding splits into *add account* (identify via `/discover` + authenticate via `/test`) and *add service* (folder/notify/verify reusing the stored credential).

### Requirement: Service types (IMAP and CardDAV)
Add service offers an Email folder (IMAP) or Addressbook (CardDAV) toggle, each with its own Test and watch `source_kind`.

### Requirement: Metered lifecycle
Each service row exposes Active, Auto-renew, an Activate/Extend confirm-and-spend dialog (`POST /watches/{id}/activate`), and delete; self-host stays unmetered.

### Requirement: Client-generated secret
The client generates the watch `id` and `hmac_secret` on create so the signing secret is shown once.

### Requirement: Global deliveries log
A global, content-free delivery table updates live over SSE, filterable by service and ok/fail.

### Requirement: Credit-pool billing
Billing is a prepaid credit pool per account with Stripe-Checkout packs, not a subscription.

### Requirement: Authenticated live stream
`src/lib/sse.ts` reads `GET /events` over an authenticated fetch stream (not `EventSource`), with named `delivery` / `status` / `notice` events and capped-backoff reconnect.

### Requirement: Localisation
The UI is localised with react-i18next (en + fr), browser-detected and persisted in `localStorage`.
