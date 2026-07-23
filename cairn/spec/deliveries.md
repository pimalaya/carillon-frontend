---
cairn: spec
capability: deliveries
status: current
---

# Deliveries

The deliveries page is the global live log across all of the active Carillon account's services. It is the "it works" surface, showing every signal and its webhook outcome as it happens, and never any content.

### Requirement: Global live log
The page SHALL render a table across the account's services from `GET /deliveries?account=&limit=`, updated live over SSE, with pagination.

### Requirement: Filters
The log SHALL be filterable by service and by ok/fail. The failures filter SHALL be applied client-side, since the server exposes no such parameter.

### Requirement: Content-free columns
Columns SHALL be time, event (`new` / `flags_added` / `flags_removed` / `removed`), UID, HTTP status, attempts, and ok/fail. UID only, never sender, subject or body.
