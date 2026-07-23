---
cairn: spec
capability: architecture
status: current
---

# Architecture

The dashboard is a pure client of the carillon-backend REST + SSE API: it holds no data of its own and owns no API contract. It is a Vite + React + TypeScript single-page app that builds to one static bundle in `dist/`, typed against the server's OpenAPI contract at the boundary, and served two ways from that one bundle.

### Requirement: Pure client SPA
The dashboard SHALL be a pure client of the carillon-backend control API, built with Vite + React + TypeScript to a single static bundle in `dist/` with no SSR and no server of its own. The daemon owns the API contract; this is one consumer of it.

### Requirement: Stack
The app SHALL use Tailwind CSS v4 (via the `@tailwindcss/vite` plugin) with owned, copy-in shadcn/ui primitives under `src/components/ui`, TanStack Query for all REST data, TanStack Router for routing, native SSE consumption for the live stream, and Zod to validate API responses at the boundary.

### Requirement: Folder structure
Code SHALL be organised as `src/lib` (config, api wrapper, sse, auth, format), `src/api` (one module per resource: typed calls + Query hooks + Zod schemas), `src/components` (shadcn primitives + shared components), `src/features` (onboarding, services, deliveries, billing, account), and `src/routes` (route components wiring features together).

### Requirement: Typed API boundary
Every screen SHALL be typed against the carillon-backend OpenAPI contract at `../backend/docs/openapi.yaml`, with wire shapes (snake_case fields, unix-seconds timestamps, watch-time as float seconds) read as the server sends them and no transform layer. Behavioural correctness SHALL be verified against that contract rather than assumed.

### Requirement: Runtime configuration
`VITE_API_BASE_URL` SHALL select the carillon-backend base, defaulting to empty (same-origin, for the self-host embed) and set to the API host for the hosted service. A single `src/lib/config.ts` SHALL read it and everything else SHALL import from there. Real `.env` values SHALL NOT be committed; `.env.example` documents the variable.

### Requirement: Serve-per-front
The one `dist/` bundle SHALL be served two ways from the same build: embedded same-origin by carillon-backend via `rust-embed` (self-host, no CORS), and from a CDN for the hosted service (cross-origin, Bearer + scoped CORS).

### Requirement: Offline mock backend
The app SHALL ship an in-browser mock backend (MSW handlers + a synthetic SSE stream) so the whole interface can be explored offline with no server; mocks turn off automatically when `VITE_API_BASE_URL` points at a real server.

### Requirement: Testing
Components SHALL be tested with Vitest + Testing Library, mocking the API with the same MSW handlers, focused on the onboarding capability verdict, the balance display, the account switcher, and the SSE-driven live log.
