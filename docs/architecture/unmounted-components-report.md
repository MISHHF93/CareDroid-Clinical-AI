# Unmounted Components Report

Generated: 2026-06-12T02:34:02.555Z

Scanned 2209 text/code files. Resolved 5609 relative import edges. Found 282 backend endpoint declarations and 1239 frontend API references.

Files below are unmounted, orphan candidates, duplicate/future artifacts, or tests/support files according to import reachability and path classification.

| File |Imported By |Imports |Classification |
| --- | --- | --- | --- |
| backend/src/models/Patient.ts | 6 | 0 | Connected Emergency OS |
| backend/src/models/PatientJourney.ts | 0 | 0 | Connected Emergency OS |
| backend/src/models/SmartIntake.ts | 2 | 0 | Connected Emergency OS |
| backend/src/modules/platform-systems/platform-systems.service.ts | 6 | 1 | Connected Emergency OS |
| backend/src/services/capacity.service.ts | 2 | 1 | Connected Emergency OS |
| backend/src/services/copilot.service.ts | 1 | 4 | Connected Emergency OS |
| backend/src/services/ems.service.ts | 2 | 1 | Connected Emergency OS |
| backend/src/services/reassessment.service.ts | 3 | 1 | Connected Emergency OS |
| backend/src/services/smart-intake.service.ts | 1 | 2 | Connected Emergency OS |
| src/App.jsx | 4 | 152 | Connected Emergency OS |
| src/components/ChatInterface.jsx | 2 | 21 | Connected Emergency OS |
| src/components/CommandPalette.jsx | 1 | 4 | Connected Emergency OS |
| src/components/EmergencyWhiteboard.jsx | 3 | 9 | Connected Emergency OS |
| src/components/EMSCriticalBroadcast.jsx | 1 | 5 | Connected Emergency OS |
| src/components/EMSPipeline.jsx | 2 | 4 | Connected Emergency OS |
| src/components/EMSPressureScore.jsx | 4 | 2 | Connected Emergency OS |
| src/components/JourneyTimeline.jsx | 1 | 3 | Connected Emergency OS |
| src/components/NewPatientIntake.jsx | 2 | 4 | Connected Emergency OS |
| src/components/PatientCard.jsx | 2 | 18 | Connected Emergency OS |
| src/components/QueueIntelligencePanel.jsx | 3 | 2 | Connected Emergency OS |
| src/components/ReassessmentDrawer.jsx | 1 | 4 | Connected Emergency OS |
| src/components/ReferralPanel.jsx | 2 | 4 | Connected Emergency OS |
| src/components/WhoNextPanel.jsx | 2 | 5 | Connected Emergency OS |
| src/config/navigation.config.js | 15 | 1 | Connected Emergency OS |
| src/config/routes.config.js | 27 | 0 | Connected Emergency OS |
| src/data/searchFirstDiscovery.js | 4 | 11 | Connected Emergency OS |
| src/layout/AppShell.jsx | 2 | 20 | Connected Emergency OS |
| src/pages/emergency/EmergencyAnalytics.jsx | 1 | 2 | Connected Emergency OS |
| src/pages/emergency/SmartIntake.jsx | 1 | 3 | Connected Emergency OS |
| src/services/boardingIntelligenceEngine.js | 7 | 0 | Connected Emergency OS |
| src/services/clinicalChatService.js | 21 | 3 | Connected Emergency OS |
| src/services/emergencyAnalyticsApi.js | 2 | 2 | Connected Emergency OS |
| src/services/emergencyRealtimeService.js | 1 | 1 | Connected Emergency OS |
| src/services/patientManagementApi.js | 1 | 1 | Connected Emergency OS |
| src/services/queueIntelligenceService.js | 10 | 0 | Connected Emergency OS |
| src/services/referralHub.js | 6 | 0 | Connected Emergency OS |
| src/services/smartIntakeApi.js | 1 | 1 | Connected Emergency OS |
| src/utils/reassessmentScheduler.js | 3 | 0 | Connected Emergency OS |
| backend/src/fixtures/smart-intake.fixtures.ts | 0 | 1 | Duplicate or Legacy |
| backend/src/main.ts | 0 | 12 | Duplicate or Legacy |
| backend/src/modules/live-tracking/device-live-tracking.controller.ts | 0 | 1 | Duplicate or Legacy |
| backend/src/modules/live-tracking/hospital-live-tracking.controller.ts | 0 | 1 | Duplicate or Legacy |
| docs/architecture/component-dependency-map.md | 0 | 0 | Duplicate or Legacy |
| docs/architecture/unmounted-components-report.md | 0 | 0 | Duplicate or Legacy |
| docs/component-consolidation-report.md | 0 | 0 | Duplicate or Legacy |
| docs/component-density-optimization-report.md | 0 | 0 | Duplicate or Legacy |
| docs/component-stitching-and-redundancy-report.md | 0 | 0 | Duplicate or Legacy |
| docs/design-language-and-component-fit-report.md | 0 | 0 | Duplicate or Legacy |
| docs/route-layout-simplification-plan.md | 0 | 0 | Duplicate or Legacy |
| LAYOUT_CONFLICT_MAP.md | 0 | 0 | Duplicate or Legacy |
| src/main.jsx | 0 | 22 | Duplicate or Legacy |
| backend/src/database/migrations/1706608800000-AddAuditLogHashing.ts | 0 | 0 | Future Module / Legacy Platform Artifact |
| backend/src/database/migrations/1770500000000-CreatePlatformGovernanceTables.ts | 0 | 0 | Future Module / Legacy Platform Artifact |
| backend/src/database/migrations/1770600000000-CreateClinicalGovernanceWorkflowTables.ts | 0 | 0 | Future Module / Legacy Platform Artifact |
| backend/src/modules/audit/audit.controller.ts | 1 | 5 | Future Module / Legacy Platform Artifact |
| backend/src/modules/audit/audit.module.ts | 24 | 3 | Future Module / Legacy Platform Artifact |
| backend/src/modules/audit/audit.service.spec.ts | 0 | 2 | Future Module / Legacy Platform Artifact |
| backend/src/modules/audit/audit.service.ts | 42 | 1 | Future Module / Legacy Platform Artifact |
| backend/src/modules/audit/entities/audit-log.entity.ts | 46 | 1 | Future Module / Legacy Platform Artifact |
| backend/src/modules/automation-audit/automation-audit.controller.spec.ts | 0 | 2 | Future Module / Legacy Platform Artifact |
| backend/src/modules/automation-audit/automation-audit.controller.ts | 2 | 3 | Future Module / Legacy Platform Artifact |
| backend/src/modules/automation-audit/automation-audit.module.ts | 4 | 3 | Future Module / Legacy Platform Artifact |
| backend/src/modules/automation-audit/automation-audit.service.spec.ts | 0 | 2 | Future Module / Legacy Platform Artifact |
| backend/src/modules/automation-audit/automation-audit.service.ts | 6 | 2 | Future Module / Legacy Platform Artifact |
| backend/src/modules/automation-audit/dto/automation-audit.dto.ts | 2 | 1 | Future Module / Legacy Platform Artifact |
| backend/src/modules/automation-audit/entities/automation-audit-event.entity.ts | 9 | 0 | Future Module / Legacy Platform Artifact |
| backend/src/modules/clinical-intelligence/dto/explainability-audit.dto.ts | 2 | 0 | Future Module / Legacy Platform Artifact |
| backend/src/modules/ehr-audit/ehr-audit.module.ts | 1 | 4 | Future Module / Legacy Platform Artifact |
| backend/src/modules/fleet/fleet-audit.service.ts | 3 | 3 | Future Module / Legacy Platform Artifact |
| backend/src/modules/fleet/fleet.controller.ts | 1 | 7 | Future Module / Legacy Platform Artifact |
| backend/src/modules/fleet/fleet.data.ts | 3 | 1 | Future Module / Legacy Platform Artifact |
| backend/src/modules/fleet/fleet.module.ts | 2 | 5 | Future Module / Legacy Platform Artifact |
| backend/src/modules/fleet/fleet.service.spec.ts | 0 | 1 | Future Module / Legacy Platform Artifact |
| backend/src/modules/fleet/fleet.service.ts | 6 | 3 | Future Module / Legacy Platform Artifact |
| backend/src/modules/fleet/fleet.types.ts | 5 | 0 | Future Module / Legacy Platform Artifact |
| backend/src/modules/fleet/index.ts | 2 | 3 | Future Module / Legacy Platform Artifact |
| backend/src/modules/fleet/vehicle-tracking.service.spec.ts | 0 | 1 | Future Module / Legacy Platform Artifact |
| backend/src/modules/fleet/vehicle-tracking.service.ts | 5 | 3 | Future Module / Legacy Platform Artifact |
| backend/src/modules/governance/governance.module.ts | 2 | 4 | Future Module / Legacy Platform Artifact |
| backend/src/modules/governance/governance.services.spec.ts | 0 | 1 | Future Module / Legacy Platform Artifact |
| backend/src/modules/live-tracking/hospital-operations-iot-fleet.contracts.ts | 0 | 0 | Future Module / Legacy Platform Artifact |
| backend/src/modules/platform-assets/asset-access.service.ts | 4 | 8 | Future Module / Legacy Platform Artifact |
| backend/src/modules/platform-assets/asset-recommendation.service.ts | 2 | 4 | Future Module / Legacy Platform Artifact |
| backend/src/modules/platform-assets/asset-registry.schema.ts | 4 | 3 | Future Module / Legacy Platform Artifact |
| backend/src/modules/platform-assets/asset-registry.service.spec.ts | 0 | 6 | Future Module / Legacy Platform Artifact |
| backend/src/modules/platform-assets/asset-registry.service.ts | 6 | 3 | Future Module / Legacy Platform Artifact |
| backend/src/modules/platform-assets/automation-commercialization.spec.ts | 0 | 1 | Future Module / Legacy Platform Artifact |
| backend/src/modules/platform-assets/customer-success.service.spec.ts | 0 | 9 | Future Module / Legacy Platform Artifact |
| backend/src/modules/platform-assets/customer-success.service.ts | 3 | 8 | Future Module / Legacy Platform Artifact |
| backend/src/modules/platform-assets/data/platform-asset-seed.data.ts | 12 | 3 | Future Module / Legacy Platform Artifact |
| backend/src/modules/platform-assets/department-asset-mapping.service.spec.ts | 0 | 9 | Future Module / Legacy Platform Artifact |
| backend/src/modules/platform-assets/department-asset-mapping.service.ts | 5 | 8 | Future Module / Legacy Platform Artifact |
| backend/src/modules/platform-assets/department-taxonomy.ts | 9 | 2 | Future Module / Legacy Platform Artifact |
| backend/src/modules/platform-assets/digital-twin.service.spec.ts | 0 | 1 | Future Module / Legacy Platform Artifact |
| backend/src/modules/platform-assets/digital-twin.service.ts | 3 | 2 | Future Module / Legacy Platform Artifact |
| backend/src/modules/platform-assets/entities/asset-pack.entity.ts | 20 | 1 | Future Module / Legacy Platform Artifact |
| backend/src/modules/platform-assets/entities/organization-entitlement.entity.ts | 13 | 1 | Future Module / Legacy Platform Artifact |
| backend/src/modules/platform-assets/entities/platform-asset.entity.ts | 24 | 1 | Future Module / Legacy Platform Artifact |
| backend/src/modules/platform-assets/entities/role-profile.entity.ts | 6 | 0 | Future Module / Legacy Platform Artifact |
| backend/src/modules/platform-assets/entitlement.service.spec.ts | 0 | 8 | Future Module / Legacy Platform Artifact |
| backend/src/modules/platform-assets/entitlement.service.ts | 10 | 14 | Future Module / Legacy Platform Artifact |
| backend/src/modules/platform-assets/enums/platform-asset.enums.ts | 42 | 0 | Future Module / Legacy Platform Artifact |
| backend/src/modules/platform-assets/feature-flag.service.spec.ts | 0 | 2 | Future Module / Legacy Platform Artifact |
| backend/src/modules/platform-assets/feature-flag.service.ts | 6 | 1 | Future Module / Legacy Platform Artifact |
| backend/src/modules/platform-assets/organization-analytics.service.spec.ts | 0 | 8 | Future Module / Legacy Platform Artifact |
| backend/src/modules/platform-assets/organization-analytics.service.ts | 3 | 7 | Future Module / Legacy Platform Artifact |
| backend/src/modules/platform-assets/platform-assets.controller.spec.ts | 0 | 1 | Future Module / Legacy Platform Artifact |
| backend/src/modules/platform-assets/platform-assets.controller.ts | 2 | 16 | Future Module / Legacy Platform Artifact |
| backend/src/modules/platform-assets/platform-assets.module.ts | 6 | 29 | Future Module / Legacy Platform Artifact |
| backend/src/modules/platform-assets/platform-assets.seed.service.ts | 1 | 5 | Future Module / Legacy Platform Artifact |
| backend/src/modules/platform-assets/platform-assets.service.spec.ts | 0 | 9 | Future Module / Legacy Platform Artifact |
| backend/src/modules/platform-assets/platform-assets.service.ts | 20 | 9 | Future Module / Legacy Platform Artifact |
| backend/src/modules/platform-assets/platform-context.service.spec.ts | 0 | 9 | Future Module / Legacy Platform Artifact |
| backend/src/modules/platform-assets/platform-context.service.ts | 5 | 9 | Future Module / Legacy Platform Artifact |
| backend/src/modules/platform-assets/platform-governance-registry.service.spec.ts | 0 | 2 | Future Module / Legacy Platform Artifact |
| backend/src/modules/platform-assets/platform-governance-registry.service.ts | 3 | 3 | Future Module / Legacy Platform Artifact |
| backend/src/modules/platform-assets/service-line-architecture.service.spec.ts | 0 | 4 | Future Module / Legacy Platform Artifact |
| backend/src/modules/platform-assets/service-line-architecture.service.ts | 3 | 2 | Future Module / Legacy Platform Artifact |
| backend/src/modules/platform-assets/service-line-taxonomy.ts | 5 | 1 | Future Module / Legacy Platform Artifact |
| backend/src/modules/platform-governance/dto/platform-governance.dto.ts | 2 | 0 | Future Module / Legacy Platform Artifact |
| backend/src/modules/platform-governance/entities/platform-governance.entities.ts | 5 | 0 | Future Module / Legacy Platform Artifact |
| backend/src/modules/platform-governance/entities/platform-governance.entity.ts | 0 | 1 | Future Module / Legacy Platform Artifact |
| backend/src/modules/platform-governance/index.ts | 20 | 4 | Future Module / Legacy Platform Artifact |
| backend/src/modules/platform-governance/platform-governance.controller.ts | 1 | 4 | Future Module / Legacy Platform Artifact |
| backend/src/modules/platform-governance/platform-governance.module.ts | 1 | 6 | Future Module / Legacy Platform Artifact |
| backend/src/modules/platform-governance/platform-governance.service.spec.ts | 0 | 2 | Future Module / Legacy Platform Artifact |
| backend/src/modules/platform-governance/platform-governance.service.ts | 4 | 6 | Future Module / Legacy Platform Artifact |
| backend/src/modules/platform-systems/dto/platform-system.dto.ts | 1 | 0 | Future Module / Legacy Platform Artifact |
| backend/src/modules/platform-systems/platform-systems.controller.spec.ts | 0 | 1 | Future Module / Legacy Platform Artifact |
| backend/src/modules/platform-systems/platform-systems.controller.ts | 2 | 5 | Future Module / Legacy Platform Artifact |
| backend/src/modules/platform-systems/platform-systems.module.ts | 4 | 4 | Future Module / Legacy Platform Artifact |
| backend/src/modules/platform-systems/platform-systems.service.spec.ts | 0 | 1 | Future Module / Legacy Platform Artifact |
| backend/src/modules/product-catalog/entities/commercial-plan.entity.ts | 8 | 2 | Future Module / Legacy Platform Artifact |
| backend/src/modules/simulation/competency.service.ts | 3 | 0 | Future Module / Legacy Platform Artifact |
| backend/src/modules/simulation/debrief.service.ts | 3 | 1 | Future Module / Legacy Platform Artifact |
| backend/src/modules/simulation/index.ts | 1 | 8 | Future Module / Legacy Platform Artifact |
| backend/src/modules/simulation/simulation-outcome.service.ts | 4 | 1 | Future Module / Legacy Platform Artifact |
| backend/src/modules/simulation/simulation-run.service.ts | 3 | 4 | Future Module / Legacy Platform Artifact |
| backend/src/modules/simulation/simulation-scenario.service.ts | 4 | 1 | Future Module / Legacy Platform Artifact |
| backend/src/modules/simulation/simulation.controller.ts | 2 | 5 | Future Module / Legacy Platform Artifact |
| backend/src/modules/simulation/simulation.module.ts | 1 | 6 | Future Module / Legacy Platform Artifact |
| backend/src/modules/simulation/simulation.types.ts | 6 | 0 | Future Module / Legacy Platform Artifact |
| backend/src/modules/telemetry/telemetry-audit.service.ts | 4 | 3 | Future Module / Legacy Platform Artifact |
| backend/src/modules/tenant-context/tenant-data-isolation-audit.service.spec.ts | 0 | 2 | Future Module / Legacy Platform Artifact |
| backend/src/modules/tenant-context/tenant-data-isolation-audit.service.ts | 3 | 1 | Future Module / Legacy Platform Artifact |
| backend/src/modules/user-profile/activity.service.ts | 2 | 1 | Future Module / Legacy Platform Artifact |
| backend/src/modules/user-profile/dto/update-operational-profile.dto.ts | 2 | 0 | Future Module / Legacy Platform Artifact |
| backend/src/modules/user-profile/dto/update-user-preferences.dto.ts | 3 | 0 | Future Module / Legacy Platform Artifact |
| backend/src/modules/user-profile/entities/professional-profile.entity.ts | 2 | 0 | Future Module / Legacy Platform Artifact |
| backend/src/modules/user-profile/entities/user-preference.entity.ts | 2 | 0 | Future Module / Legacy Platform Artifact |
| backend/src/modules/user-profile/saas-profile.constants.ts | 2 | 0 | Future Module / Legacy Platform Artifact |
| backend/src/modules/user-profile/user-preferences.service.spec.ts | 0 | 1 | Future Module / Legacy Platform Artifact |
| backend/src/modules/user-profile/user-preferences.service.ts | 6 | 4 | Future Module / Legacy Platform Artifact |
| backend/src/modules/user-profile/user-profile.controller.ts | 1 | 3 | Future Module / Legacy Platform Artifact |
| backend/src/modules/user-profile/user-profile.module.ts | 2 | 13 | Future Module / Legacy Platform Artifact |
| backend/src/modules/user-profile/user-profile.service.ts | 2 | 12 | Future Module / Legacy Platform Artifact |
| backend/src/modules/user-profile/workspace.service.ts | 2 | 2 | Future Module / Legacy Platform Artifact |
| backend/src/modules/users/dto/update-profile.dto.ts | 1 | 0 | Future Module / Legacy Platform Artifact |
| backend/src/modules/users/entities/user-profile.entity.ts | 33 | 1 | Future Module / Legacy Platform Artifact |
| docs/frontend-page-normalization-audit.md | 0 | 0 | Future Module / Legacy Platform Artifact |

## Safe Cleanup Applied

- Added direct command-palette route commands for all 12 primary Emergency OS routes.
- Added Emergency OS destinations to search-first discovery.
- Kept legacy/future page files in place unless they are already redirected away from the active UX.
