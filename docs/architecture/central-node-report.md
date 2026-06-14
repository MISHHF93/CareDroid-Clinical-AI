# Central Node Report

Date: 2026-06-13

## Contract

`CareDroidCentralNode` is the single operational snapshot for Emergency OS. It aggregates patient flow, queues, EMS pressure, capacity, boarding, reassessments, referrals, alerts, settings, role context, screen mode, sync status, and ED Copilot safety posture.

## Frontend Wiring

- Source contract: `src/central-node/careDroidCentralNode.ts`.
- React hook: `src/hooks/useCareDroidCentralNode.ts`.
- Store source: `src/store/emergencyStore.ts`.
- API refresh source: `src/services/emergencyOsApi.js` using `/api/emergency/central-node/snapshot`.
- Rendered consumers: `src/components/Header.tsx` and `src/pages/emergency/index.tsx`.

## Backend Wiring

- Service: `CareDroidCentralNodeService` in `backend/src/modules/emergency-os/emergency-os.services.ts`.
- Endpoint: `GET /api/emergency/central-node/snapshot`.
- Module registration: `backend/src/modules/emergency-os/emergency-os.module.ts`.

## Screen Modes

Canonical screen modes are `TRIAGE_SCREEN`, `REGISTRATION_SCREEN`, `CHARGE_NURSE_SCREEN`, `PHYSICIAN_SCREEN`, `EMS_SCREEN`, `COMMAND_CENTER_DISPLAY`, `WAITING_ROOM_DISPLAY`, `ADMIN_SCREEN`, and `READ_ONLY_DISPLAY`.

## Remaining Gaps

The backend central snapshot is fixture/in-memory backed. Durable event persistence and production integrations remain blocked on database, credential, and clinical governance approvals.
