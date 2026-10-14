# CareDroid — Requirements Traceability Matrix (RTM)

**Document Version:** 3.0.0  
**Status:** Living Engineering Traceability Matrix & Release Authority  
**Lead Authors:** Senior Business Analyst, QA Lead, Principal Enterprise Architect  
**Classification:** Enterprise Healthcare Architecture & Due Diligence Authority  

---

## 1. Traceability Architecture: Business -> Product -> Architecture -> Implementation -> Verification

This matrix provides end-to-end forward and backward traceability, establishing that every business requirement in the BRD maps to a concrete PRD feature specification, system architecture token, implementing codebase component, and automated verification test suite.

```mermaid
flowchart LR
    BRD["Business Requirement (BRD)"] --> PRD["Product Feature Spec (PRD)"]
    PRD --> Arch["Architecture / Design Token"]
    Arch --> Impl["Implementing Service / Component"]
    Impl --> Test["Automated Test Suite (Vitest / Jest)"]
```

---

## 2. Master Traceability Mapping Table

| BRD Requirement ID | PRD Feature ID | Architecture Standard / Design Token | Implementing Component / Service | Automated Verification Test Suite |
| :--- | :--- | :--- | :--- | :--- |
| **BRD-REQ-01** (Rapid Vital Entry) | `PRD-TRI-01` | `--cdl-input-height: 32px`, age-norm z-scores | `src/pages/emergency/TriageWorkspace.tsx`<br>`src/services/triageEngine.ts` | `vitest run src/utils/patientVitals.test.ts` |
| **BRD-REQ-02** (CTAS Acuity Scoring) | `PRD-TRI-02` | `--cdl-critical`, `--cdl-urgent` pulse tokens | `src/engine/triageAcuity.ts`<br>`src/services/triageEngine.ts` | `vitest run src/engine/reassessmentEngine.test.ts` |
| **BRD-REQ-03** (Mandatory Human Confirmation)| `PRD-TRI-03` | Modal barrier, `PendingToolAction` | `src/components/triage/TriageAcuityModal.tsx` | `vitest run src/engine/reassessmentEngine.test.ts` |
| **BRD-REQ-04** (Red Flag Visual Banners) | `PRD-TRI-04` | `--cdl-critical-surface: #dc2626` | `src/components/alerts/ClinicalRedFlagBanner.tsx` | `vitest run src/styles/cdl-v2/visual-upgrade.contract.test.ts` |
| **BRD-REQ-05** (Real-Time Whiteboard Push) | `PRD-WBD-04` | Sub-500ms Socket.IO `/emergency-os` | `backend/src/modules/emergency-os/emergency-os.gateway.ts`<br>`src/pages/emergency/EmergencyWhiteboard.tsx` | `npm --prefix backend test emergency-os.gateway.spec.ts` |
| **BRD-REQ-06** (Pod & Bed Spatial Layout) | `PRD-WBD-01` | `--cdl-surface-card: #ffffff`, `--cdl-border` | `src/pages/emergency/EmergencyWhiteboard.tsx` | `vitest run src/styles/cdl-v2/visual-upgrade.contract.test.ts` |
| **BRD-REQ-07** (DOM Virtualization Limit) | `PRD-WBD-03` | Strict ≤ 18 card DOM rendering budget | `src/data/whiteboardOperationalLoadModel.ts` | `vitest run src/data/whiteboardOperationalLoadModel.test.ts` |
| **BRD-REQ-08** (Slide-out Encounter Drawer)| `PRD-WBD-05` | 480px right-rail drawer, `useModalDialog` | `src/components/encounters/PatientInspectionDrawer.tsx` | `vitest run src/hooks/useModalDialog.test.tsx` |
| **BRD-REQ-09** (Deterministic Pediatric CDS)| `PRD-TLS-01` | 100% deterministic TypeScript arithmetic | `src/pages/tools/Calculators.tsx`<br>`src/services/clinicalOrchestratorApi.ts` | `vitest run src/pages/tools/Calculators.test.tsx` |
| **BRD-REQ-10** (Formulary Ceiling Hard Stops)| `PRD-TLS-01` | Adult maximum dose clamp | `src/pages/tools/Calculators.tsx` | `vitest run src/pages/tools/Calculators.formSmoke.test.tsx` |
| **BRD-REQ-11** (Evidence Citation Grounding)| `PRD-TLS-03` | Clickable DOI links & confidence intervals | `src/pages/tools/Calculators.tsx`<br>`docs/business/EVIDENCE_REGISTER.md` | `vitest run src/services/livingDocumentationService.test.ts` |
| **BRD-REQ-12** (Inbound EMS Telemetry) | `PRD-EMS-01` | Sentinel NEMSIS v3 JSON schema | `backend/src/modules/sentinel/sentinel.service.ts`<br>`src/pages/emergency/EmsGateway.tsx` | `vitest run src/pages/emergency/EmsGateway.test.tsx` |
| **BRD-REQ-13** (Pre-Arrival Suite Reserve) | `PRD-EMS-02` | One-click trauma room reservation | `src/pages/emergency/EdReadinessWorkspace.tsx` | `vitest run src/routes/clinicalToolRoutes.test.ts` |
| **BRD-REQ-14** (Electronic Nurse Handoff) | `PRD-EMS-03` | Dual-party cryptographic signature | `src/pages/emergency/EmsHandoffWorkspace.tsx` | `vitest run src/services/apiClient.auth.test.ts` |
| **BRD-REQ-15** (Department Occupancy Gauge) | `PRD-CAP-01` | Multi-tier surge threshold meter | `src/pages/emergency/CapacityBoard.tsx` | `vitest run src/engine/capacityEngine.test.ts` |
| **BRD-REQ-16** (Inpatient Boarding Tracker)| `PRD-CAP-02` | Elapsed boarding hours elapsed timer | `src/pages/emergency/InpatientBoardingWorkspace.tsx`| `vitest run src/engine/capacityEngine.test.ts` |
| **BRD-REQ-17** (Chief Investigation Audit) | `PRD-CHF-01` | Longitudinal bottleneck analysis engine | `backend/src/modules/chief-investigation`<br>`src/pages/emergency/ChiefInvestigationWorkspace.tsx`| `npm --prefix backend test chief-investigation.service.spec.ts` |
| **BRD-REQ-18** (Zero PHI in Application Logs)| `PRD-SEC-01` | Operational metadata only formatter | `backend/src/common/logger/sanitizing-logger.ts` | `npm --prefix backend test sanitizing-logger.spec.ts` |
| **BRD-REQ-19** (Asymmetric Token Security) | `PRD-SEC-02` | 15-minute RS256 JWT + HttpOnly RTR | `backend/src/modules/auth/auth.service.ts` | `npm --prefix backend test auth.service.spec.ts` |
| **BRD-REQ-20** (Package Boundary Isolation) | `PRD-ARC-01` | `src/` never imports `backend/src/` | `scripts/architecture-check.mjs` | `npm run architecture:check` |
| **BRD-REQ-21** (Database Migration Chain) | `PRD-DAT-01` | TypeORM Postgres verification | `scripts/db-verify.mjs` | `npm run db:verify` |

---

*This matrix is continuously validated against the codebase on every pull request.*
