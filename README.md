# carillon-frontend

The **default / reference admin dashboard** for [Carillon](../carillon-backend) — a
hosted watcher that turns a change on a remote mailbox into a content-free webhook.

`carillon-frontend` is a **pure client** of the `carillon-backend` REST + SSE API. It's
what the SaaS serves and what self-hosters get out of the box — but it's a *separate
repo on purpose*: the daemon owns the API contract (OpenAPI), and this UI is just
one consumer of it. Self-hosters can embed this build or bring their own.

> **Status:** the full UI — onboarding wizard, watches, live delivery log,
> two-counter billing, account switcher — is built and typed against
> `carillon-backend`'s OpenAPI contract
> ([`carillon-backend/docs/openapi.yaml`](../carillon-backend/docs/openapi.yaml)),
> so it drives the real server. It also ships in-browser [MSW](https://mswjs.io)
> mocks for offline UI work. See [`docs/STATUS.md`](docs/STATUS.md) for details
> and [`docs/PLAN.md`](docs/PLAN.md) for the architecture.

## Drive a real carillon-backend

```sh
# 1. allow this dev origin in the server config (carillon.toml):
#      [api]
#      listen = "127.0.0.1:3000"
#      cors_allow_origin = "http://localhost:5173"
#    then run the daemon (serves http://127.0.0.1:3000):
carillon-backend serve carillon.toml

# 2. point the dashboard at it (mocks turn off automatically)
cd carillon-frontend
npm install
echo 'VITE_API_BASE_URL=http://127.0.0.1:3000' > .env.local
npm run dev            # http://localhost:5173
```

Every screen maps to server endpoints: onboarding runs `/test` → `/auth` →
`/watches`; the dashboard reads `/me`; the live log consumes `/events` (SSE);
billing hits `/billing/*` and `/accounts/{id}/credit`. Settings has a "add
credit" button to exercise metering without a payment.

## Offline (mock) mode

```sh
npm install
npm run mocks:init     # one-time: generate the MSW worker into public/
npm run dev            # no .env needed — click "Explore the demo"
```

Other scripts: `npm run build` (static `dist/`), `npm run preview`,
`npm run typecheck`, `npm run test`.

## At a glance

- **Stack:** Vite + React + TypeScript + Tailwind v4 + shadcn/ui, TanStack Query,
  native `EventSource` (SSE). Pure client SPA, no SSR.
- **Auth:** no signup — a **capability link** (per login-less account) held in
  localStorage, sent as `Authorization: Bearer`. A multi-mailbox/account switcher
  is a client-side list of those links.
- **Content-free:** the UI never renders message content — events are
  `{account, event, uid}` only.
- **Served two ways from one `dist/`:** embedded in the daemon (`rust-embed`) for
  self-host; from a CDN for the SaaS. API base URL via `VITE_API_BASE_URL`.

See [`docs/PLAN.md`](docs/PLAN.md) for the full architecture, screens, API map, and
milestones, and the sibling docs in
[`carillon-backend/docs/`](../carillon-backend/docs) (`DECISIONS.md`, `ROADMAP.md`,
`CARILLON_PLAN.md`) for the product design this UI implements.
