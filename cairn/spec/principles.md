---
cairn: spec
capability: principles
status: current
---

# Principles

Three governing invariants from the product design constrain every screen. They come from carillon-backend's design decisions and hold across the whole UI, not any single feature: the dashboard is content-free, login-less, and read-only.

### Requirement: Content-free
No screen SHALL ever render message content — no sender, subject or body. Events carry only which account changed, the event type, and a UID. When tempted to show "what changed", the UI SHALL show the event type and UID and stop.

### Requirement: Login-less
There SHALL be no email/password login screen. A capability link (a bearer token per Carillon account) SHALL be the only credential, held in `localStorage` and sent as `Authorization: Bearer <link>` on every request by the `api.ts` wrapper. Client-side gating SHALL only decide what to render; every protected call carries the link and the server validates it.

### Requirement: Read-only
The UI SHALL NOT offer any write to a mailbox: no send, no `APPEND`, no "send test mail" button. The onboarding verify step SHALL wait for a real change rather than synthesise one, and delivery logs SHALL NOT offer redelivery or test-fire.
