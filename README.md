# carillon-admin

The **default / reference admin dashboard** for [Carillon](../carillon-server) — a
hosted watcher that turns a change on a remote mailbox into a content-free webhook.

`carillon-admin` is a **pure client** of the `carillon-server` REST + SSE API. It's
what the SaaS serves and what self-hosters get out of the box — but it's a *separate
repo on purpose*: the daemon owns the API contract (OpenAPI), and this UI is just
one consumer of it. Self-hosters can embed this build or bring their own.

> Not built yet. This repo currently holds the **build-from-scratch plan** at
> [`docs/PLAN.md`](docs/PLAN.md) — a separate session develops the app against it.

## At a glance

- **Stack:** Vite + React + TypeScript + Tailwind + shadcn/ui, TanStack Query,
  native `EventSource` (SSE). Pure client SPA, no SSR.
- **Auth:** no signup — a **capability link** (per login-less account) held in
  localStorage, sent as `Authorization: Bearer`. A multi-mailbox/account switcher
  is a client-side list of those links.
- **Served two ways from one `dist/`:** embedded in the daemon (`rust-embed`) for
  self-host; from a CDN for the SaaS. API base URL via `VITE_API_BASE_URL`.

See [`docs/PLAN.md`](docs/PLAN.md) for the full architecture, screens, API map, and
milestones, and the sibling docs in
[`carillon-server/docs/`](../carillon-server/docs) (`DECISIONS.md`, `ROADMAP.md`,
`CARILLON_PLAN.md`) for the product design this UI implements.
