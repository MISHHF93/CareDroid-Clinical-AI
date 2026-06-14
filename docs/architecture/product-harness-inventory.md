# Product Harness Inventory

Date: 2026-06-14

## Scope

This product-harness pass inspected and strengthened only the active CareDroid Emergency OS platform. It did not add routes, backend modules, speculative AI products, another `AppShell`, another router, or another API convention.

Confirmed active spine:

- Frontend entry and router: `src/main.jsx` -> `src/App.jsx`
- Active shell: `src/components/AppShell.tsx`
- Active navigation: `src/config/unified-navigation.config.ts`
- Canonical `/emergency/*` routes: `src/App.jsx`, `src/pages/emergency/index.tsx`, and active Emergency OS components
- Store/hook/API path: `src/store/emergencyStore.ts`, `src/hooks/useEmergencyOs.js`, `src/services/emergencyOsApi.js`
- Backend path and API convention: `backend/src/modules/emergency-os/` under `/api/emergency/*`

## Reports Read First

- `docs/architecture/active-system-map.md`
- `docs/architecture/one-repository-system-audit.md`
- `docs/architecture/master-harmonization-report.md`
- `docs/architecture/hidden-duplication-report.md`
- `docs/architecture/duplicate-system-cleanup-report.md`
- `docs/architecture/integration-report.md`
- `docs/architecture/emergency-os-ai-ml-backend-frontend-wiring-report.md`
- `docs/architecture/pilot-readiness-report.md`
- `docs/architecture/product-harness-final-validation.md`
- `docs/architecture/platform-strengthening-report.md`

## Active Source Inspected

| Area | Source | Current finding |
| --- | --- | --- |
| App spine | `src/App.jsx` | Single active router with canonical Emergency OS route guards and shared inline route helpers. |
| Shell | `src/components/AppShell.tsx` | Single active shell owns header, sidebar, command palette, patient detail panel, EMS broadcast, reassessment drawer, and Copilot panel. |
| Navigation | `src/components/Sidebar.tsx`, `src/config/unified-navigation.config.ts`, `src/config/routes.config.js` | Pilot navigation is centralized, role-filtered, and still points to one Emergency OS route family. |
| Whiteboard | `src/pages/emergency/index.tsx`, `src/components/EmergencyWhiteboard.css` | Current state already includes operational summary, EMS/reassessment/capacity visibility, responsive grid/list behavior, and patient-card readability upgrades. |
| Patients/cards | `src/components/PatientCard.tsx`, `src/components/PatientCard.css`, `src/components/PatientDetailPanel.tsx` | Patient card and detail panel already expose risk flags, vitals, timeline, workflow actions, role-aware controls, and audit/timeline context. |
| EMS flow | `src/components/EMSPipeline.jsx` | Safe P1 applied: EMS rows now display existing `sbp/dbp` or legacy BP vital fields. |
| Smart Intake | `src/pages/emergency/SmartIntake.jsx` | Existing flow preserves human identity verification, role gating, safeguarded local completion, and vertical-slice backend hydration. |
| Queue/reassessment/capacity/boarding | `src/App.jsx`, `src/hooks/useEmergencyOs.js` | Existing pages use shared API state banners, fallback store data, and canonical `/api/emergency/*` hooks. |
| Referral flow | `src/components/ReferralPanel.jsx` | Safe P1 applied: referral clinical summaries now use the latest existing vitals array/object and support current vital keys. |
| Analytics | `src/pages/emergency/EmergencyAnalytics.jsx`, `src/store/emergencyStore.ts` | Safe P1 applied: analytics fallback now supplies chart-ready daily volume, hourly arrivals, wait trend, top complaints, and richer shift KPIs. |
| Settings/audit | `src/pages/emergency/EmergencySettings.jsx` | Safe P1 applied: Settings now surface central node, screen modes, thresholds, workflow audit, local audit export, AI governance status, Integration Hub runtime status, and Provincial Health connector status. |
| Backend | `backend/src/modules/emergency-os/` | Existing Nest module owns active `/api/emergency/*` contracts. No backend P0 found and no backend file changed. |

## Inventory Summary

| Priority | Count | Decision |
| --- | ---: | --- |
| P0 | 0 | No blocking one-system, route, API, shell, or runtime defect found in the inspected active spine. |
| P1 | 5 | Applied five safe upgrades inside existing EMS, referral, analytics, capability inventory, and Settings surfaces. |
| P2 | 12 | Deferred because each needs broader workflow, governance, integration, fixture, or design decisions. |
| P3 | 5 | Documented as future polish/tooling only. |
