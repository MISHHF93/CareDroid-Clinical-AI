# Unmounted TypeScript Report

Generated: 2026-06-12T03:27:29.433Z

## Summary

- Unreferenced non-test/support TypeScript candidates: 21
- Future-module review candidates by path/content terms: 108
- Policy used: report-only for uncertain files; no automatic moves/deletes.

## Unreferenced TypeScript Candidates

| File | Purpose | Action |
| --- | --- | --- |
| backend/src/middleware/logging.middleware.ts | TypeScript module | review-unmounted |
| backend/src/modules/auth/entities/index.ts | entity | review-unmounted |
| backend/src/modules/auth/entities/refresh-token.entity.ts | entity | review-unmounted |
| backend/src/modules/auth/guards/two-factor-enforcement.guard.ts | TypeScript module | review-unmounted |
| backend/src/modules/auth/services/device-fingerprint.service.ts | service | review-unmounted |
| backend/src/modules/auth/services/emergency-access.service.ts | service | review-unmounted |
| backend/src/modules/auth/services/index.ts | TypeScript module | review-unmounted |
| backend/src/modules/cost-optimizer/index.ts | TypeScript module | review-unmounted |
| backend/src/modules/evaluation/index.ts | TypeScript module | review-future-module |
| backend/src/modules/live-tracking/device-live-tracking.controller.ts | Nest controller | review-future-module |
| backend/src/modules/live-tracking/hospital-live-tracking.controller.ts | Nest controller | review-future-module |
| backend/src/modules/live-tracking/hospital-operations-iot-fleet.contracts.ts | TypeScript module | review-future-module |
| backend/src/modules/memory/index.ts | TypeScript module | review-future-module |
| backend/src/modules/notifications/entities/index.ts | entity | review-unmounted |
| backend/src/modules/notifications/services/index.ts | TypeScript module | review-unmounted |
| backend/src/modules/platform-governance/entities/platform-governance.entity.ts | entity | review-future-module |
| backend/src/modules/tenant-context/tenant-context.decorator.ts | TypeScript module | review-unmounted |
| backend/src/modules/tool-calling/index.ts | TypeScript module | review-unmounted |
| backend/src/modules/training/index.ts | TypeScript module | review-future-module |
| config/criticalChecklists.ts | configuration | review-unmounted |
| lib/ai/responseParser.ts | TypeScript module | review-unmounted |

## Future-Module Review Candidates

| File | Reason | Action |
| --- | --- | --- |
| backend/src/database/migrations/1770500000000-CreatePlatformGovernanceTables.ts | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| backend/src/database/migrations/1770600000000-CreateClinicalGovernanceWorkflowTables.ts | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| backend/src/modules/equity/equity.module.ts | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| backend/src/modules/fleet/fleet-audit.service.ts | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| backend/src/modules/fleet/fleet.controller.ts | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| backend/src/modules/fleet/fleet.data.ts | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| backend/src/modules/fleet/fleet.module.ts | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| backend/src/modules/fleet/fleet.service.spec.ts | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| backend/src/modules/fleet/fleet.service.ts | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| backend/src/modules/fleet/fleet.types.ts | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| backend/src/modules/fleet/index.ts | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| backend/src/modules/fleet/vehicle-tracking.service.spec.ts | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| backend/src/modules/fleet/vehicle-tracking.service.ts | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| backend/src/modules/governance/governance.module.ts | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| backend/src/modules/governance/governance.services.spec.ts | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| backend/src/modules/human-review/human-review.module.ts | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| backend/src/modules/live-tracking/hospital-operations-iot-fleet.contracts.ts | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| backend/src/modules/platform-assets/digital-twin.service.spec.ts | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| backend/src/modules/platform-assets/digital-twin.service.ts | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| backend/src/modules/platform-assets/platform-governance-registry.service.spec.ts | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| backend/src/modules/platform-assets/platform-governance-registry.service.ts | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| backend/src/modules/platform-governance/dto/platform-governance.dto.ts | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| backend/src/modules/platform-governance/entities/platform-governance.entities.ts | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| backend/src/modules/platform-governance/entities/platform-governance.entity.ts | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| backend/src/modules/platform-governance/index.ts | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| backend/src/modules/platform-governance/platform-governance.controller.ts | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| backend/src/modules/platform-governance/platform-governance.module.ts | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| backend/src/modules/platform-governance/platform-governance.service.spec.ts | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| backend/src/modules/platform-governance/platform-governance.service.ts | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| backend/src/modules/privacy-center/privacy-center.module.ts | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| backend/src/modules/regulatory/regulatory.module.ts | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| backend/src/modules/simulation/competency.service.ts | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| backend/src/modules/simulation/debrief.service.ts | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| backend/src/modules/simulation/index.ts | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| backend/src/modules/simulation/simulation-outcome.service.ts | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| backend/src/modules/simulation/simulation-run.service.ts | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| backend/src/modules/simulation/simulation-scenario.service.ts | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| backend/src/modules/simulation/simulation.controller.ts | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| backend/src/modules/simulation/simulation.module.ts | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| backend/src/modules/simulation/simulation.types.ts | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| backend/src/modules/training/index.ts | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| backend/src/modules/training/training.controller.ts | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| backend/src/modules/training/training.module.ts | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| backend/src/modules/training/training.service.spec.ts | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| backend/src/modules/training/training.service.ts | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| backend/src/modules/training/training.types.ts | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| src/data/chatAssistedFleet/dispatchAi.js | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| src/data/enterpriseReadiness.js | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| src/data/enterpriseReadiness.test.js | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| src/data/fleetCommandWiring.test.js | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| src/data/hospitalOperationsIotFleetPack.test.js | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| src/data/medicalSimulationCatalog.js | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| src/data/medicalSimulationCatalog.test.js | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| src/data/pr6FleetComprehensive.test.jsx | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| src/data/prFleetConsistency.test.js | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| src/data/prFleetTestConstants.js | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| src/data/researchEvidenceHub.js | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| src/data/researchEvidenceHub.test.js | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| src/data/simulationLaboratoryViewerWiring.test.js | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| src/data/testHelpers/fleetToolsTestFixtures.js | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| src/pages/DeviceFleetManagement.jsx | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| src/pages/DeviceFleetManagement.test.jsx | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| src/pages/EnterpriseReadinessPage.jsx | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| src/pages/EnterpriseReadinessPage.test.jsx | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| src/pages/GovernanceRegistry.jsx | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| src/pages/GovernanceRegistry.test.jsx | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| src/pages/LaboratoryDashboard.jsx | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| src/pages/MedicalIotDashboard.jsx | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| src/pages/MedicalIotDashboard.test.jsx | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| src/pages/MedicalSimulationSuite.jsx | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| src/pages/ResearchEvidenceHub.jsx | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| src/pages/ResearchEvidenceHub.test.jsx | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| src/pages/Settings.privacyData.test.jsx | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| src/pages/SimulationLaboratoryViewer.test.jsx | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| src/pages/SimulationOutcomes.jsx | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| src/pages/SimulationScenarioPlayer.jsx | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| src/pages/TrainingDashboard.jsx | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| src/pages/TrainingDashboard.test.jsx | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| src/pages/fleet/FleetDashboard.jsx | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| src/pages/fleet/FleetDashboard.route.test.jsx | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| src/pages/fleet/FleetDashboard.test.jsx | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| src/pages/fleet/FleetDashboardWidgets.jsx | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| src/pages/fleet/FleetLiveMap.jsx | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| src/pages/fleet/FleetLiveMap.test.jsx | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| src/pages/fleet/FleetPageChrome.jsx | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| src/pages/fleet/PredictiveMaintenance.jsx | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| src/pages/fleet/PredictiveMaintenance.test.jsx | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| src/pages/fleet/PredictiveMaintenanceWidgets.jsx | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| src/pages/fleet/PredictiveMaintenanceWidgets.test.js | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| src/pages/fleet/RouteOptimizer.jsx | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| src/pages/fleet/RouteOptimizer.test.jsx | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| src/pages/fleet/RouteOptimizerWidgets.jsx | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| src/pages/fleet/RouteOptimizerWidgets.test.js | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| src/pages/fleet/fleet.responsive.test.js | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| src/pages/fleet/fleetUxAccessibility.test.js | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| src/pages/legal/PrivacyPolicy.jsx | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| src/pages/platform/PlatformGovernanceWorkspace.jsx | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| src/pages/platform/PlatformGovernanceWorkspace.test.jsx | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| src/services/emergencySimulationScenariosService.js | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| src/services/enterpriseIdentityApi.js | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| src/services/enterpriseIdentityApi.test.js | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| src/services/fleetTelemetryService.js | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| src/services/fleetTelemetryService.test.js | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| src/services/medicalIotService.js | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| src/services/medicalIotService.test.js | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| src/services/platformGovernanceApi.js | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| src/services/platformGovernanceApi.test.js | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |
| src/services/trainingApi.js | Matches future/non-emergency platform term but may still be compiled or tested | review before moving to src/features/future-modules/_review/ |

## Explicitly Not Deleted

Files containing terms such as `fleet`, `lab`, `research`, `iot`, `governance`, and `enterprise` were not deleted because many are imported by backend modules, test suites, product catalog data, or future-route redirects.

