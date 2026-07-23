---
cairn: tasks
change: capability-link-as-session
---

- [x] Replace the Settings "Capability link" card with a "Signed in as <email>" identity panel (no token, no copy button)
- [x] Drop the now-unused `maskLink` / `CopyButton` / link imports from SettingsPanel
- [x] Update the Sign-out card copy (no "removes the link" framing needed, but harmless)
- [x] Reword `lib/auth.ts` header comment: session token, not login-less D§5 credential
- [x] Fold the delta into `spec/principles.md` (Login-less) and `spec/accounts.md`
- [x] `npm run typecheck` + `npm run build` + tests green
- [x] Add the log entry and set status: landed
