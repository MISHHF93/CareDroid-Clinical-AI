# IoT Readiness Report

Generated: 2026-06-12

Mode: discovery only. No integrations, pages, routes, providers, or connector implementations were added.

## Readiness Scores

| Area | Score | Rationale |
| --- | ---: | --- |
| Current Integration Coverage | 36% | Multiple backend modules and frontend services exist for FHIR/HL7 demo status, medical IoT demo telemetry, hospital map, live tracking, fleet, notifications, and realtime clients, but most are demo/future or disconnected from active Emergency OS. |
| FHIR Readiness | 55% | FHIR Patient, Observation, MedicationRequest, and Encounter normalization exists, plus demo connection/sync/test endpoints and settings UI. Missing SMART auth, production provider config, subscriptions, durable event persistence, and Emergency OS event consumers. |
| HL7 Readiness | 32% | HL7 ADT/ORU are registered and placeholder-normalized; demo interface/quarantine/replay endpoints exist. Missing real parser, listener, ACK/NACK, interface-engine adapter, persistence, and patient/bed workflow routing. |
| Medical Device Readiness | 42% | Demo telemetry/device/location APIs, Medical IoT UI, hospital map UI, and generic `device_telemetry` event mapping exist. Missing real gateway, MQTT/WebSocket stream, IEEE 11073/IHE mapping, vendor feeds, and active Emergency OS device ingestion. |
| Wearable Readiness | 10% | No Apple Health, HealthKit, Apple Watch, Android Health Connect, Samsung Health, Fitbit, Garmin, or wearable OAuth/permissions/runtime found. Only generic device telemetry and demo remote-monitoring examples exist. |
| Emergency OS Integration Readiness | 37% | Emergency OS has alert, vitals, realtime, settings, and UI surfaces that could consume normalized events, but current integration modules are not wired into the active patient/whiteboard/reassessment/capacity flows. |

Overall IoT/device integration readiness: 35%.

## What The Architecture Already Supports

The current codebase already supports some of the right abstractions:

- Source-family normalization through `IntegrationEventFamily`.
- Normalized clinical/device events through `NormalizedClinicalEvent`.
- Safe review-bound automation actions through `IntegrationAutomationRouter`.
- Demo FHIR/HL7 connection visibility through platform-system endpoints.
- Demo device registry, telemetry, and alert contracts through the telemetry module.
- Demo location/device context through hospital-map and live-tracking modules.
- Push-notification persistence and delivery through notification modules.
- Frontend backend-capability gating so unavailable routes do not pretend to be live.

This means the platform should evolve from the existing generic event model, not from vendor-specific connectors.

## What Is Not Ready

The architecture is not ready for production device integration because these foundations are missing:

- No canonical Integration Hub ingestion API.
- No durable raw-event and normalized-event persistence.
- No source registry with credentials, tenant scoping, source authentication, idempotency, replay protection, or audit policy.
- No HL7 listener/parser or interface-engine adapter.
- No SMART/FHIR auth, subscription worker, or provider-specific FHIR connection manager.
- No MQTT broker/client, device gateway, IEEE 11073 mapper, or IHE PCD profile implementation.
- No wearable consent/device-pairing model.
- No notification provider routing beyond push.
- No canonical event bus from integration events to Emergency OS patient state, timeline, vitals, reassessment, capacity, whiteboard, or alert drawer.

## Recommended Four-Domain Architecture

### 1. Integration Hub

Purpose: one inbound and internal event backbone.

Responsibilities:

- Source registration and tenant/workspace scoping.
- Signature verification, idempotency, replay protection, rate limiting, and audit.
- Raw event storage.
- Normalization dispatch through existing `IntegrationAutomationRouter`.
- Normalized event storage.
- Review queue routing and Emergency OS event publishing.

Keep vendor logic outside the hub. Vendor adapters should only translate into the generic `IntegrationEvent` contract.

### 2. FHIR Connector

Purpose: one healthcare-system connector for FHIR resources.

Responsibilities:

- FHIR connection profiles and credentials.
- SMART/OAuth configuration when needed.
- Resource polling or subscription handling.
- FHIR Patient, Encounter, Observation, MedicationRequest, DiagnosticReport, and related resource mapping.
- Writeback policy kept disabled/review-required unless governance approves.

Reuse current FHIR normalization rather than creating Apple/Samsung/Garmin-specific clinical models.

### 3. Device Connector

Purpose: one clinical and consumer device boundary.

Responsibilities:

- Device/source registry.
- Device-patient pairing and consent.
- Transport adapters for MQTT, WebSocket, webhook, batch upload, and future vendor SDK feeds.
- Device observation mapping into generic `device_telemetry`.
- Optional standards mapping for IEEE 11073 and IHE PCD.
- Alert freshness, stale/offline detection, and biomedical review task creation.

Apple Health, Samsung Health, Health Connect, Fitbit, Garmin, bedside monitors, ECG, pulse oximeters, ventilators, and infusion pumps should all land here as source adapters, not separate product domains.

### 4. Notification Connector

Purpose: one alert and notification delivery boundary.

Responsibilities:

- Route safe actions, operational alerts, device warnings, and ED alert-engine outputs.
- Persist delivery attempts and acknowledgement state.
- Provider adapters for push, email, SMS, Teams, Slack, and pager.
- Quiet-hours, severity, escalation, and role/team routing policies.

This should connect existing local alert logic and backend notifications without letting every clinical feature call providers directly.

## Minimal Build Sequence After Discovery

1. Define `IntegrationSource`, `IntegrationEventRecord`, `NormalizedIntegrationEvent`, and `IntegrationDeliveryAttempt` models.
2. Expose one authenticated Integration Hub ingestion endpoint that accepts generic `IntegrationEvent` payloads.
3. Persist raw and normalized events, then route through existing `IntegrationAutomationRouter`.
4. Add an Emergency OS event consumer that converts reviewed normalized events into patient timeline/vitals/alert entries.
5. Promote the existing FHIR demo connection panel into a real FHIR Connector configuration surface.
6. Promote medical IoT demo contracts into a Device Connector with transport adapters kept separate from normalization.
7. Promote notifications into a Notification Connector with provider plugins and delivery audit.

## Revenue Readiness Interpretation

For pilots, the current code can credibly demonstrate an integration-platform vision with demo FHIR/HL7/device/notification surfaces. It should not be sold as live device integration yet.

The shortest revenue-safe message is:

CareDroid Emergency OS has an integration-platform foundation with FHIR, HL7, device telemetry, and notification readiness patterns. Production deployment requires connecting hospital-approved sources into the Integration Hub and validating event routing under clinical governance.

## Bottom Line

Do not build `Apple Connector`, `Samsung Connector`, `Garmin Connector`, `Fitbit Connector`, `Monitor Connector`, and `ECG Connector` as separate systems.

The codebase already points toward the better architecture:

`Integration Hub -> FHIR Connector / Device Connector / Notification Connector -> Emergency OS`

That is the smallest path that can support consumer wearables, medical monitors, EMS feeds, provincial systems, EHRs, and hospital alerting without creating vendor-specific technical debt.
