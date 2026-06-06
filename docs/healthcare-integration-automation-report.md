# Healthcare Integration Automation Readiness Report

Generated: 2026-06-06

## Purpose

Assess readiness for converting healthcare integration inputs into safe automation decisions using the sequence:

```text
Integration Event -> Normalized Event -> Automation Trigger -> Safe Action
```

The target architecture must support multiple organizations and integration vendors. No source, parser, trigger, or action should assume one hospital, one EHR, one LIS, or one device fleet.

## Executive Summary

CareDroid has an interoperability module and demo-ready platform system surfaces, but integration automation needs a dedicated normalization and routing layer before any live action is allowed. The safest near-term implementation is a registry-backed router that accepts source-specific integration events, normalizes supported clinical/operational signals, evaluates conservative triggers, and returns review-oriented safe actions rather than direct clinical writeback or device control.

Readiness is strongest for FHIR Observation and device telemetry because both map cleanly to parameter, subject, timestamp, source, and severity fields. FHIR Patient, MedicationRequest, Encounter, HL7 ADT, HL7 ORU, and LIS result feeds are ready for schema registration and placeholder normalization where the current codebase does not yet include vendor parsers. Unsupported integrations must be clearly labeled rather than silently ignored.

## Source Readiness Matrix

| Source | Automation readiness | Normalization target | Trigger readiness | Safe-action boundary |
| --- | --- | --- | --- | --- |
| FHIR Patient | Contract-ready | `patient` event with patient identifier, demographics metadata, and source provenance | Identity, registration, duplicate-review, and care-context triggers after MPI validation | Queue review or create non-clinical workspace task; no automatic chart merge |
| FHIR Observation | Ready for first implementation | `observation` event with code, value, unit, interpretation, subject, encounter, and observed time | Critical value, abnormal trend, stale feed, and routing triggers | Notify/review/escalate to human workflow; no automatic diagnosis or orders |
| FHIR MedicationRequest | Contract-ready | `medication_request` event with medication, intent, status, requester, subject, and authored time | Medication reconciliation and safety review triggers after formulary/context checks | Create review task; no automatic prescribing, discontinuation, or administration |
| FHIR Encounter | Contract-ready | `encounter` event with class, status, location, participant, subject, and period | Admission, discharge, transfer, bed-status, and handoff triggers | Update operational work queue; no autonomous billing or care-team assignment |
| HL7 ADT | Placeholder-ready | `encounter` or `patient` event derived from ADT message type, patient ID, visit ID, location, and timestamp | Admission/discharge/transfer workflow triggers after parser validation | Queue operational update for review; no irreversible patient-location writeback |
| HL7 ORU | Placeholder-ready | `lab_result` or `observation` event derived from ORU message, OBX segments, abnormal flags, and result time | Critical lab/result review triggers once OBX parsing is validated | Notify responsible team and require acknowledgement; no automatic treatment action |
| LIS results | Contract-ready | `lab_result` event with accession, analyte, value, unit, reference range, abnormal flag, and result status | Critical result, corrected result, delayed result, and quality-control triggers | Escalate to lab/clinical review queue; no automatic chart correction without source confirmation |
| Device telemetry | Ready for first implementation | `device_telemetry` event with device ID, metric, value, unit, quality, location, and observed time | Offline, stale, low battery, critical parameter, calibration, and maintenance triggers | Create biomedical/ops task or alert; no direct device control |

## Required Architecture

1. **IntegrationEventRegistry** records supported integration families, event types, minimum required fields, and unsupported labels.
2. **NormalizedClinicalEvent** defines the shared event shape used after source-specific normalization.
3. **IntegrationAutomationRouter** converts integration events into normalized events, evaluates automation triggers, and returns safe actions with explicit review requirements.

## Safety Requirements

- Every event must carry tenant or source context such as `organizationId`, `workspaceId`, `sourceSystem`, and `receivedAt` when available.
- Unsupported event types must return a clear `unsupported_integration` label with the source and event type preserved for audit.
- Clinical actions must default to human review. The router may recommend notification, review queue, escalation, or operational task creation, but must not write orders, prescribe medications, merge patient records, or control devices.
- Normalization must remain vendor-neutral. Hospital-specific values belong in adapter configuration, not in router code.
- Placeholder HL7/LIS handling must be visibly labeled until production parsers validate segment-level semantics.

## Implementation Readiness

The initial implementation should support:

- FHIR Observation normalization from common FHIR R4 fields.
- HL7 ORU placeholder normalization from structured message metadata or OBX-like payload fields.
- Device telemetry normalization from generic telemetry event payloads.
- Trigger routing from normalized critical/abnormal/stale/device-warning signals into safe review or notification actions.
- Clear unsupported handling for unregistered event families or event types.

## Verification Plan

Focused tests should prove:

- FHIR Observation events normalize into a `NormalizedClinicalEvent`.
- HL7 ORU placeholder events normalize with placeholder provenance.
- Telemetry events normalize into device telemetry events.
- Normalized events can trigger safe automation actions requiring review.
- Unsupported integrations are labeled clearly and preserve source metadata.
