# CareDroid — Requirements Traceability Matrix (RTM)

**Document Version:** 2.2.0  
**Status:** Living Engineering Traceability Matrix  
**Author:** Senior Business Analyst, QA Lead  

---

## 1. Traceability Mapping: Business -> Technical -> Implementation -> Test

| BRD Requirement | PRD Feature | Architecture / Design Token | Implementing Component / Service | Verification Test Suite |
| :--- | :--- | :--- | :--- | :--- |
| **BR-TRI-01** (Rapid Vital Entry) | PRD-TRI-01 | `--cdl-input-height`, age-norm validator | `src/pages/emergency/TriageWorkspace.tsx` | `vitest run src/utils/patientVitals.test.ts` |
| **BR-TRI-02** (CTAS Acuity Scoring) | PRD-TRI-02 | `--cdl-critical`, `--cdl-urgent` tokens | `src/services/triageEngine.ts` | `vitest run src/engine/reassessmentEngine.test.ts` |
| **BR-WBD-01** (Real-Time Whiteboard) | PRD-WBD-01 | `--cdl-card-*`, WebSocket client | `src/pages/emergency/EmergencyWhiteboard.tsx` | `vitest run src/styles/cdl-v2/visual-upgrade.contract.test.ts` |
| **BR-SAF-01** (Pediatric Dosing CDS) | PRD-TLS-01 | Deterministic calculation engine | `src/pages/tools/Calculators.tsx` | `vitest run src/pages/tools/Calculators.test.tsx` |
| **BR-EMS-01** (EMS Telemetry) | PRD-EMS-01 | Inbound telemetry schema | `src/pages/emergency/EmsGateway.tsx` | `vitest run src/pages/emergency/EmsGateway.test.tsx` |
| **BR-CAP-01** (Surge & Bed Board) | PRD-CAP-01 | Capacity gauge, bottleneck map | `src/pages/emergency/CapacityBoard.tsx` | `vitest run src/engine/capacityEngine.test.ts` |
| **BR-SEC-01** (Audit Logging) | PRD-SEC-01 | Append-only cryptographically chained table | `backend/src/modules/audit/audit.service.ts` | `npm --prefix backend test audit.service.spec.ts` |

---

