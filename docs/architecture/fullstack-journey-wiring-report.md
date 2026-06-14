# Fullstack Journey Wiring Report

Generated: 2026-06-14

## Frontend Wiring

The active frontend uses `src/services/emergencyOsApi.js` as the canonical Emergency OS API facade and `src/hooks/useEmergencyOs.js` as the route-level module hook layer. Module responses hydrate `src/store/emergencyStore.ts` through `hydrateFromApi`.

Active routes in `src/App.jsx` render Whiteboard, Patients, EMS, Smart Intake, Queues, Reassessment, Capacity, Boarding, Referrals, Copilot, Medical Tools, Analytics, and Settings through the one AppShell.

## Backend Wiring

The active backend controller is `EmergencyOsController`, mounted under `/api/emergency/*`:

- `/api/emergency/central-node/snapshot`
- `/api/emergency/whiteboard`
- `/api/emergency/patients`
- `/api/emergency/journey`
- `/api/emergency/ems`
- `/api/emergency/intake`
- `/api/emergency/intake/vertical-slice`
- `/api/emergency/queues`
- `/api/emergency/reassessment`
- `/api/emergency/capacity`
- `/api/emergency/boarding`
- `/api/emergency/referrals`
- `/api/emergency/provincial-health`
- `/api/emergency/integrations`
- `/api/emergency/copilot`
- `/api/emergency/analytics`
- `/api/emergency/settings`

## Capability Status

`src/config/backendApiCapabilities.js` marks Emergency OS core endpoints as demo-backed but enabled. Disabled optional surfaces include capacity history, queue analytics, shift report export, Smart Intake identity-session subroutes, referral history, transfer workflow, and diversion status.

## Data Flow

Backend module envelope -> `emergencyOsApi` -> `useEmergencyOs` module hook -> `hydrateFromApi` -> `emergencyStore` -> AppShell/Header/Whiteboard/Patient cards/Queues/Referrals/Capacity/Copilot.

## Safe Wiring Applied

The Queues UI now merges backend queue rows with local journey queue rows for referral and discharge-ready work. The central node queue snapshot now reports referral/discharge/reassessment queues from the existing store model.

## Backend Not Modified

No backend route or controller was changed in this pass. The new queue visibility is frontend/central-node contract wiring over existing patient/referral state.
