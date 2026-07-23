---
cairn: spec
capability: live-stream
status: current
---

# Live stream

The live delivery log and connection status arrive over one authenticated SSE stream per active account. Because the server scopes routes and authenticates the stream, the client cannot use the browser's native `EventSource` (which cannot send headers) and reads the stream over an authenticated fetch instead.

### Requirement: Authenticated fetch stream
`src/lib/sse.ts` SHALL read `GET /events` as an authenticated fetch stream, sending the Bearer capability link in the header and parsing SSE frames by hand, rather than using native `EventSource`.

### Requirement: Named events
The stream SHALL carry named events `delivery`, `status`, and `notice`. `delivery` events feed the delivery caches; `status` events (`watching` / `reconnecting` / `error` / `stopped`) are overlaid onto the matching watch in the Query cache; `notice` events toast and refetch the balance.

### Requirement: Reconnect with backoff
The stream SHALL reconnect on error with capped backoff and surface a live/stale indicator.

### Requirement: One stream per active account
Exactly one stream SHALL be open for the active account; changing the active account re-scopes it so each account sees only its own data.
