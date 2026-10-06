# CareDroid — API Architecture & Integration Specification

**Document Version:** 2.2.0  
**Status:** Living Engineering API Specification  
**Author:** Senior Backend Lead, DevSecOps Lead  
**Protocols:** REST (OpenAPI 3.1), WebSockets (Socket.IO / RFC 6455), FHIR R4  

---

## 1. REST API Design Standards

1. **Base URL:** `/api/v1` (with versioning headers supported).
2. **Payload Format:** `application/json; charset=utf-8`.
3. **Standard Envelope & Error Responses:**
   ```json
   {
     "success": false,
     "statusCode": 400,
     "error": "CLINICAL_VALIDATION_ERROR",
     "message": "Patient weight must be greater than 0 kg for pediatric dosing calculation.",
     "timestamp": "2026-10-06T03:30:00.000Z",
     "path": "/api/v1/tools/pediatric-dose",
     "correlationId": "req-98f2b4e1-2c09-4781"
   }
   ```

---

## 2. Core Endpoint Catalog

### 2.1 Patient & Triage Operations
- `POST /api/v1/emergency/reception/intake`: Registers newly arrived patient at triage desk.
- `GET /api/v1/emergency/triage/queue`: Returns un-triaged waiting list sorted by wait time.
- `POST /api/v1/emergency/triage/assess`: Submits verified vital signs and assigned CTAS acuity.
- `GET /api/v1/emergency/whiteboard/snapshot`: Returns full department state (beds, pods, active patients).

### 2.2 Clinical Decision Support
- `POST /api/v1/tools/pediatric-dose`: Computes deterministic weight-adjusted pediatric medication dosing.
- `POST /api/v1/tools/calculate`: Executes evidence-based clinical calculators (Wells, PERC, HEART, GCS).
- `POST /api/v1/ai/scribe/draft`: Ingests structured encounter vitals and labs to draft H&P note for clinician review.

### 2.3 EMS & Pre-Arrival
- `POST /api/v1/ems/pre-arrival`: Ingests inbound ambulance telemetry, ETA, and priority alert level.
- `POST /api/v1/ems/handoff/sign`: Dual-party electronic handoff between paramedic and triage nurse.

---

## 3. Real-Time WebSocket Channel Specifications

**Gateway:** `/emergency-os`  
**Authentication:** Bearer token transmitted in WebSocket handshake query (`auth.token`).

| Event Name | Direction | Payload Schema | Purpose |
| :--- | :--- | :--- | :--- |
| `subscribe_pod` | Client -> Server | `{ podId: string }` | Subscribes client to delta updates for a specific acute care pod. |
| `PATIENT_ARRIVED` | Server -> Client | `{ patientId: string, arrivalTime: string, complaint: string }` | Notifies triage desk and waiting board of new walk-in arrival. |
| `VITALS_UPDATED` | Server -> Client | `{ patientId: string, vitals: VitalSignsRecord }` | Streams updated bedside monitor vitals to the whiteboard. |
| `SEPSIS_ALERT` | Server -> Client | `{ patientId: string, sofaScore: number, urgency: "CRITICAL" }` | High-priority visual and acoustic notification across nursing pods. |
| `EMS_PRE_ARRIVAL`| Server -> Client | `{ callSign: string, etaMinutes: number, condition: string }` | Inbound ambulance banner update on charge nurse command rail. |

---

