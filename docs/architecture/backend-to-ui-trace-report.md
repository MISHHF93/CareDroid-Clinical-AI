# Backend To UI Trace Report

Generated: 2026-06-12

## Executive Summary

The active Emergency OS UI is pilot-visible, but most Emergency OS backend endpoints are not the primary source for rendered data. The UI mostly flows through `useEmergencyStore`, local fixtures, and demo-capability API clients. This is acceptable for an internal demo, but it is the largest revenue-readiness blocker for a real pilot customer.

## Endpoint Trace

| Area | Endpoint | Backend chain | Frontend consumer | Reaches rendered UI | Classification |
| --- | --- | --- | --- | --- | --- |
| Capacity | `GET /api/capacity/dashboard` | `capacity.routes.ts -> capacityService.getCapacityDashboard -> Patient model` | None | No | API Not Consumed, Duplicate Logic |
| ED Copilot | `POST /api/copilot/query` | `copilot.routes.ts -> copilotService.processQuery -> Patient/capacity/reassessment/ems services` | None; active chat uses `/api/chat/message` | No | API Not Consumed, Duplicate Logic |
| EMS | `POST /api/ems/alert` | `ems.routes.ts -> emsService.createPrehospitalAlert -> Patient model -> socket emit` | None | No | API Not Consumed, Event Not Subscribed |
| EMS | `PATCH /api/ems/status/:emsUnitId` | `ems.routes.ts -> emsService.updateEMSStatus -> Patient model` | None | No | API Not Consumed |
| EMS | `POST /api/ems/arrive/:emsUnitId` | `ems.routes.ts -> emsService.confirmArrival -> Patient model -> socket emit` | None | No | API Not Consumed, Event Not Subscribed |
| EMS | `GET /api/ems/incoming` | `ems.routes.ts -> emsService.getIncomingEMS -> Patient model` | None; EMS UI uses store and fleet snapshot client | No | API Not Consumed, Duplicate Logic |
| Smart Intake | `POST /api/emergency/intake/sessions` | `smart-intake.routes.ts -> smartIntakeService.createSession -> SmartIntakeSession model` | `SmartIntakeApi.createSession` | Partial: session/status text | Broken State Flow |
| Smart Intake | `POST /api/emergency/intake/:id/manual-entry` | `smartIntakeService.addManualEntry -> SmartIntakeSession` | Client method exists | No | API Not Consumed |
| Smart Intake | `POST /api/emergency/intake/:id/documents` | `smartIntakeService.addDocument -> SmartIntakeSession/OCR` | Client method exists | No | API Not Consumed |
| Smart Intake | `POST /api/emergency/intake/:id/ocr-results` | `smartIntakeService.ingestOcrResult -> textMining/OCR` | Client method exists | No | API Not Consumed |
| Smart Intake | `POST /api/emergency/intake/:id/match` | `smartIntakeService.match -> mpiService -> Patient model` | Client method exists | No | API Not Consumed |
| Smart Intake | `POST /api/emergency/intake/:id/verify-field` | `smartIntakeService.verifyField -> SmartIntakeSession` | Client method exists | No | API Not Consumed |
| Smart Intake | `POST /api/emergency/intake/:id/link-patient` | `smartIntakeService.linkPatient -> Patient model` | `SmartIntake` final action | Partial: visible status | Broken State Flow |
| Smart Intake | `POST /api/emergency/intake/:id/create-patient` | `smartIntakeService.createPatient -> Patient model` | `SmartIntake` final action | Partial: visible status | Broken State Flow |
| Smart Intake | `POST /api/emergency/intake/:id/continue-unknown` | `smartIntakeService.continueUnknown -> Patient model` | `SmartIntake` final action | Partial: visible status | Broken State Flow |
| Smart Intake | `POST /api/emergency/intake/:id/ems-evidence` | `smartIntakeService.addEMSEvidence -> SmartIntakeSession` | None | No | API Not Consumed |
| Smart Intake | `POST /api/emergency/intake/:id/reconcile-unknown` | `smartIntakeService.reconcileUnknown` | None | No | API Not Consumed |
| Smart Intake | `POST /api/emergency/intake/:id/biometric-consent` | `smartIntakeService.captureBiometricConsent` | None | No | API Not Consumed |
| Smart Intake | `POST /api/emergency/intake/:id/biometric-consent/withdraw` | `smartIntakeService.withdrawBiometricConsent` | None | No | API Not Consumed |
| Smart Intake | `GET /api/emergency/intake/:id/audit-log` | `smartIntakeService.getAuditLog` | None | No | API Not Consumed |
| Reassessment | `GET /api/reassessment/due` | `reassessment.routes.ts -> reassessmentService.getPatientsNeedingReassessment -> Patient model` | None; UI uses store flags | No | API Not Consumed, Duplicate Logic |
| Reassessment | `POST /api/reassessment/:patientId/reassess` | `reassessmentService.reassessPatient -> Patient model` | None | No | API Not Consumed |
| Reassessment | `POST /api/reassessment/:patientId/dismiss` | `reassessmentService.dismissReassessment -> Patient model` | None | No | No Return Value, API Not Consumed |
| Platform patients | `GET /api/patients/:id/workspace`, timeline, scores, care-plan | `PlatformSystemsService demo contracts` | `patientManagementApi` | Yes: patient detail tabs | Legacy Artifact, Demo Data |
| Referrals platform | `GET/POST /api/referrals` | `PlatformSystemsController` in-memory list | Not current `ReferralPanel` path | No | Broken State Flow |

## Conditional Backend Runtime

The Express Emergency OS routers are conditionally mounted in `backend/src/main.ts` when `ENABLE_MONGOOSE_EMERGENCY_OS === 'true'`. If this is off, the active UI falls back to local/demo state and these endpoints are not available.

## Revenue Blockers

- Canonical backend source of truth is not established for whiteboard, EMS, reassessment, capacity, boarding, referrals, or copilot.
- Socket events from EMS routes are emitted, but the frontend has no matching Socket.IO room subscription.
- Smart Intake backend evidence/matching endpoints exist but do not populate the visible review panels.

## Safe Fixes Already Applied

- Backend route error semantics were hardened in the prior trace (`400`/`404`/`409` instead of generic `500` for expected failures).
- Smart Intake final actions now call backend methods and show visible failure/pending status.
- EMS/referral/settings async failures now surface visible unavailable/error state.
