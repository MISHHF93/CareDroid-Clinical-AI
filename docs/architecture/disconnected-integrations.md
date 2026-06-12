# Disconnected Integrations

Generated: 2026-06-12

Mode: discovery only. No integrations were implemented.

## Summary

CareDroid has several integration foundations, but most chains break before becoming production Emergency OS integrations. The recurring break is:

`Integration -> Provider -> Service -> API -> Event -> Frontend UI`

Existing code usually has a service/API and sometimes a UI, but lacks a real provider, durable event ingestion, or active Emergency OS mounting.

## Chain Break Inventory

| Integration | Provider | Service | API | Event | Frontend UI | Break |
| --- | --- | --- | --- | --- | --- | --- |
| FHIR Patient/Observation/MedicationRequest/Encounter | Demo/unconfigured FHIR source in `PlatformSystemsService.getFhirConnections()` | `FHIRService`, `IntegrationAutomationRouter` | `/api/integrations/fhir/*`, `/api/interoperability/summary` | Normalized FHIR resource events can be produced internally | `EmergencySettings` read-only cards; patient import helpers | No inbound FHIR ingestion route, subscription worker, SMART launch, durable event table, or active Emergency OS event consumer. |
| HL7 ADT/ORU | Demo listener in `getHl7Interfaces()` | `HL7BridgeService`, `IntegrationAutomationRouter` | `/api/integrations/hl7/interfaces`, test-message, quarantine, replay-preview | Placeholder ADT/ORU normalized events | `EmergencySettings` read-only cards | No HL7 listener, parser, MLLP/interface engine adapter, durable message queue, or Emergency OS ADT consumer. |
| EHR patient import | Demo platform-system source | `PlatformSystemsService.demo('ehr-patient-import')`, `patientManagementApi.importEhrPatient` | `/api/patients/import/ehr` | Import preview/audit concepts only | Patient detail/import helpers, settings status | No production EHR connection or import review workflow mounted in active Emergency OS. |
| Lab/medication/observation imports | Demo platform-system source | `patientManagementApi.importPatientLabs`, `importPatientMedications`, `importPatientObservations` | `/api/patients/:patientId/import/*` | Demo imported facts | Patient detail helpers | Import endpoints are demo/readiness contracts, not live LIS/EHR feeds. |
| DICOM/PACS | None | Catalog/feature metadata only | None | None | Route/tool metadata only | DICOM appears in product/intent metadata, not as DICOMweb, PACS, imaging, or report ingestion. |
| Consumer wearables | None | None | None | None | None | Apple Health, HealthKit, Apple Watch, Android Health Connect, Samsung Health, Fitbit, Garmin are absent. |
| Android mobile push | Firebase client dependency and Android messaging service | `CareDroidMessagingService.kt`, backend `DeviceTokenService` | `/api/notifications/devices/register` | FCM token refresh event is TODO | Browser/frontend notification registration exists | Android native service has token-registration TODO and is not declared in inspected manifest. |
| Medical IoT device telemetry | Demo Medical IoT source | `TelemetryService`, `DeviceRegistryService`, `AlertService` | `/api/devices/live`, `/api/telemetry/live`, `/api/alerts/devices`, `/api/medical-iot/snapshot` | Demo vitals/device alerts; generic `device_telemetry` normalizer exists separately | `MedicalIotDashboard` | Routes are demo only and `/medical-iot` is redirected as future release from active app. No live gateway, MQTT, IEEE 11073, or vendor feed. |
| Device observation mapping | Generic payload only | `IntegrationAutomationRouter.normalizeDeviceTelemetry` | No public ingestion API | Normalized `device_telemetry` supports deviceId, patientId, metric, value, unit, status, severity, location | No active Emergency OS consumer | Strong internal mapper, but disconnected from telemetry module and UI event stream. |
| Hospital map / RTLS | Demo hospital map source | `FloorService`, `RoomService`, `DeviceLocationService` | `/api/hospital-map/floors`, rooms, devices, search | Device/location/alert demo state | `HospitalMapDashboard`, `DeviceFleetManagement` | UI exists but routes are future-release redirects; no RTLS provider or location event stream. |
| Fleet/live tracking | Demo fleet source | `FleetService`, `LiveTrackingService` | `/api/fleet/*`, legacy live-tracking adapters | Fleet route/vehicle freshness demo events | `FleetDashboard`, `FleetLiveMap`, `LiveTrackingMap` | Fleet/live-map routes are future/redirected; not connected to Emergency OS EMS flow. |
| Emergency realtime | Env-configured SSE/WS source | `startEmergencyRealtime` | Configurable `VITE_ED_REALTIME_SSE_PATH` / `VITE_ED_REALTIME_WS_PATH` | Normalized frontend event envelope | Store/Event consumers in Emergency OS | No canonical backend SSE/WS endpoint is configured by default. |
| EMS socket events | Optional Express/Socket.IO emitter | `backend/src/api/ems.socket.ts` | Optional EMS runtime | `ems_alert_received`, `ems_status_updated`, `ems_arrival_confirmed` | No Socket.IO client found | Backend and frontend realtime event envelopes/transports do not match. |
| Push notification routing | Firebase Admin SDK | `NotificationService`, `FirebaseService`, `DeviceTokenService` | `/api/notifications/*` | Notification entity with pending/sent/read/failed state | `NotificationService.js`, `NotificationContext`, preferences UI | Push foundation exists, but ED alert engine outputs are not routed into backend notifications. |
| Email notification routing | Email module and preference fields | Generic frontend channel queue | Intended `/api/notifications/send/email` | Queue-style local notification object | Local notification service only | Backend send-channel capability is disabled; no channel route wired. |
| SMS notification routing | Preference fields only | Generic frontend channel queue | Intended `/api/notifications/send/sms` | Queue-style local notification object | Local notification service only | No SMS provider, phone/consent model, delivery audit, or route. |
| Teams/Slack/Pager | None | None | None | None | None | Enterprise collaboration/pager adapters are absent. |
| Webhooks | None found as generic integration surface | None | None | None | None | No inbound webhook signature/idempotency/replay model or outbound webhook router. |
| Offline app sync | Browser/Dexie local storage | `SyncService`, `offlineService` | Various app APIs | App data sync events | App providers/services | Useful offline sync, but not an external integration ingestion layer. |

## Mapping Capability Status

### FHIR Resource Mapping

Status: partially supported.

Evidence:

- `IntegrationEventRegistry` registers FHIR `Patient`, `Observation`, `MedicationRequest`, and `Encounter`.
- `IntegrationAutomationRouter` normalizes these resources into a shared `NormalizedClinicalEvent`.
- `backend/src/services/fhir.service.ts` provides a minimal patient snapshot normalizer for Smart Intake.

Break:

- No production FHIR provider connection, token/SMART flow, subscription listener, durable event store, or active Emergency OS event consumer.

### HL7 Mapping

Status: placeholder.

Evidence:

- `IntegrationEventRegistry` registers HL7 `ADT` and `ORU`.
- `IntegrationAutomationRouter` has placeholder normalizers for ADT and ORU payloads.
- Platform endpoints expose demo interface state, test-message, quarantine, and replay-preview paths.

Break:

- No HL7 parser, MLLP listener, interface-engine adapter, ACK/NACK handling, message persistence, or routing into Emergency OS patient/bed events.

### Device Observation Mapping

Status: partially supported.

Evidence:

- `IntegrationAutomationRouter.normalizeDeviceTelemetry` maps generic device telemetry fields.
- `TelemetryController` and frontend Medical IoT services expose demo device/vital/alert contracts.

Break:

- The generic device event mapper and demo telemetry APIs are separate; no ingestion endpoint feeds normalized device observations into Emergency OS.

### Medical Device Data Streams

Status: demo only.

Evidence:

- `/api/devices/live`, `/api/telemetry/live`, `/api/alerts/devices`, and `/api/medical-iot/snapshot` exist.
- Frontend services poll/demo-fetch these endpoints and fall back to local demo data.

Break:

- No MQTT, WebSocket device gateway, IEEE 11073, IHE PCD, vendor gateway, RTLS stream, or durable stream processing service.

### External Vital Sign Ingestion

Status: partial model, no live ingestion.

Evidence:

- FHIR Observation and `device_telemetry` normalization can represent vitals.
- Smart Intake patient creation can use a minimal FHIR patient normalizer.
- Emergency store already accepts local vitals for alerting.

Break:

- No external vital ingestion endpoint joins these pieces into patient state, alert engine, timeline, or reassessment workflows.

### Notification Routing

Status: partially implemented for push.

Evidence:

- Backend notification entities, preferences, device tokens, and FCM/APNS payloads exist.
- Frontend can register web push tokens and read notification history/counts.

Break:

- SMS/email/Teams/Slack/pager routes are missing or disabled.
- ED operational alerts are local and not persisted through notification backend.

### Alert Routing

Status: partially implemented locally.

Evidence:

- `engine/alertEngine.ts`, `AppShell` alert drawer/toasts, backend clinical-alert demo module, device-alert demo endpoints, and notification service all exist.

Break:

- There is no canonical alert event bus joining integration events, device telemetry, ED alerts, notification backend, and UI acknowledgments.

## Smallest Architecture Changes Required

1. Create a generic Integration Hub contract, not vendor contracts:
   - `IntegrationEvent` ingestion API with source authentication, idempotency key, replay protection, tenant/source metadata, and audit.
   - Persist raw event plus normalized event plus routing outcome.

2. Promote existing `IntegrationAutomationRouter` to the canonical normalization layer:
   - Keep FHIR, HL7, LIS, and `device_telemetry` as families.
   - Add vendor adapters only as thin mappers into `IntegrationEvent`.

3. Add a Device Connector domain:
   - One device gateway boundary for MQTT/WebSocket/webhook/IEEE 11073/IHE-style feeds.
   - Map all device observations to `device_telemetry`, then to Emergency OS vitals/alerts after human-reviewed rules.

4. Add a Notification Connector domain:
   - Route `SafeAction` and ED alerts into notification records.
   - Add provider plugins for push, email, SMS, Teams, Slack, and pager without coupling alerts to vendors.

5. Wire Emergency OS to normalized events:
   - Patient/encounter events update patient identity/state.
   - Observation/device events create review-bound vitals/timeline/alert entries.
   - All side effects remain review-required until clinical governance signs off.
