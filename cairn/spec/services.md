---
cairn: spec
capability: services
status: current
---

# Services

A service is one watch: a PIM account plus a folder (IMAP) or collection (CardDAV), with a notify URL and signing secret. The dashboard lists services with live status and drives their metered lifecycle; each has a detail view with its own delivery log.

### Requirement: Services list
The dashboard SHALL render one row per service showing its live connection status, last event time, and per-service spend, with a per-PIM-account filter. Addressbook (CardDAV) rows SHALL carry an **Addressbook** chip. A row click SHALL open the service detail.

### Requirement: Metered lifecycle
Each row SHALL expose an **Active** switch (pause/resume webhook deliveries; the server honours `active`), an **Auto-renew** switch, an **Activate/Extend** button (Hourglass icon) opening a confirm-and-spend dialog with a quantity picker calling `POST /watches/{id}/activate {credits}` all-or-nothing, and an inline trash delete. An empty credit pool SHALL toast instead of opening the dialog. Activating a stopped service SHALL turn Auto-renew on.

### Requirement: Self-host is unmetered
The self-hosted (unmetered) build SHALL keep free pause/resume and SHALL NOT show any credits UI.

### Requirement: Client-generated secret
On create, the client SHALL generate the watch `id` and `hmac_secret` so the signing secret is shown once. Rotating SHALL reveal a fresh one.

### Requirement: Service detail and delivery log
The detail view SHALL show status, mailbox/folder or collection, notify URL, the signing secret (reveal/rotate), pause/resume, and delete, plus a per-service delivery log — live via SSE, columns time / event / UID / HTTP status / attempts / ok-fail — showing UID only, never content.
