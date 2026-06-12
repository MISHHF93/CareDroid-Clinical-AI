# CareDroid Emergency OS Audit

Audit date: 2026-06-11

## Product Direction

CareDroid is being migrated from a broad healthcare AI platform into a dedicated Emergency Department Operating System.

Primary product:

**CareDroid Emergency OS**

Tagline:

AI-assisted patient flow for emergency departments and urgent care teams.

Operational target:

- 50-150 patients/day
- 5-10 staff
- Whiteboard-first workflow
- EMS coordination
- Smart Intake identity safety
- Reassessment safety
- Capacity and boarding awareness
- Low cognitive load

## Primary Route Contract

The active product route contract is:

- `/emergency/whiteboard`
- `/emergency/patients`
- `/emergency/ems`
- `/emergency/intake`
- `/emergency/queues`
- `/emergency/reassessment`
- `/emergency/capacity`
- `/emergency/boarding`
- `/emergency/referrals`
- `/emergency/copilot`
- `/emergency/analytics`
- `/emergency/settings`

Required redirects:

- `/` -> `/emergency/whiteboard`
- `/dashboard` -> `/emergency/whiteboard`
- `/home` -> `/emergency/whiteboard`
- `/workspace` -> `/emergency/whiteboard`
- `/app` -> `/emergency/whiteboard`
- `/emergency` -> `/emergency/whiteboard`

## Current Active Emergency OS Inventory

Pages and route targets:

- `src/components/EmergencyWhiteboard.jsx`
- `src/components/EMSPipeline.jsx`
- `src/pages/emergency/SmartIntake.jsx`
- `src/components/ReferralPanel.jsx`
- `src/pages/emergency/EmergencyAnalytics.jsx`
- `src/pages/emergency/EmergencySettings.jsx`
- `src/pages/emergency/ClinicalCalculatorHub.jsx`
- `src/components/ShiftSummary.jsx`

Layouts:

- `src/layout/AppShell.jsx`
- `src/layout/AppShell.css`

Stores and state:

- `store/emergencyStore.ts`
- `store/featureStore.ts`

Emergency domain/types:

- `types/emergency.ts`
- `backend/src/models/Patient.ts`
- `backend/src/models/PatientJourney.ts`
- `backend/src/models/SmartIntake.ts`

Emergency engines/services:

- `engine/alertEngine.ts`
- `engine/triageEngine.ts`
- `src/utils/longWaitRescue.js`
- `src/utils/vitalsAlertPipeline.js`
- `src/utils/reassessmentScheduler.js`
- `src/utils/staffManagement.js`
- `src/utils/crisisMode.js`
- `src/utils/autoScorePopulator.js`
- `src/utils/whoNext.js`
- `backend/src/services/capacity.service.ts`
- `backend/src/services/reassessment.service.ts`
- `backend/src/services/ems.service.ts`
- `backend/src/services/copilot.service.ts`
- `backend/src/services/smart-intake.service.ts`

Emergency APIs:

- `backend/src/api/capacity.routes.ts`
- `backend/src/api/copilot.routes.ts`
- `backend/src/api/ems.routes.ts`
- `backend/src/api/reassessment.routes.ts`
- `backend/src/api/smart-intake.routes.ts`

Fixtures:

- `backend/src/fixtures/smart-intake.fixtures.ts`
- `src/data/smartIntakeFixtures.js`
- `store/emergencyStore.ts` seeded operational data

Feature flags:

- `emergency_whiteboard`
- `smart_intake`
- `ems_pipeline`
- `referral_intelligence`
- `capacity_intelligence`
- `queue_intelligence`
- `reassessment_engine`
- `ed_copilot`
- `shift_summary`
- `emergency_settings`

## Future-Module Inventory

The following modules are not part of the active Emergency OS product and should be moved to `future-modules` or deleted in a dedicated destructive cleanup:

Frontend future modules:

- `src/pages/fleet`
- `src/pages/platform`
- `src/pages/commercial`
- `src/pages/organization`
- `src/pages/ResearchEvidenceHub.jsx`
- `src/pages/ClinicalKnowledgeGraph.jsx`
- `src/pages/ClinicalDocumentationAssistant.jsx`
- `src/pages/Competencies.jsx`
- `src/pages/Credentials.jsx`
- `src/pages/MedicalSimulationSuite.jsx`
- `src/pages/SimulationOutcomes.jsx`
- `src/pages/LaboratoryDashboard.jsx`
- `src/pages/DeviceFleetManagement.jsx`
- `src/pages/MedicalIotDashboard.jsx`
- `src/pages/DigitalTwinIntelligence.jsx`
- `src/pages/GovernanceRegistry.jsx`
- `src/pages/ExecutiveCommandCenter.jsx`
- `src/pages/AiCommandCenterDashboard.jsx`
- `src/pages/PlatformLearningEngine.jsx`
- `src/pages/PlatformSelfDiagnostics.jsx`

Backend future modules:

- `backend/src/modules/fleet`
- `backend/src/modules/telemetry`
- `backend/src/modules/hospital-map`
- `backend/src/modules/live-tracking`
- `backend/src/modules/simulation`
- `backend/src/modules/governance`
- `backend/src/modules/platform-governance`
- `backend/src/modules/llm-security`
- `backend/src/modules/interoperability`
- `backend/src/modules/regulatory`
- `backend/src/modules/equity`
- `backend/src/modules/human-review`
- `backend/src/modules/privacy-center`
- `backend/src/modules/ehr-audit`
- `backend/src/modules/platform-assets`
- `backend/src/modules/product-catalog`
- `backend/src/modules/training`
- `backend/src/modules/evaluation`
- `backend/src/modules/cost-optimizer`
- `backend/src/modules/memory`
- `backend/src/modules/artifacts`
- `backend/src/modules/tool-calling`

## Duplicate Architecture Findings

Duplicate dashboards:

- `src/pages/CommandDashboard.jsx`
- `src/pages/AiCommandCenterDashboard.jsx`
- `src/pages/ExecutiveCommandCenter.jsx`
- `src/pages/AnalyticsDashboard.jsx`
- `src/pages/CostAnalyticsDashboard.jsx`
- `src/pages/WorkspaceHome.jsx`

Duplicate route/navigation sources:

- `src/App.jsx` inline route table
- `src/config/routes.config.js`
- `src/config/navigation.config.js`
- `src/navigation/primaryNavigation.js` compatibility re-export
- `src/data/workspaceArchitecture.js`
- `src/data/emergencyOperatingSystem.js`

Duplicate Emergency OS service layers:

- Newer operational source: `store/emergencyStore.ts`
- Older demo services: `src/services/emergencyWhiteboardService.js`, `src/services/emergencyOperatingSystemService.js`, `src/services/emergencyFlowEngineService.js`, `src/services/PatientJourneyEngine.js`, `src/services/ReassessmentEngine.js`, `src/services/CapacityIntelligence.js`

## Dead Code and Orphan Candidates

The dry-run cleanup scripts found many remaining references to ICU, Lab, Research, Fleet, IoT, Digital Twin, Governance, and Command Center code. These remain active imports in backend modules and frontend future-module pages, so direct deletion without import rewrites will break the build.

Primary stale import families:

- Backend AI/chat still imports platform governance.
- Backend fleet module imports its own fleet services/types.
- Backend platform assets still imports digital twin services.
- Frontend route smoke tests still import future pages.
- Frontend data catalog still contains research, fleet, IoT, lab, ICU, governance, and command-center metadata.

## Cleanup Started

Created cleanup and verification tooling:

- `scripts/audit-and-clean.sh`
- `scripts/audit-and-clean.ps1`
- `scripts/clean-frontend.sh`
- `scripts/clean-frontend.ps1`
- `scripts/route-audit.ts`
- `scripts/verify-emergency-os.sh`
- `scripts/verify-emergency-os.ps1`

Created Mongo-style cleanup migrations:

- `backend/migrations/004_emergency_os_cleanup.js`
- `backend/migrations/005_add_patient_verification_fields.js`

Cleanup strategy:

- Default mode is dry-run.
- Destructive deletion requires `CLEAN_EXECUTE=true`.
- Active UX cleanup should happen before destructive filesystem cleanup.

## Current Blockers

- The backend is still NestJS/TypeORM by default, with Mongoose Emergency OS routes mounted only behind `ENABLE_MONGOOSE_EMERGENCY_OS=true`.
- Several backend modules imported by `backend/src/app.module.ts` are future modules but still required for current build.
- Several frontend tests and catalogs still import future-module pages.
- A true destructive cleanup requires removing module imports from `backend/src/app.module.ts`, removing future routes from `src/App.jsx`, and rewriting tests/catalogs.

## Validation Snapshot

Recent validation:

- `npm run typecheck:frontend` passed.
- `cd backend && npm run build` passed.
- `scripts/route-audit.ts` reports Emergency OS API route files as allowed.
- `scripts/verify-emergency-os.ps1` fails intentionally because legacy/future-module references still exist.

