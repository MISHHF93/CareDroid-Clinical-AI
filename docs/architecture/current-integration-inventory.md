# Current Integration Inventory

Generated: 2026-06-12

Mode: implementation in progress. The first Integration Hub MVP was added as a backend generic ingestion, persistence, normalization, route-result, and audit layer. No vendor-specific connectors or new pages were added.

## Executive Summary

CareDroid is not organized as a set of vendor-specific connectors. The reusable integration foundation is concentrated in:

- `backend/src/modules/interoperability/*`: generic integration event definitions, durable source/event/normalized-event records, ingestion/traceability APIs, normalization, and review-bound automation routing.
- `backend/src/modules/platform-systems/*`: demo/readiness FHIR, HL7, EHR import, provenance, and integration-status endpoints.
- `backend/src/modules/telemetry/*`, `hospital-map/*`, `fleet/*`, and `live-tracking/*`: demo medical device, device location, fleet, and telemetry contracts.
- `backend/src/modules/notifications/*` and frontend notification services: push device registration, preferences, history, unread state, and test notification flow.
- `src/config/backendApiCapabilities.js`: capability gates that label demo integrations and prevent disabled routes from pretending to be live.

The architecture can support a future `Device Integration Platform`; the new Integration Hub removes the largest backend persistence/API gap. Current provider implementations are still mostly demo/readiness contracts. No production Apple Health, HealthKit, Apple Watch, Android Health Connect, Samsung Health, Fitbit, Garmin, MQTT, IEEE 11073, IHE PCD, DICOM/PACS, Teams, Slack, pager, or SMS provider was found.

## Status Definitions

- Implemented: route/service/UI exists and has real behavior, even if not fully production-connected.
- Partially implemented: reusable model/service/API exists, but provider, persistence, runtime wiring, or UI consumption is incomplete.
- Placeholder: catalog/demo concept or stub exists, but no real integration runtime.
- Disconnected: pieces exist, but the provider-to-UI chain breaks before active Emergency OS use.
- Missing: no integration artifact was discovered for that requested domain.
- Dead code: code exists but is not mounted or is superseded. No high-confidence dead integration runtime was found; most unused items are demo/future surfaces rather than dead code.

## Integration Artifact Inventory

| Category | Integration | Provider | Service | API/Event | Frontend UI | Status | Chain Break |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Consumer Devices | Apple Watch | None found | None | None | None | Placeholder / missing | No iOS/watchOS runtime, HealthKit permission model, OAuth/device pairing, or observation mapping. |
| Consumer Devices | Apple Health / HealthKit | None found | None | None | None | Placeholder / missing | No HealthKit adapter, iOS app, or consent/device data model. |
| Consumer Devices | Android Health Connect | Android app exists, but no Health Connect dependency or health permissions | None | None | None | Placeholder / missing | Android native code is present, but no Health Connect integration or body-sensor ingestion. |
| Consumer Devices | Samsung Health | Samsung appears only in Android QA device profiles | None | None | None | Placeholder / missing | No Samsung Health SDK/provider, OAuth, webhook, or mapping. |
| Consumer Devices | Fitbit | None found | None | None | None | Placeholder / missing | No Fitbit provider, OAuth, subscription, or observation mapper. |
| Consumer Devices | Garmin | None found | None | None | None | Placeholder / missing | No Garmin provider, webhook, OAuth, or observation mapper. |
| Clinical Devices | Patient monitors | Demo telemetry source; generic hub source registry | `backend/src/modules/telemetry/*`; `IntegrationHubService`; `IntegrationAutomationRouter.normalizeDeviceTelemetry` | `GET /api/devices/live`; `GET /api/telemetry/live`; `POST /api/interoperability/events`; `device_telemetry` normalized event family | `src/pages/MedicalIotDashboard.jsx` via `src/services/medicalIotService.js` | Partially implemented / demo | Active UI, demo API, and durable generic ingestion exist, but no live bedside monitor feed, gateway, or Emergency OS patient-state consumer. |
| Clinical Devices | ECG | Demo ECG patch data | `telemetry.data.ts`; cardiology tool metadata | Demo vitals include ECG; no ECG ingestion API | Medical IoT dashboard and tool metadata | Placeholder / demo | ECG is demo telemetry only; no ECG device connector, waveform ingestion, DICOM/HL7 ECG mapping, or alert routing. |
| Clinical Devices | Pulse oximeters | Demo SpO2 device | `TelemetryService`; `DeviceRegistryService`; `AlertService` | `/api/devices/live`; `/api/telemetry/live`; `/api/alerts/devices` | Medical IoT dashboard | Demo | SpO2 data is seeded/demo; no real device gateway or patient timeline ingestion. |
| Clinical Devices | Blood pressure monitors | Demo home BP cuff | `telemetry.data.ts`; Medical IoT service | Demo telemetry endpoints | Medical IoT dashboard | Demo | No vendor/home-device integration, consent model, or external vital ingestion route. |
| Clinical Devices | Telemetry | Demo Medical IoT source, generic Integration Hub, and normalized event model | `TelemetryModule`; `IntegrationHubService`; `IntegrationAutomationRouter` | Demo telemetry endpoints; `POST /api/interoperability/events`; `GET /api/interoperability/events*`; `device_telemetry` event type | Medical IoT dashboard; Hospital Map context | Partially implemented | Demo telemetry API and generic hub now coexist; remaining break is live device gateway and Emergency OS consumer wiring. |
| Clinical Devices | Ventilators | Demo/reference data only | Tool metadata and demo Medical IoT vitals | None specific | Tool/catalog references; Medical IoT demo vitals | Placeholder / demo | No ventilator connector, IEEE 11073/IHE PCD mapping, stream processing, or clinical alert route. |
| Clinical Devices | Infusion pumps | Demo/reference data only | Hospital map/device context and knowledge graph metadata | None specific | Hospital/device demo context | Placeholder / demo | No pump telemetry feed, control boundary, or event normalization. |
| Healthcare Systems | FHIR | Demo/unconfigured connection source; generic hub source registry | `IntegrationEventRegistry`; `IntegrationHubService`; `IntegrationAutomationRouter`; `FHIRService`; `PlatformSystemsController` | FHIR event family: Patient, Observation, MedicationRequest, Encounter; `POST /api/interoperability/events`; `/api/integrations/fhir/*` | `EmergencySettings`; platform system UI/services | Partially implemented | FHIR resource normalization and durable generic event storage exist, but no SMART/OAuth connection manager, subscription worker, or Emergency OS event consumer. |
| Healthcare Systems | HL7 v2 | Demo interface source; generic hub source registry | `IntegrationEventRegistry`; `IntegrationHubService`; `IntegrationAutomationRouter`; platform-system demo endpoints | HL7 ADT/ORU placeholder events; `POST /api/interoperability/events`; `/api/integrations/hl7/*` | `EmergencySettings` integration status cards | Placeholder / partial | Placeholder ADT/ORU normalization and durable hub records exist; no MLLP listener, parser, ACK/NACK, interface-engine adapter, or patient/bed event routing. |
| Healthcare Systems | DICOM / PACS | None found | Catalog/intent metadata only | None | Route/tool/product metadata only | Placeholder | No DICOMweb/PACS adapter, imaging ingestion, report import, or Emergency OS imaging workflow. |
| Healthcare Systems | EHR / EMR import | Demo platform-system source | `PlatformSystemsController`; patient import API clients | `/api/patients/import/ehr`; `/api/patients/:id/import/labs|medications|observations` | Patient/platform helper services; settings/status surfaces | Partially implemented / demo | Demo/readiness import routes exist, but no production EHR connector or mounted review workflow. |
| Healthcare Systems | Provincial Systems / HIE | Concept docs only | None | None | Commercial/knowledge-base concepts | Placeholder / missing | No provincial credential model, adapter, endpoint, or conformance flow. |
| Messaging Systems | Push notifications | Firebase Admin / browser Firebase when configured | `NotificationService`; `FirebaseService`; `DeviceTokenService` | `/api/notifications/*`; browser token registration; notification entity | `NotificationPreferences`; `NotificationContext`; `NotificationService.js` | Partially implemented | Web push path exists; Android token registration is TODO and Android service is not declared in manifest; ED alert events are not routed through backend notifications. |
| Messaging Systems | Email | Email module/preferences | Backend email module and notification preferences | Email preference fields; disabled send-channel capability | Preferences UI | Partial / disconnected | Preferences exist, but no active notification connector route from ED alerts to email provider delivery. |
| Messaging Systems | SMS | Preference fields only | None found | Disabled send-channel capability | Preferences UI | Placeholder | No SMS provider, phone consent/delivery audit, or backend route. |
| Messaging Systems | Teams | None found | None | None | None | Missing | No Teams provider, webhook adapter, or routing rule. |
| Messaging Systems | Slack | None found | None | None | None | Missing | No Slack provider, webhook adapter, or routing rule. |
| Messaging Systems | Pager | None found | None | None | None | Missing | No pager/PagerDuty-style provider or escalation connector. |
| IoT Infrastructure | MQTT | None found | None | None | None | Missing | No MQTT broker/client, topic model, device gateway, or stream consumer. |
| IoT Infrastructure | WebSockets / SSE | Env-configured frontend realtime and optional EMS Socket.IO backend | `src/services/emergencyRealtimeService.js`; `backend/src/api/ems.socket.ts` | Configurable SSE/WS client; optional Socket.IO emitter | Emergency OS store can poll/receive normalized frontend events | Partially implemented / disconnected | Frontend expects configurable SSE/WS envelope; backend EMS Socket.IO path/envelope is optional and not the canonical source. |
| IoT Infrastructure | Device Gateways | Demo gateway labels and generic hub source registry | Telemetry demo services; hospital map device location service; `IntegrationHubService` | Demo telemetry/location endpoints; `POST /api/interoperability/events` | Medical IoT and Hospital Map | Placeholder / partial | Generic ingestion and source persistence now exist; no physical gateway service, transport adapter, signed source authentication, or replay/rate-limit enforcement. |
| IoT Infrastructure | Event Streams | Generic normalized event model and durable hub records | `IntegrationHubService`; `IntegrationAutomationRouter`; `IntegrationEventRegistry` | `POST /api/interoperability/events`; `GET /api/interoperability/events`; `GET /api/interoperability/events/:id` | No active review queue UI for integration events | Partially implemented | Backend event log and traceability exist; no Emergency OS event bus, review-queue UI, or notification connector consumer yet. |
| Platform Adapters | Offline sync | Browser/Dexie/local app data | `src/services/syncService.js`; offline services | App sync calls, some capability-disabled | App providers/offline UI | Partially implemented | Useful app sync, but not an external integration ingestion layer. |
| Platform Adapters | External API adapters | Platform systems demo APIs, Stripe webhook, notification APIs | Platform and subscription modules | `/api/integrations/*`, `/api/stripe/webhook`, notification endpoints | Platform/admin/settings surfaces | Partial | Adapter shape exists, but healthcare/device providers remain demo or absent. |

## Category Coverage

Consumer devices are not implemented. Clinical devices and IoT infrastructure are represented by active demo Medical IoT UI, demo telemetry APIs, hospital-map/device-location contracts, generic hub ingestion, and a generic `device_telemetry` mapper. Healthcare-system readiness is strongest around FHIR resource normalization, durable hub traceability, and demo FHIR/HL7 status endpoints. Messaging has a real push-notification foundation, but enterprise delivery channels are not implemented.

## Architectural Reality

The codebase should not grow `Apple Connector`, `Samsung Connector`, `Garmin Connector`, `Fitbit Connector`, `Monitor Connector`, and `ECG Connector` as separate product domains. The useful current shape is already closer to:

- Integration Hub: implemented as a protected backend ingestion and traceability API with `IntegrationSourceEntity`, `IntegrationEventRecordEntity`, `NormalizedIntegrationEventEntity`, `IntegrationHubService`, `IntegrationEventRegistry`, and `IntegrationAutomationRouter`.
- FHIR Connector: partially implemented for demo connection state, FHIR resource event definitions, and normalization.
- Device Connector: partially implemented for `device_telemetry` normalization and demo Medical IoT/hospital-map contracts.
- Notification Connector: partially implemented for push registration, preferences, notification persistence, and browser/web push; missing SMS/email/Teams/Slack/pager provider routing.
