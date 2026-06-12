# Current Integration Inventory

Generated: 2026-06-12

Mode: discovery only. No integrations, routes, pages, providers, or connectors were implemented.

## Executive Summary

The repository is closer to a generic integration platform than to a pile of vendor-specific connectors. The strongest existing foundation is:

- `backend/src/modules/interoperability/*` for generic integration event registration, normalization, and review-bound automation routing.
- `backend/src/modules/platform-systems/*` for demo FHIR, HL7, EHR import, provenance, and integration status endpoints.
- `backend/src/modules/telemetry`, `hospital-map`, `fleet`, and `live-tracking` for demo medical-device, device-location, and fleet telemetry contracts.
- `backend/src/modules/notifications` plus frontend notification services for push notification registration, preferences, and history.

The main limitation is that these pieces are demo/readiness contracts or disconnected from active Emergency OS workflows. No production Apple Health, Samsung Health, Fitbit, Garmin, HealthKit, Health Connect, MQTT, HL7 listener, DICOM/PACS, Teams, Slack, pager, or SMS delivery provider was found.

## Integration Artifact Inventory

| Category | Integration | Discovered artifacts | Status | Notes |
| --- | --- | --- | --- | --- |
| Healthcare Systems | FHIR connector | `backend/src/modules/interoperability/interoperability.module.ts`, `integration-event-registry.service.ts`, `integration-automation-router.service.ts`, `backend/src/modules/platform-systems/platform-systems.controller.ts`, `backend/src/services/fhir.service.ts`, `src/pages/emergency/EmergencySettings.jsx` | Partially implemented | FHIR Patient, Observation, MedicationRequest, and Encounter normalization exists; platform endpoints return demo/unconfigured connection status. |
| Healthcare Systems | HL7 bridge | `integration-event-registry.service.ts`, `integration-automation-router.service.ts`, `platform-systems.controller.ts` | Placeholder / partial | HL7 ADT and ORU are registered but marked placeholder; demo interface/test/quarantine/replay endpoints exist. |
| Healthcare Systems | EHR/EMR patient import | `platform-systems.controller.ts`, `src/services/patientManagementApi.js`, `EmergencySettings.jsx` | Partially implemented | API client exposes EHR/lab/medication/observation import helpers; backend returns demo platform-system responses. |
| Healthcare Systems | DICOM / PACS | `src/data/featureInventory.js`, `backend/src/config/stripe.config.ts`, tool intent patterns | Placeholder | DICOM appears as product/intent/catalog metadata, not a DICOMweb/PACS adapter. |
| Healthcare Systems | Provincial systems / HIE / OHIP | `docs/architecture/mobile-emergency-integration-gap-report.md`, commercial/knowledge-base concepts | Missing | No production provincial-system adapter, endpoint, credential model, or UI chain found. |
| Consumer Devices | Apple Watch / Apple Health / HealthKit | Search across `src`, `backend`, and `android` | Missing | No HealthKit, iOS app, Apple Watch, or Apple emergency ingestion runtime found. |
| Consumer Devices | Android Health Connect | `android/` project exists | Missing | Android app has no Health Connect dependency or health/body-sensor permission in inspected manifest. |
| Consumer Devices | Samsung Health | `src/data/androidDeviceQaMatrix.js` only references Samsung device viewport profiles | Missing | Samsung appears in QA device profiles, not Samsung Health integration. |
| Consumer Devices | Fitbit / Garmin | Search across repo | Missing | No Fitbit/Garmin provider, OAuth, webhook, or observation mapping found. |
| Clinical Devices | Patient monitors / telemetry | `backend/src/modules/telemetry/*`, `src/services/medicalIotService.js`, `src/pages/MedicalIotDashboard.jsx`, `backend/src/modules/interoperability/integration-automation-router.service.ts` | Partially implemented / demo | Device telemetry type and normalization exist; backend returns labeled demo telemetry, not live bedside monitor feeds. |
| Clinical Devices | ECG | `medicalIotService.js`, `HospitalMapDashboard.jsx`, `toolRegistry.js` cardiology/ECG tools | Placeholder / demo | ECG appears as demo telemetry and clinical tool concepts; no ECG device connector or DICOM/HL7 ECG ingestion found. |
| Clinical Devices | Pulse oximeters | `telemetry.data.ts`, `medicalIotService.js`, `HospitalMapDashboard.jsx` | Demo | Demo SpO2 device/vital models exist; no real device gateway ingestion. |
| Clinical Devices | Blood pressure monitors | `telemetry.data.ts`, `medicalIotService.js`, `HospitalMapDashboard.jsx` | Demo | Demo BP/home cuff data exists; no vendor/device stream. |
| Clinical Devices | Ventilators | `HospitalMapDashboard.jsx`, `toolRegistry.js`, product catalog metadata | Placeholder / demo | Ventilator state appears in UI/demo/tool metadata only. |
| Clinical Devices | Infusion pumps | `HospitalMapDashboard.jsx`, `clinicalKnowledgeGraph.js`, `telemetry.data.ts` | Placeholder / demo | Infusion pump appears as demo device context; no control or live telemetry connector. |
| IoT Infrastructure | Device telemetry event model | `normalized-clinical-event.model.ts`, `integration-event-registry.service.ts`, `integration-automation-router.service.ts` | Partially implemented | Generic `device_telemetry` event family normalizes metric/status/device/patient/location fields and creates review-bound actions. |
| IoT Infrastructure | Medical IoT backend | `backend/src/modules/telemetry/telemetry.controller.ts`, `telemetry.service.ts`, `device-registry.service.ts`, `alert.service.ts`, `telemetry.types.ts` | Implemented demo | Mounted Nest routes return clearly labeled demo contracts: `/api/devices/live`, `/api/telemetry/live`, `/api/alerts/devices`, `/api/medical-iot/snapshot`. |
| IoT Infrastructure | Hospital map / RTLS foundation | `backend/src/modules/hospital-map/*`, `src/services/hospitalMapService.js`, `src/pages/HospitalMapDashboard.jsx` | Implemented demo / disconnected | Device/floor/room APIs and UI exist, but active app redirects `/hospital-map` as future release. |
| IoT Infrastructure | Live tracking / fleet | `backend/src/modules/live-tracking/*`, `backend/src/modules/fleet/*`, `src/pages/fleet/*`, `src/services/fleetTelemetryService.js` | Demo / future | Fleet and live tracking contracts exist; active app redirects fleet/live-map routes. |
| IoT Infrastructure | WebSockets / SSE | `src/services/emergencyRealtimeService.js`, `backend/src/api/ems.socket.ts` | Partially implemented / disconnected | Frontend can consume env-configured SSE/WS and polling; backend EMS Socket.IO event source uses a different path/envelope and is optional. |
| IoT Infrastructure | MQTT / device gateway | Search across repo | Missing | No MQTT broker/client, device gateway service, IEEE 11073, or IHE device profile implementation found. |
| Messaging Systems | Push notifications / FCM / APNS payloads | `backend/src/modules/notifications/*`, `src/services/NotificationService.js`, Android `CareDroidMessagingService.kt` | Partially implemented | Backend persists notifications and sends FCM/APNS-formatted payloads when Firebase credentials exist; Android token backend registration is TODO and manifest does not declare the service. |
| Messaging Systems | Notification preferences | `notification-preference.entity.ts`, `notification-preference.service.ts`, `NotificationPreferences.jsx` | Implemented / partial | Preferences include push, email, SMS, and emergency alert flags; only push path has concrete backend delivery. |
| Messaging Systems | Email | `backend/src/modules/email`, notification preference fields | Partial | Email module exists, but notification-channel send helper points to disabled `/api/notifications/send/:channel`. |
| Messaging Systems | SMS | `smsEnabled` preferences, frontend queue helper | Placeholder / missing provider | No Twilio/SMS provider or backend send route found. |
| Messaging Systems | Teams / Slack / Pager | Search across repo | Missing | No provider adapter, webhook sender, credentials, or routing rules found. |
| Messaging Systems | Webhooks | Search across repo | Missing / incidental | No generic inbound/outbound webhook integration hub was found. |
| Platform Adapters | Offline sync | `src/services/syncService.js`, `offlineService`, Dexie DB | Partially implemented | Sync supports app data categories; not an integration ingestion bus for device/clinical events. |
| Platform Adapters | Backend capability gates | `src/config/backendApiCapabilities.js`, `src/services/liveTrackingApi.js` | Implemented | Frontend avoids disabled routes and labels demo integration contracts. |

## Category Coverage

Consumer devices are effectively not implemented. Clinical devices and IoT infrastructure are represented by demo medical IoT, hospital map, and generic `device_telemetry` normalization. Healthcare system integration has the most reusable architecture through FHIR/HL7/EHR demo endpoints plus `IntegrationAutomationRouter`. Messaging has a real push-notification foundation but lacks enterprise routing channels.

## Architectural Reality

The repo should not grow one connector per vendor. The useful current shape is already closer to:

- Integration Hub: not implemented as a single inbound API yet, but `InteroperabilityModule` plus `IntegrationAutomationRouter` are the nucleus.
- FHIR Connector: partially implemented for demo connection state and resource normalization.
- Device Connector: partially implemented for normalized `device_telemetry` and demo Medical IoT/hospital map contracts.
- Notification Connector: partially implemented for FCM/APNS push and preferences; missing SMS/email/Teams/Slack/pager routing providers.
