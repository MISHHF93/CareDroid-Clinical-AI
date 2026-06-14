# Artifact Consolidation Report

Date: 2026-06-14

## Consolidation Decision

This pass consolidated by alignment, not by broad moves. The repository is dirty and contains retained review/future artifacts, so only low-risk active registries and active UI wiring were changed.

## Applied Consolidations

| Area | Issue | Action | Files |
| --- | --- | --- | --- |
| Backend capability registry | Active `/api/emergency/queues` and `/api/emergency/capacity` were labeled with optional analytics/dashboard capabilities, while optional `/capacity/dashboard`, `/capacity/history`, and `/queues/analytics` are not mounted. | Added explicit `emergencyQueues` and `emergencyCapacity` demo capabilities, kept optional dashboard/history/analytics routes disabled, and updated inventory rows. | `src/config/backendApiCapabilities.js`, `src/config/backendApiCapabilities.test.js`, `src/data/frontendApiCallsInventory.js` |
| Vital DTO shape | EMS and referral UI helpers handled legacy vital field names inconsistently with current `Patient` vitals arrays. | Normalized current and legacy vital keys locally in existing UI helpers. | `src/components/EMSPipeline.jsx`, `src/components/ReferralPanel.jsx` |
| Analytics data shape | Store fallback produced a thinner shape than the active analytics page renders. | Harmonized store fallback with active chart expectations while preserving richer backend `operationalCommand` data. | `src/store/emergencyStore.ts` |
| Integration and provincial surfaces | Backend module endpoints existed but active UI mostly showed config controls. | Rendered existing backend envelope status in existing Settings sections. | `src/pages/emergency/EmergencySettings.jsx` |

## Left In Place

| Artifact group | Reason left in place |
| --- | --- |
| `src/layout/AppShell.jsx` | Retained compatibility/test helper and legacy layout artifact. Active runtime uses `src/components/AppShell.tsx`; moving this in a dirty tree could break existing tests and reports. |
| `src/config/navigation.config.js` and `src/navigation/primaryNavigation.js` | Compatibility projections derive from `unified-navigation.config.ts`; existing tests assert this relationship. |
| Future/review pages under `src/features/future-modules/_review/` | Already archived in the allowed review location. |
| Legacy platform dashboards in `src/pages/` | Many are retained by route/config audits and product inventory. Broad moves require a separate cleanup plan. |
| Mobile/Android residue | Not touched because no active Emergency OS runtime import required removal and deletion would be risky. |
| Optional API clients for disabled endpoints | Left in guarded form because capability flags prevent calls and tests cover disabled status. |

## Removed Or Archived

No files were removed or moved in this pass. No uncertain artifact was archived because the allowed review folders already contain major future-module artifacts, and further movement was not clearly safe.

## Duplicate-System Check

- No second app was created.
- No second `AppShell` was introduced.
- No second router was introduced.
- No second backend API convention was introduced.
- No speculative future module was added.
