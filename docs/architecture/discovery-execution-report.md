# CareDroid Emergency OS Discovery Execution Report

## Scope

Discovery was performed against the actual repository state for the Emergency OS spine:

- Frontend shell: `src/App.jsx` and `src/components/AppShell.tsx`
- Navigation and route inventory: `src/config/routes.config.js`, `src/config/unified-navigation.config.ts`, `src/config/navigation.config.js`, `src/data/emergencyPageRenderInventory.js`
- Canonical frontend API facade: `src/services/emergencyOsApi.js`
- Shared frontend hook/store path: `src/hooks/useEmergencyOs.js`, `src/store/emergencyStore.ts`
- Backend module: `backend/src/modules/emergency-os/*`

No AppShell, router, broad layout, design-token, command-metric, or customer-copy architecture was changed.

## Active Spine Discovered

The active route tree is `CANONICAL_APP_ROUTE_TREE` and the concrete `AppRoutes` mount in `src/App.jsx`. Active Emergency OS pages are:

- `/emergency/whiteboard`
- `/emergency/patients`
- `/emergency/ems`
- `/emergency/intake`
- `/emergency/queues`
- `/emergency/reassessment`
- `/emergency/capacity`
- `/emergency/boarding`
- `/emergency/referrals`
- `/emergency/copilot`
- `/emergency/analytics`
- `/emergency/settings`

`src/components/AppShell.tsx` mounts shared workflow surfaces: patient detail panel, docked Copilot, command palette, EMS critical broadcast, and reassessment drawer.

## Classification Summary

- ACTIVE_AND_WIRED: whiteboard, patients, queues, reassessment, capacity, boarding, copilot, settings load/save, workflow logs, analytics, EMS intake, referrals, Smart Intake create/unknown.
- ACTIVE_BUT_DISCONNECTED before this pass: EMS backend arrivals, referral intelligence backend rows, analytics backend summary, Smart Intake create/unknown workflow, settings PATCH facade.
- BACKEND_ONLY: patient journey endpoint, provincial health connector, integration hub endpoint.
- FUTURE_MODULE: real-time simulation, federated learning, hybrid digital twin, research EMS/federated/LMECS/organizational twin controllers.
- FRONTEND_ONLY / local operational workflow: referral create/status mutation, manual Smart Intake link, external EMS fleet/diversion status.
- NEEDS_MANUAL_REVIEW: old emergency-specific services outside the canonical facade, future-module pages/components already under `_review`, duplicate legacy compatibility files retained for tests.

## Safe Fixes Executed

- Extended `src/services/emergencyOsApi.js` with canonical `PATCH /api/emergency/settings`.
- Updated `src/services/emergencySettingsApi.js` so active settings GET/PATCH delegates to the canonical Emergency OS facade.
- Extended `src/hooks/useEmergencyOs.js` hydration to normalize backend EMS arrivals, referral rows, and workflow logs into `useEmergencyStore`.
- Mounted `useEMSIntake()` in `src/components/EMSPipeline.jsx` so `/api/emergency/ems` hydrates visible inbound/handoff rows.
- Mounted `useReferrals()` in `src/components/ReferralPanel.jsx` so `/api/emergency/referrals` hydrates the visible referral queue.
- Replaced disabled Smart Intake session/create/unknown calls in `src/pages/emergency/SmartIntake.jsx` with canonical `/api/emergency/intake` and `/api/emergency/intake/vertical-slice`.
- Updated `src/store/emergencyStore.ts` analytics loading to call `/api/emergency/analytics` first and fall back to local state on failure.
- Added backend-derived analytics KPIs in `src/pages/emergency/EmergencyAnalytics.jsx`.
- Covered the new settings PATCH facade in `src/services/emergencyOsApi.test.js`.

## Files Changed

- `src/services/emergencyOsApi.js`
- `src/services/emergencySettingsApi.js`
- `src/hooks/useEmergencyOs.js`
- `src/components/EMSPipeline.jsx`
- `src/components/ReferralPanel.jsx`
- `src/pages/emergency/SmartIntake.jsx`
- `src/store/emergencyStore.ts`
- `src/pages/emergency/EmergencyAnalytics.jsx`
- `src/services/emergencyOsApi.test.js`
- `docs/architecture/*.md` reports in this pass

## Remaining Risks

- Research and advanced backend endpoints are intentionally documented as future/review instead of mounted into active navigation.
- Referral create/status actions remain local-first because the canonical Nest Emergency OS controller currently exposes `GET /api/emergency/referrals` but no canonical referral mutation endpoint.
- Smart Intake manual link remains a staff-confirmed local workflow because the canonical Nest controller exposes create/vertical-slice, not a link-existing-patient endpoint.
