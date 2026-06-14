# Emergency OS Legacy Archive Report

Date: 2026-06-13

## Archive Decision

No files were moved or deleted in this pass. The repository had a broad dirty working tree and several legacy/general-platform surfaces still have tests, docs, or feature registry references. Moving them would have created unnecessary churn and risk.

## Safely Retired From Active Mount

The following were removed from active routing/nav/search/command/render inventory:

- `/emergency/pulse`
- `/emergency/journey`
- `/emergency/provincial-health`
- `/emergency/integrations`
- `/emergency/simulation`
- `/emergency/tools`
- `/emergency/shift`
- `/emergency/command-center`

The URLs remain as redirects through `src/config/routes.config.js`, with patient journey aliases resolving to `/emergency/patients` and other retired routes resolving to `/emergency/whiteboard`.

## Review Candidates

- `src/layout/AppShell.jsx` and legacy shell CSS/tests: stale relative to the active `src/components/AppShell.tsx` shell.
- Standalone clinical calculator/tool route assumptions: components are still usable from patient detail/copilot contexts, but `/emergency/tools` is not active.
- Workspace command-center and simulation docs/tests: retained as historical/general-platform material.
- Provincial Health and Integration Hub frontend/backend placeholder contracts: retained for future product decision.
- Older architecture docs that predate the 12-route Emergency OS target set.

## Recommended Follow-Up

Run a dedicated archive PR after product approval. That PR should either move stale shell/workspace artifacts into an explicit archive folder or update their tests/docs to mark them as historical examples rather than active product contracts.
