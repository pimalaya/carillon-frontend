# 🔔 Carillon frontend [![Matrix](https://img.shields.io/badge/chat-%23pimalaya-blue?style=flat&logo=matrix&logoColor=white)](https://matrix.to/#/#pimalaya:matrix.org) [![Mastodon](https://img.shields.io/badge/news-%40pimalaya-blue?style=flat&logo=mastodon&logoColor=white)](https://fosstodon.org/@pimalaya)

Reference dashboard for the Carillon watch server

Carillon signals; it never syncs. This dashboard is a pure client of the carillon-backend REST and SSE API: it manages watches, streams the delivery log and handles billing, and it is what the hosted service serves and what self-hosters get embedded in the daemon. The API contract belongs to the daemon, so this is one consumer of it; bring your own client if you prefer.

## Table of contents

- [Features](#features)
- [Installation](#installation)
  - [Nix](#nix)
  - [Sources](#sources)
- [Configuration](#configuration)
- [Usage](#usage)
- [License](#license)
- [AI disclosure](#ai-disclosure)
- [Contributing](CONTRIBUTING.md)
- [Social](#social)
- [Sponsoring](#sponsoring)

## Features

- Guides a login-less onboarding wizard that connects a mailbox and mints a capability link, with no signup
- Manages watches per account from one dashboard: create, pause, resume and delete
- Streams a live delivery log over SSE, showing every signal and its webhook outcome as it happens
- Handles prepaid-credit billing: buy packs, activate and auto-renew watches, and track the trial and paid watch-time counters
- Holds several login-less accounts side by side through a client-side account switcher
- Stays content-free by design: it never renders message content, only which account changed and which UID
- Ships an in-browser mock backend so the whole interface can be explored offline with no server
- Builds to one static bundle served two ways: embedded same-origin by the daemon, or from a CDN

## Installation

Most users never build the dashboard: the hosted service serves it, and self-hosters get it embedded in carillon-backend. Build it yourself only to develop it or to host your own copy.

### Nix

With the [Flakes](https://nixos.wiki/wiki/Flakes) feature enabled, build the static bundle:

```sh
nix build github:pimalaya/carillon-frontend
```

The result is a dist/ directory any static host can serve.

### Sources

```sh
git clone https://github.com/pimalaya/carillon-frontend
cd carillon-frontend
npm install
npm run build
```

## Configuration

The dashboard is a pure client, so its only configuration is where to reach the server and whether to run against the in-browser mock backend. Both are build-time environment variables documented in [.env.example](./.env.example): `VITE_API_BASE_URL` points at a running carillon-backend, where an empty value means same-origin, the embedded self-host case; `VITE_ENABLE_MOCKS` forces the offline demo on or off. Driving a real server across origins requires that server to allow this origin through its own config.

## Usage

Run `npm run dev` for a hot-reloading dev server, `npm run build` for the production bundle, and `npm run test` for the unit tests. Every screen maps onto the carillon-backend control API described by the OpenAPI contract at [carillon-backend/docs/openapi.yaml](../backend/docs/openapi.yaml); the architecture, screen map and build history live in the [cairn](./cairn) folder, which follows the [Cairn](https://github.com/pimalaya/cairn) convention (`spec/` current design, `changes/` proposals, `log/` history).

## License

This project is licensed under either of:

- [MIT license](LICENSE-MIT)
- [Apache License, Version 2.0](LICENSE-APACHE)

at your option.

## AI disclosure

This project is developed with AI assistance. This section documents how, so users and downstream packagers can make informed decisions.

- **Tools**: Claude Code (Anthropic), Opus 4.8, invoked locally with a persistent project-scoped memory and a small set of repo-specific rules.
- **Used for**: Refactors, mechanical multi-file edits, boilerplate (component scaffolding, API schemas, mock handlers), test scaffolding, doc polish, exploratory design conversations.
- **Not used for**: Engineering, critical code, git manipulation (commit, merge, rebase…), real-world tests.
- **Verification**: Every AI-assisted change is read, type-checked, tested, and built before commit (`npm run typecheck / npm run test / npm run build`). Behavioural correctness is verified against the carillon-backend OpenAPI contract, not assumed from the model output. Tests are never adjusted to fit AI-generated code; the code is adjusted to fit correct behaviour.
- **Limitations**: AI models occasionally produce code that compiles and passes tests but is subtly wrong: off-by-one errors, missed edge cases, plausible but nonexistent APIs. The verification workflow catches most of this; it does not catch all of it. Bug reports are welcome and taken seriously.
- **Last reviewed**: 23/07/2026

## Social

- Chat on [Matrix](https://matrix.to/#/#pimalaya:matrix.org)
- News on [Mastodon](https://fosstodon.org/@pimalaya) or [RSS](https://fosstodon.org/@pimalaya.rss)
- Mail at [pimalaya.org@posteo.net](mailto:pimalaya.org@posteo.net)

## Sponsoring

[![nlnet](https://nlnet.nl/logo/banner-160x60.png)](https://nlnet.nl/)

Special thanks to the [NLnet foundation](https://nlnet.nl/) and the [European Commission](https://www.ngi.eu/) that have been financially supporting the project for years:

- 2022 → 2023: [NGI Assure](https://nlnet.nl/project/Himalaya/)
- 2023 → 2024: [NGI Zero Entrust](https://nlnet.nl/project/Pimalaya/)
- 2024 → 2026: [NGI Zero Core](https://nlnet.nl/project/Pimalaya-PIM/)
- *2027 in preparation…*

If you appreciate the project, feel free to donate using one of the following providers:

[![GitHub](https://img.shields.io/badge/-GitHub%20Sponsors-fafbfc?logo=GitHub%20Sponsors)](https://github.com/sponsors/soywod)
[![Ko-fi](https://img.shields.io/badge/-Ko--fi-ff5e5a?logo=Ko-fi&logoColor=ffffff)](https://ko-fi.com/soywod)
[![Buy Me a Coffee](https://img.shields.io/badge/-Buy%20Me%20a%20Coffee-ffdd00?logo=Buy%20Me%20A%20Coffee&logoColor=000000)](https://www.buymeacoffee.com/soywod)
[![Liberapay](https://img.shields.io/badge/-Liberapay-f6c915?logo=Liberapay&logoColor=222222)](https://liberapay.com/soywod)
[![PayPal](https://img.shields.io/badge/-PayPal-0079c1?logo=PayPal&logoColor=ffffff)](https://www.paypal.com/paypalme/soywod)
