---
cairn: spec
capability: onboarding
status: current
---

# Onboarding

Onboarding is split in two, along the account layers. **Add account** connects a PIM credential and mints the capability link; **add service** turns a stored credential into a live, metered watch. A Carillon account (magic-link) must exist first.

### Requirement: Two-level split
Onboarding SHALL split into two flows. *Add account* (`/onboarding`) is Identify + Authenticate only, which stores the PIM-account credential and mints the capability link, then stops. *Add service* (`/services/new`) is folder pick + notify + verify, reusing the stored credential via empty-password `POST /mailboxes` / `/watches`.

### Requirement: Identify via discovery
The Identify stage SHALL take one "email address or server" input and a Discover button calling `POST /discover` (public, rate-limited), then present the server's grouped **choices**, one card per `(server, auth method)`, each showing the auth label, `host:port`, and a TLS badge. The first TLS choice SHALL be auto-picked; a typed email SHALL default the login; login, host, port and folder stay editable. Unresolvable input SHALL fall back to manual entry.

### Requirement: Test verdict
The Authenticate stage SHALL run `POST /test` and render a structured verdict over `reachable / authenticated / idle / qresync / condstore`, where `ok` is the green light. A server that authenticates but lacks a required capability SHALL NOT show green; the missing capability SHALL be surfaced. The rate-limited "too many attempts" state SHALL be shown friendly.

### Requirement: Service types (IMAP and CardDAV)
Add service SHALL offer a service-type toggle: **Email folder (IMAP)** or **Addressbook (CardDAV)**. The CardDAV branch SHALL take a collection URL + display name, have its own Test (`POST /test` with `source_kind=carddav`), and create a `source_kind=carddav` watch. Watches carry `source_kind` / `carddav_url` / `sync`.

### Requirement: Read-only verify
The verify step SHALL activate the watch, then instruct the user to send or await a real message and show the live delivery log filling in as the webhook fires. It SHALL NOT offer any synthetic "send test mail" action.
