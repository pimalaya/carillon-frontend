---
cairn: tasks
change: i18n-string-extraction
---

Extract hardcoded English into `en.json` + `fr.json`, one area at a time. Each
box: pull the literals into keys, wire `useTranslation`, add the French side.

## Billing
- [ ] `features/billing/ServicesCard.tsx` (incl. the `Watch {protocol} …` line)
- [ ] `features/billing/CreditsCard.tsx`
- [ ] `features/billing/ActivateDialog.tsx`
- [ ] `features/billing/ActivateServiceButton.tsx`

## Onboarding
- [ ] `features/onboarding/stages/VerifyStage.tsx`
- [ ] `features/onboarding/stages/CommitStage.tsx`
- [ ] `features/onboarding/Stepper.tsx`
- [ ] Sweep the Identify / Authenticate stages for leftover literals

## Watches / services
- [ ] `features/watches/WatchDetail.tsx`
- [ ] `features/watches/DeleteServiceButton.tsx`

## Deliveries
- [ ] `features/deliveries/DeliveriesLog.tsx`

## Account / settings
- [ ] `features/account/SettingsPanel.tsx`

## Routes
- [ ] `routes/WelcomePage.tsx`
- [ ] `routes/VerifyPage.tsx`
- [ ] `routes/ServiceWizardPage.tsx`
- [ ] `routes/NotFoundPage.tsx`

## Shared components with copy
- [ ] `components/EmptyState.tsx`, `components/EventBadge.tsx`, `components/StatusBadge.tsx`, `components/LiveIndicator.tsx`

## Wrap-up
- [ ] Verify no user-facing literal remains outside `ui/` primitives and proper nouns
- [ ] `npm run typecheck` + `npm run build` + tests green
- [ ] Fold into the `i18n` spec if coverage becomes a stated requirement; add the log entry
