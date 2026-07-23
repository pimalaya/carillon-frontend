# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0]

### Added

- Added the login-less onboarding wizard: connect a mailbox, mint a capability link and store it in the browser, with no signup.
- Added the watches dashboard managing watches per account, with create, pause, resume and delete.
- Added the live delivery log streaming every signal and its webhook outcome over SSE.
- Added prepaid-credit billing: pack checkout, watch activation and auto-renew, surfacing the trial and paid watch-time counters.
- Added the client-side account switcher holding several login-less accounts side by side.
- Added the in-browser mock backend and synthetic SSE stream for offline UI development.
- Added the single static build served two ways: embedded same-origin by the daemon, or from a CDN, selected by the API base URL.
