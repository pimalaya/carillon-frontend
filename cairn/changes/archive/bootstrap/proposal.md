---
cairn: change
id: bootstrap
status: landed
created: 2026-07-23
---

# Adopt Cairn and migrate the docs/ folder

## Why
The dashboard's architecture and build history lived in a `docs/` folder whose `PLAN.md` was a build-from-scratch plan (now stale) and whose `STATUS.md` mixed the current state with a running log of what landed and was later reverted. Cairn keeps those apart: a living spec for current truth, reviewable change proposals, and a dated log for history.

## What
Create a `cairn/` root at the repository root. Seed the spec from the current state in `docs/STATUS.md` (2026-07-22, which supersedes the stale `PLAN.md`) as one capability per area, keeping only current truth. Fold the dated build history into the log, including the reverted subscription-billing detour so history stays honest. Add the Cairn activation files and the verify hook so agents follow the convention here. Remove the old `docs/` folder and update the README and CONTRIBUTING references.
