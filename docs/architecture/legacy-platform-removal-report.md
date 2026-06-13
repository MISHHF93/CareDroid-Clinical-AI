# Legacy Platform Removal Report

## What Was Found

The repo contains historical general healthcare AI platform surfaces:

- Broad dashboards (`Dashboard`, analytics, predictive analytics, brain/business pages).
- Commercial/product/marketplace/organization pages.
- Fleet and live-tracking modules.
- Legacy `src/layout/AppShell.jsx`.
- Legacy route/navigation/command registries.
- Legacy calculators and clinical tools library.
- Older root-store EMS, queue, referral, and whiteboard panels.
- Tests and inventory scripts that still document those systems.

## What Was Moved

No broad legacy folders were moved. The legacy surface is large and intertwined with tests and inventory scripts, so moving it blindly is unsafe.

## What Was Merged

- Active Emergency OS runtime uses `src/components/AppShell.tsx`, not the legacy shell.
- Active whiteboard/detail/intake implementations use new Emergency OS TSX modules.
- Active EMS, queue, referral, copilot, analytics, boarding, and capacity routes now render from the active `src/store/emergencyStore.ts` path instead of root-store legacy panels.

## What Was Archived

- Existing review folder `src/features/future-modules/_review` remains the archive target for future-module code.
- Separate app/package review candidates are documented in `archive/_review/README.md`.

## What Was Removed From Active Product

- Generic root/dashboard/app/workspace/mobile routes redirect to `/emergency/whiteboard`.
- Generic `/settings` redirects to `/emergency/settings`.
- Legacy `/tools/*` aliases redirect into the active Emergency OS tools/whiteboard flow rather than mounting a duplicate legacy tools shell.
- Future-only `/emergency/federated-learning`, `/emergency/digital-twin`, and `/emergency/ai-governance` are no longer active mounts.
- `/emergency/pulse`, `/emergency/tools`, and `/emergency/shift` are active Emergency OS routes and first-class sidebar destinations.
- Active route tree no longer mounts old general healthcare pages directly.
- Conditional backend duplicate `/api/v1/governance` alias was removed.

## Still Needs Manual Review

- Legacy pages under `src/pages/` should be moved gradually to `src/features/future-modules/_review/` or deleted after tests are updated.
- `src/layout/AppShell.jsx` and its CSS can be archived once no tests or reports require it.
- `src/config/routes.config.js`, `src/config/navigation.config.js`, and `src/config/commandPalette.config.js` should be reduced or archived after active registry replacements are finalized.
- Legacy service wrappers should be grouped under an Emergency OS API layer or moved to future modules.
- Full frontend test failures should be triaged by retiring or rewriting tests that assert removed standalone calculator/platform routes.

## Risks

- Several tests assert legacy platform inventory. Removing files now would create large test churn.
- Some clinical calculator pages may still provide valuable shared clinical tooling and should be curated, not deleted wholesale.

## Commands Run

- Active route source review.
- Duplicate shell/whiteboard/patient/intake/calculator/import searches.
- Navigation and command registry reads.
- Typecheck, lint, build, focused frontend tests, full frontend test attempt, backend build/lint/tests.

## Validation Result

Legacy product pages are no longer mounted by the active `src/App.jsx` route tree. Typecheck, lint, build, focused active-route tests, backend build, backend lint, and backend tests pass. Full frontend tests still fail many legacy/audit expectations and hung after failure output, so legacy test cleanup remains manual review.
