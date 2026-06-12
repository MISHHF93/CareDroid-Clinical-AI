# Frontend Backend Connection Report

Generated: 2026-06-12

Scope: Prompt 4. Safe backend connections only. Optional or runtime-gated APIs were not wired as production dependencies.

## Connections Fixed

| Flow | Before | After |
| --- | --- | --- |
| Whiteboard quick intake -> patient backend | Store-only create. | `addPatient` now non-blockingly syncs to `POST /api/patients` through `createEmergencyPatientRecord`. |
| Patient journey state changes -> patient backend | Store-only move/discharge/update. | `updatePatient`, `movePatientToState`, and `dischargePatient` now non-blockingly sync to `PATCH /api/patients/:patientId` through `updateEmergencyPatientRecord`. |
| Smart Intake final actions -> visible UI patient | Backend final actions could fail or succeed without creating a visible Emergency OS patient. | Create/unknown/send-to-triage actions create a visible triage patient in the Emergency OS store and navigate to patients. |
| Referral create -> backend | UI attempted disabled `/api/emergency/referrals`. | Referral create now posts to active Nest `POST /api/referrals`, and `emergencyReferralPersistence` is marked real. |

## Active Page Trace

| Page | Frontend path | API status |
| --- | --- | --- |
| Whiteboard / Patients | `EmergencyWhiteboard -> emergencyStore -> patientManagementApi` | Create/update/detail/search connected. List hydration remains store-first. |
| Smart Intake | `SmartIntake -> SmartIntakeApi + emergencyStore` | Backend session/final actions connected when optional runtime is available; local visible patient fallback now connected. |
| EMS | `EMSPipeline -> emergencyTransportApi` | Fleet snapshot uses labeled demo backend. Optional `/api/ems/*` remains runtime-gated and not promoted. |
| Queues | `QueueIntelligencePanel -> emergencyStore/emergencyAnalyticsApi` | Store-first with analytics fallback. No stable queue API found. |
| Reassessment | `EmergencyReassessmentRoute -> emergencyStore` | Store-connected and selector-aligned. Optional `/api/reassessment/*` remains runtime-gated. |
| Capacity | `EmergencyCapacityRoute -> emergencyStore` | Store-connected. Optional `/api/capacity/dashboard` shape differs and remains runtime-gated. |
| Boarding | `EmergencyCapacityRoute variant=boarding -> emergencyStore` | Store-derived; no dedicated stable backend endpoint found. |
| Referrals | `ReferralPanel -> emergencyStore -> emergencyTransportApi` | Create connected to `POST /api/referrals`; transfer workflow remains unavailable because no stable endpoint exists. |
| Copilot | `ChatInterface -> clinicalChatService -> /api/chat/message` | Connected to stable chat API. |
| Analytics | `EmergencyAnalytics -> emergencyStore -> emergencyAnalyticsApi` | Local fallback; no stable emergency analytics aggregate found. |
| Settings | `EmergencySettings/FeatureManagement -> emergencySettingsApi/featureStore` | Mostly connected to real or labeled demo settings/integration/protocol APIs. |

## Remaining Backend Decisions

- Pick one canonical production source for patient list hydration.
- Do not wire runtime-gated Mongoose EMS/reassessment/capacity APIs as production paths until the backend mode is chosen.
- Transfer workflow needs a stable backend endpoint before removing local fallback behavior.
