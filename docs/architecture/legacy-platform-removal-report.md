# Legacy Platform Removal Report

## What Was Found

The repo contains historical general healthcare AI platform surfaces:

- Broad dashboards (`Dashboard`, analytics, predictive analytics, brain/business pages).
- Commercial/product/marketplace/organization pages.
- Fleet and live-tracking modules.
- Legacy `src/layout/AppShell.jsx`.
- Legacy route/navigation/command registries.
- Legacy calculators and clinical tools library.
- Tests and inventory scripts that still document those systems.

## What Was Moved

No broad legacy folders were moved. The legacy surface is large and intertwined with tests and inventory scripts, so moving it blindly is unsafe.

## What Was Merged

- Active Emergency OS runtime uses `src/components/AppShell.tsx`, not the legacy shell.
- Active whiteboard/detail/intake/calculator implementations use new Emergency OS TSX modules.

## What Was Archived

- Existing review folder `src/features/future-modules/_review` remains the archive target for future-module code.
- Separate app/package review candidates are documented in `archive/_review/README.md`.

## What Was Removed From Active Product

- Generic root/dashboard/app/workspace/mobile routes redirect to `/emergency/whiteboard`.
- Generic `/settings` redirects to `/emergency/settings`.
- `/emergency/tools` redirects to `/emergency/copilot`.
- Active route tree no longer mounts old general healthcare pages directly.

## Still Needs Manual Review

- Legacy pages under `src/pages/` should be moved gradually to `src/features/future-modules/_review/` or deleted after tests are updated.
- `src/layout/AppShell.jsx` and its CSS can be archived once no tests or reports require it.
- `src/config/routes.config.js`, `src/config/navigation.config.js`, and `src/config/commandPalette.config.js` should be reduced or archived after active registry replacements are finalized.
- Legacy service wrappers should be grouped under an Emergency OS API layer or moved to future modules.

## Risks

- Several tests assert legacy platform inventory. Removing files now would create large test churn.
- Some clinical calculator pages may still provide valuable shared clinical tooling and should be curated, not deleted wholesale.

## Commands Run

- Active route source review.
- Duplicate shell/whiteboard/patient/intake/calculator import searches.
- Navigation and command registry reads.

## Validation Result

Legacy product pages are no longer mounted by the active `src/App.jsx` route tree. Legacy code remains in repository for manual review and test-aware archiving.
