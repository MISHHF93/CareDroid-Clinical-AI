# Mobile Emergency Integration Gap Report

Generated: 2026-06-12

Mode: inventory only. No implementation files were created or modified.

## Scope

This report compares the current CareDroid repository against the proposed mobile emergency integration artifacts:

- `backend/src/services/aml.service.ts`
- `backend/src/services/android-els.service.ts`
- `backend/src/services/ios-emergency.service.ts`
- `backend/src/services/iot-alarm.service.ts`
- `backend/src/api/mobile-emergency.routes.ts`

## Executive Summary

The proposed mobile emergency integration layer is not currently implemented. The repository has reusable foundations for generic notifications, demo Medical IoT telemetry, simulated emergency escalation, optional Emergency OS Mongoose models, and basic FHIR normalization. It does not yet have production-grade ingestion for AML, Android ELS, Apple Emergency SOS/Medical ID, Samsung Health/Galaxy Watch, HealthKit, wearable alarms, or mobile emergency alert lifecycle management.

The proposed artifacts should not be implemented literally yet because they reference missing models and clinical workflows:

- `EmergencyAlert`
- `Hospital`
- `WearableDataRecord`
- emergency contact / next-of-kin records
- device-patient pairing records
- mobile consent records
- alert lifecycle and audit models
- external partner authentication/verification
- SMS/telephony delivery provider

## Artifact Gap Matrix

| Proposed artifact | Current status | Existing reusable pieces | Missing dependencies |
| --- | --- | --- | --- |
| `aml.service.ts` | Absent | Optional Mongoose `Patient` model; FHIR normalization helper; Emergency OS route bootstrap pattern | AML model/entity, `EmergencyAlert`, hospital geospatial model, carrier/PSAP auth, AML parser tests, consent/audit policy |
| `android-els.service.ts` | Absent | Android native app exists; notification stack exists; FCM service exists | ELS partner endpoint contract, Android location permissions, Health Connect/body sensor support, Android emergency opt-in records, location ingestion model |
| `ios-emergency.service.ts` | Absent | Generic notification and patient APIs | No HealthKit/Medical ID/Apple emergency entitlement, no iOS app surface, no emergency contact model, no medical ID import policy |
| `iot-alarm.service.ts` | Absent | Demo telemetry module, `DeviceAlert` demo type, Medical IoT dashboard | Wearable ingestion boundary, device pairing, trend storage, alarm rule persistence, clinical validation, EMS dispatch integration |
| `mobile-emergency.routes.ts` | Absent | Express router pattern under `backend/src/api`, Nest controller pattern | Auth, rate limiting, signature validation, schema validation, event persistence, whiteboard integration, audit trail |

## Existing Relevant Backend Pieces

| Area | File(s) | Status | Notes |
| --- | --- | --- | --- |
| Demo Medical IoT telemetry | `backend/src/modules/telemetry/telemetry.controller.ts`, `telemetry.types.ts`, `telemetry.data.ts` | Partially implemented demo | Routes return explicit demo envelopes: “Not live patient telemetry” and “Not a clinical alarm source.” |
| Generic emergency notification | `backend/src/modules/notifications/services/notification.service.ts` | Implemented generic push path | `sendEmergencyNotification()` sends `NotificationType.EMERGENCY` with high priority through FCM-backed notification service. |
| Notification preferences | `backend/src/modules/notifications/entities/notification-preference.entity.ts` | Implemented | Includes `emergencyAlerts`, `pushEnabled`, `emailEnabled`, `smsEnabled`; SMS is preference only, not a provider integration. |
| Notification entity | `backend/src/modules/notifications/entities/notification.entity.ts` | Implemented | Includes `fcmMessageId` and `apnsMessageId`, but backend service path observed is FCM-centric. |
| Emergency escalation | `backend/src/modules/medical-control-plane/emergency-escalation/emergency-escalation.service.ts` | Simulated | 911, medical director, paging, and rapid response actions are placeholders with `simulationMode: true`. |
| Optional Emergency OS Patient model | `backend/src/models/Patient.ts` | Optional runtime | Used by gated Mongoose Emergency OS routes; not the canonical active UI data source today. |
| Smart Intake model | `backend/src/models/SmartIntake.ts` | Optional runtime | Could be a future ingestion-review pattern, but does not model mobile emergency event lifecycle. |
| FHIR helper | `backend/src/services/fhir.service.ts` | Minimal | Normalizes patient snapshots only; no SMART launch or Android FHIR SDK integration. |

## Existing Relevant Frontend / Native Pieces

| Area | File(s) | Status | Notes |
| --- | --- | --- | --- |
| Medical IoT dashboard | `src/pages/MedicalIotDashboard.jsx`, `src/services/medicalIotService.js` | Demo/future module | Consumes demo telemetry routes and local fallback; not an emergency ingestion workflow. |
| Emergency OS whiteboard | `src/components/EmergencyWhiteboard.jsx`, `store/emergencyStore.ts` | Active UI | Store-backed; no mobile alert ingestion subscription. |
| Android app | `android/` | Partial/stale | Has native project, but contracts are not aligned with current backend in several areas. |
| Android manifest | `android/app/src/main/AndroidManifest.xml` | Missing emergency sensor/location permissions | Has internet/network/camera/audio/wake/vibration/foreground/notifications/biometric. Does not declare fine/coarse/background location, body sensors, Bluetooth, Health Connect, or FCM service declaration in the inspected manifest. |
| Android FCM service | `CareDroidMessagingService.kt` | Partial | Handles messages/channels, but token backend registration is TODO and the service was not declared in the inspected manifest. |

## Integration Inventory

| Integration | Current implementation status | Evidence |
| --- | --- | --- |
| Advanced Mobile Location (AML) | Absent | No AML parser/service/route found. |
| Android Emergency Location Service (ELS) | Absent | No ELS service/route/partner contract found. |
| Apple Emergency SOS | Absent | No Apple emergency ingestion, entitlement, or iOS app service found. |
| Apple Medical ID | Absent | No Medical ID import model or API found. |
| Apple HealthKit | Absent | No HealthKit runtime found. |
| Samsung Health | Absent | No Samsung Health runtime found. |
| Galaxy Watch / Wear OS | Absent | No wearable vendor ingestion found. |
| Health Connect / Android health sensors | Absent | No native permissions/dependencies found in inspected files. |
| Medical IoT telemetry | Demo only | Backend telemetry routes explicitly label data as demo/not clinical alarm source. |
| FHIR / HL7 / EHR | Demo/readiness only | Platform systems/interoperability surfaces are demo or synthetic readiness contracts. |
| Notifications / FCM | Partially implemented | Backend notification module, Firebase service, Android FCM class exist; token registration and emergency contact routing are incomplete. |
| SMS emergency contact notification | Absent | `smsEnabled` preference exists, but no SMS/Twilio provider path found. |
| Emergency escalation dispatch | Simulated | Escalation service logs placeholders and returns `simulationMode: true`. |

## Critical Missing Domain Models

Before implementation, these domain models/entities need to be designed:

- `MobileEmergencyAlert` or `EmergencyAlert`
- `EmergencyAlertEvent` / lifecycle audit log
- `Hospital` / receiving facility geospatial entity
- `WearableDataRecord`
- `DeviceRegistration` / device-patient pairing
- `EmergencyContact` / next-of-kin routing
- `PatientDeviceConsent`
- `ExternalEmergencySource` / carrier/PSAP/provider tenant registration
- `MobileEmergencyPayloadAudit`

## Security, Privacy, And Safety Gaps

| Gap | Why it matters |
| --- | --- |
| No source authentication for AML/ELS/mobile emergency webhook senders | Prevents spoofed emergency events. |
| No replay protection or idempotency model | Emergency webhooks can duplicate or be replayed. |
| No consent model for medical ID, location, wearable, or emergency contacts | Required for PHI/location/medical import governance. |
| No schema validation for proposed payloads | Raw mobile payloads would be unsafe to persist. |
| No alert lifecycle state machine | Need pending, verified, triaged, dismissed, escalated, resolved, false-positive. |
| No patient matching policy | Matching by device, medical info, name/DOB, IMEI/IMSI must be tightly governed. |
| No emergency contact delivery provider | Current notification stack is push-first; SMS is not implemented. |
| Browser geolocation is disabled by security policy | Existing tests enforce `Permissions-Policy: geolocation=()`, so browser-originated location capture would require a deliberate policy change. |

## Accuracy Notes On Proposed Artifacts

- iOS Emergency SOS and Medical ID are not generally available as an arbitrary server-side ingestion API for third-party hospitals. A CareDroid implementation would likely require a native app, HealthKit permissions, user consent, and/or partner-specific integration rather than assuming Apple infrastructure posts directly to the backend.
- Android ELS is an emergency services partner ecosystem feature. Treat it as a partner/PSAP integration, not a generic Android app webhook.
- AML uses regulated emergency communications pathways. Accepting AML-like payloads requires source verification, jurisdictional policy, and carrier/PSAP onboarding.
- IMEI/IMSI handling is highly sensitive and may not be accessible to normal apps in modern iOS/Android environments. Avoid designing pilot flows that depend on client-collected IMEI/IMSI unless the source is a verified carrier/PSAP feed.

## Recommended Pre-Implementation Order

1. Define pilot scope: demo simulator, native app ingestion, hospital-owned device ingestion, or PSAP/carrier partner ingestion.
2. Create data contracts and persistence models for emergency alerts, devices, contacts, consent, and audit.
3. Choose canonical backend runtime: Nest/TypeORM or optional Mongoose Emergency OS.
4. Add source authentication, idempotency, replay protection, rate limits, and validation schemas.
5. Add a simulated mobile emergency event route for internal QA only.
6. Wire event lifecycle to Emergency OS whiteboard as visible alerts with unavailable/error states.
7. Only then add vendor-specific Apple/Android/Samsung/AML adapters.

## Bottom Line

The repository is not ready for direct implementation of the proposed mobile emergency artifacts. The safe next step is a model/API design spec and a simulated ingestion contract, not production AML/ELS/iOS/Samsung service code.
