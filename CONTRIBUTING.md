# Contributing guide

Thank you for investing your time in contributing to Carillon.

Whether you are a human or an AI agent, read these in order before touching the code:

1. the [Pimalaya README](https://github.com/pimalaya) for what the project is and how its repositories stack;
2. the [Pimalaya CONTRIBUTING](https://github.com/pimalaya/.github/blob/master/CONTRIBUTING.md) guide, which chains to the shared architecture and guidelines;
3. the [cairn/](./cairn) folder, which follows the [Cairn](https://github.com/pimalaya/cairn) convention: spec/ is the current design of this dashboard, changes/ holds in-flight proposals, and log/ the dated history. AGENTS.md at the root is the activation stanza.
4. the sibling carillon-backend cairn/ folder for the product design this UI implements.

Everything below documents only what differs from the Pimalaya standards.

## A TypeScript SPA, not a Rust crate

This repository is a Vite, React and TypeScript single-page app, not a Rust crate: it publishes no rustdoc, ships no Cargo.toml or deny.toml, and the crate-oriented rules (lib.rs header, no-std, public-item naming) do not apply. It builds to one static bundle in dist/, served same-origin by carillon-backend or from a CDN.

## Node toolchain

Development runs through npm: `npm install` once, then `npm run dev` for the dev server, `npm run typecheck` for the type checks, `npm run test` for the unit tests, and `npm run build` for the production bundle. The Nix flake provides a devshell with the pinned Node, and its packages.default builds the static bundle reproducibly.

## Client of a contract

The dashboard is a pure client of the carillon-backend control API. Screens are typed against that server's OpenAPI contract at ../backend/openapi.yaml; behavioural correctness is verified against it rather than assumed. An in-browser mock backend backs offline UI work.
