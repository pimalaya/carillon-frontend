---
cairn: spec
capability: billing
status: current
---

# Billing

Billing is a **prepaid credit pool** per Carillon account, not a subscription. Users buy credit packs, and services spend from the pool when activated or extended. The billing page mirrors the dashboard grid.

### Requirement: Credit pool
The account SHALL hold a single prepaid credit pool, per Carillon account, from which services spend when activated or extended. There SHALL be no subscription.

### Requirement: Buy packs
The billing page SHALL show the pool balance and offer credit packs, buying one via a provider (Stripe) Checkout redirect whose session is tied to the active account through its capability link, so payment stays stateless on the client.

### Requirement: Free credit
The first service on a Carillon account SHALL run free for 7 days, surfaced as the free-credit grant at sign-in (see [[accounts]]).

### Requirement: Billing layout
The billing page SHALL mirror the dashboard grid: services wide on the left, the credit card on the right.
