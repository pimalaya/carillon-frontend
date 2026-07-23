---
cairn: change
id: i18n-string-extraction
status: active
created: 2026-07-23
---

# Extract the remaining hardcoded English strings into i18n

## Why
The interface is only partly localised. Of ~60 component and route files, ~14 call `useTranslation`; the rest either are generic `ui/` primitives with no copy (fine) or still hold hardcoded English literals. A French user meets English text across billing, onboarding, deliveries, settings, and several routes. This fulfils the standing "Incremental extraction" requirement in the `i18n` capability, closing the gap in one deliberate pass rather than opportunistically.

## What
Move the user-facing English literals in the feature and route files below into the shared `src/i18n/locales/en.json` / `fr.json` key structure, keyed under the existing section groups (billing, onboarding, deliveries, settings, watches, header, …). Add French translations alongside every new key. Leave the `ui/` primitives alone (no product copy), and leave proper nouns (IMAP, CardDAV, Carillon) as literals.

Out of scope: no visual or behavioural change; keys and copy only. Files that already use `useTranslation` should also be swept for stray literals as they are touched.
