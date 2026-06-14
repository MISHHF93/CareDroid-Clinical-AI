# P0/P1 Upgrades Applied

Date: 2026-06-14

## Summary

No P0 defects were found. One safe P1 upgrade was applied inside the existing active frontend router surface.

## Applied Upgrade Table

| Applied upgrade | Priority | Issue found | Why it matters | Files changed | Before state | After state | Validation result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Shared Emergency OS route state and freshness messaging | P1 | Inline route pages had shared data-source notes, loading states, and empty states, but source freshness did not distinguish current, aged, or stale operational data, and some non-error state containers were not announced as status regions. | Pilot users and first-customer demo viewers need to understand whether Patients, Queues, Reassessment, Capacity, Boarding, and Copilot are showing a live feed, walkthrough dataset, or stale local state before making operational judgments. | `src/App.jsx` | `DataSourceNote` displayed only source and clock time. `ApiStateBanner` loading/empty states and `PatientGrid` empty states were visually clear but did not consistently expose status semantics. | `DataSourceNote` now reports relative freshness, marks data stale after five minutes, and warns to validate before operational decisions. Shared loading/empty/empty-grid states now use `role="status"`. | PASS: `npm run typecheck:frontend`, `npm run lint`, `npm run build`, focused Vitest route/navigation tests, `scripts/verify-single-instance.ps1`, and IDE lints for `src/App.jsx`. Build completed with existing Vite chunk/import warnings. |

## Guardrails Preserved

- No new top-level route was added.
- No second AppShell, router, frontend app, backend module, or API convention was introduced.
- No backend files were changed.
- The upgrade uses existing route helpers already shared by active Emergency OS inline pages.
- No autonomous diagnosis, prescribing, disposition, staffing, diversion, or patient matching behavior was added.

## Files Changed

- `src/App.jsx`
- `docs/architecture/product-harness-inventory.md`
- `docs/architecture/product-upgrade-opportunities.md`
- `docs/architecture/p0-p1-upgrades-applied.md`
- `docs/architecture/platform-strengthening-report.md`
- `docs/architecture/harness-mode-validation.md`
