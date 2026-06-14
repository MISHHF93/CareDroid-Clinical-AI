# Product Harness Inventory

Date: 2026-06-14

## Scope

This harness-mode pass inspected and strengthened the active CareDroid Emergency OS product spine only. It did not add routes, backend surfaces, speculative AI modules, a second shell, a second router, or a new API convention.

Confirmed active spine:

- Frontend entry and router: `src/main.jsx` -> `src/App.jsx`
- Active shell: `src/components/AppShell.tsx`
- Active navigation: `src/config/unified-navigation.config.ts`
- Canonical `/emergency/*` routes: `src/App.jsx`, `src/pages/emergency/index.tsx`, and active emergency components
- Store/hook/API path: `src/store/emergencyStore.ts`, `src/hooks/useEmergencyOs.js`, `src/services/emergencyOsApi.js`
- Backend path: `backend/src/modules/emergency-os/emergency-os.controller.ts`

## Reports Read First

- `docs/architecture/active-system-map.md`
- `docs/architecture/final-one-system-validation.md`
- `docs/architecture/product-harness-inventory.md`
- `docs/architecture/product-harness-upgrade-report.md`
- `docs/architecture/emergency-os-ai-ml-backend-frontend-wiring-report.md`

## Active Source Inspected

| Area | Source | Current finding |
| --- | --- | --- |
| App spine | `src/App.jsx` | Single active router with canonical Emergency OS route guards, inline route pages, shared `ApiStateBanner`, `PatientGrid`, `MetricGrid`, and `DataSourceNote`. |
| Shell | `src/components/AppShell.tsx` | Single active shell owns header, sidebar, command palette, patient detail, EMS broadcast, reassessment drawer, and Copilot panel. |
| Navigation | `src/components/Sidebar.tsx`, `src/config/unified-navigation.config.ts`, `src/config/routes.config.js` | Pilot visible navigation is centralized and role-filtered; analytics/settings remain retained direct routes. |
| Whiteboard | `src/pages/emergency/index.tsx` | Current state already includes prior P1 operational summary, EMS freshness, reassessment burden, and patient-card improvements. |
| Patients/cards | `src/components/PatientCard.tsx`, `src/components/PatientCard.css` | Current state already includes richer patient-card assistive context and improved action targets. |
| Inline operational pages | `src/App.jsx` | Patients, Queues, Reassessment, Capacity, Boarding, and Copilot shared state banners, but source freshness wording was too weak for pilot operations. |
| EMS flow | `src/components/EMSPipeline.jsx` | Active EMS flow has role-aware actions, fallback messaging, offload target awareness, and arrival timing. |
| Smart Intake | `src/pages/emergency/SmartIntake.jsx` | Active intake flow preserves human verification and local safeguarded completion if backend confirmation is unavailable. |
| Referral flow | `src/components/ReferralPanel.jsx` | Active referral workflow is role-aware and status-driven with patient search and response notes. |
| Analytics/settings | `src/pages/emergency/EmergencyAnalytics.jsx`, `src/pages/emergency/EmergencySettings.jsx` | Current state surfaces governance, upgrade-harness, audit, and operational fallback status. |
| Backend | `backend/src/modules/emergency-os/emergency-os.controller.ts` and adjacent service files | No new backend P0 found from this pass; no backend file changed. |

## Inventory Summary

| Priority | Count | Decision |
| --- | ---: | --- |
| P0 | 0 | No blocking one-system, routing, backend, or runtime issue found in the inspected active spine. |
| P1 | 1 | Applied one safe shared frontend upgrade in `src/App.jsx`. |
| P2 | 9 | Deferred because each needs broader design, behavior, fixture, or backend decisions. |
| P3 | 5 | Documented as polish/tooling backlog only. |
