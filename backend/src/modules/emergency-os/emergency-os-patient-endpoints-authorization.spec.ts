import { EmergencyOsController } from './emergency-os.controller';
import { PERMISSIONS_KEY } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';

/**
 * Cycle 238: these 8 routes handle patient-tied PHI/clinical-decision-support
 * data (workflow logs, document artifacts, orchestration state, patient-flow
 * AI recommendations, clinical-calculator results, copilot interactions) but
 * had no @RequirePermission/@Permissions/@AnyPermission decorator at all.
 * AuthorizationGuard fails OPEN when no permission metadata is present
 * (`if (!requiredPermissions && !anyPermissions) return true;`), so any
 * authenticated user of any role — including STUDENT, the one backend role
 * deliberately never granted READ_PHI/WRITE_PHI (see role-permissions.config.ts,
 * "Educational Use") — could read or write another patient's real data.
 *
 * Cycle 239: re-auditing the same controller with an AST-based script (walking
 * every @Get/@Post/@Patch/@Delete handler and checking for a permission
 * decorator, not grep) found Cycle 238's "8 routes" was only a slice — 39 more
 * routes on this same controller had zero decorator, including the literal ED
 * patient whiteboard (`getWhiteboard`), the patient journey timeline, EMS
 * inbound, queues, referrals, and 7 "upgrade-harness" clinical-intelligence
 * routes — all confirmed by direct read of the backing service to return real
 * patient names/records via `EmergencyPatientService.listPatients()`, not
 * aggregate/de-identified data. Fixed all 39 with the permission matching each
 * route's actual data source (READ_PHI/WRITE_PHI for patient-record reads/
 * writes, USE_AI_CHAT for the copilot query/context pair, VIEW_ANALYTICS for
 * routes confirmed to return only de-identified counts, VIEW_OBSERVABILITY for
 * the AI-drift-monitoring "operational-intelligence" family, VIEW_INTEGRATIONS
 * for the connector-status endpoint, VIEW_OPERATIONS for the static
 * implementation-readiness doc, CONFIGURE_SYSTEM for org-level ED thresholds).
 * 9 routes (federated-learning ×5, digital-twin ×4) were deliberately left
 * undecorated — confirmed via direct read that neither service touches
 * `EmergencyPatientService` at all, so no PHI-exposure risk exists, and no
 * existing permission cleanly fits synthetic cross-hospital model state;
 * flagged as an open item rather than guessing a permission.
 *
 * This test inspects the actual metadata AuthorizationGuard reads at request
 * time, so it fails if a decorator is ever removed or a future route is added
 * to this same family without one — the same class of gap this test exists
 * to catch.
 */
describe('EmergencyOsController — patient-tied endpoints require a permission (Cycle 238)', () => {
  const EXPECTED: Array<[keyof EmergencyOsController, Permission]> = [
    ['getPatientWorkflowLogs', Permission.READ_PHI],
    ['getPatientDocumentArtifacts', Permission.READ_PHI],
    ['getPatientOrchestration', Permission.READ_PHI],
    ['getPatientFlowForPatient', Permission.READ_PHI],
    ['recordClinicalCalculatorResult', Permission.USE_CALCULATORS],
    ['listClinicalCalculatorResults', Permission.USE_CALCULATORS],
    ['listCopilotInteractions', Permission.USE_AI_CHAT],
    ['recordCopilotInteraction', Permission.USE_AI_CHAT],
  ];

  it.each(EXPECTED)('%s requires %s', (methodName, expectedPermission) => {
    const handler = EmergencyOsController.prototype[methodName];
    expect(typeof handler).toBe('function');
    const metadata = Reflect.getMetadata(PERMISSIONS_KEY, handler);
    expect(metadata).toEqual([expectedPermission]);
  });

  it('STUDENT (the one role never granted READ_PHI/WRITE_PHI) cannot satisfy the READ_PHI-gated routes above', () => {
    // Static assertion mirroring role-permissions.config.ts's STUDENT block:
    // student permissions are explicitly scoped to "Clinical Tools (Educational Use)"
    // and never include READ_PHI, WRITE_PHI, or any permission that implies them.
    const STUDENT_PERMISSIONS = [
      Permission.USE_CALCULATORS,
      Permission.USE_DRUG_CHECKER,
      Permission.USE_LAB_INTERPRETER,
      Permission.USE_PROTOCOLS,
      Permission.USE_AI_CHAT,
    ];
    expect(STUDENT_PERMISSIONS).not.toContain(Permission.READ_PHI);
    expect(STUDENT_PERMISSIONS).not.toContain(Permission.WRITE_PHI);
  });
});

describe('EmergencyOsController — remaining undecorated routes on the same controller (Cycle 239)', () => {
  const EXPECTED_CYCLE_239: Array<[keyof EmergencyOsController, Permission]> = [
    ['getWhiteboard', Permission.READ_PHI],
    ['getCentralNodeSnapshot', Permission.READ_PHI],
    ['getOperationalIntelligenceSnapshot', Permission.VIEW_OBSERVABILITY],
    ['getOperationalIntelligenceModelHealth', Permission.VIEW_OBSERVABILITY],
    ['getOperationalIntelligenceAlerts', Permission.VIEW_OBSERVABILITY],
    ['evaluateOperationalIntelligence', Permission.VIEW_OBSERVABILITY],
    ['getJourney', Permission.READ_PHI],
    ['getWorkflowLogs', Permission.READ_PHI],
    ['getImplementationReadiness', Permission.VIEW_OPERATIONS],
    ['getEMS', Permission.READ_PHI],
    ['postTriageAssist', Permission.WRITE_PHI],
    ['getQueues', Permission.READ_PHI],
    ['getReassessment', Permission.READ_PHI],
    ['getOperatingSurface', Permission.READ_PHI],
    ['getWorkflowOrchestration', Permission.READ_PHI],
    ['reviewWorkflowAutomation', Permission.WRITE_PHI],
    ['getPatientFlow', Permission.READ_PHI],
    ['getCapacity', Permission.READ_PHI],
    ['getBoarding', Permission.READ_PHI],
    ['getReferrals', Permission.READ_PHI],
    ['createReferral', Permission.WRITE_PHI],
    ['getProvincialHealth', Permission.READ_PHI],
    ['getIntegrations', Permission.VIEW_INTEGRATIONS],
    ['getCopilot', Permission.USE_AI_CHAT],
    ['queryCopilot', Permission.USE_AI_CHAT],
    ['getAnalytics', Permission.VIEW_ANALYTICS],
    ['getUpgradeHarness', Permission.READ_PHI],
    ['getUpgradeHarnessCapacity', Permission.READ_PHI],
    ['getUpgradeHarnessPatientFlow', Permission.READ_PHI],
    ['getUpgradeHarnessPatientFlowForPatient', Permission.READ_PHI],
    ['getUpgradeHarnessClinicalIntelligence', Permission.READ_PHI],
    ['getUpgradeHarnessClinicalIntelligenceForPatient', Permission.READ_PHI],
    ['getUpgradeHarnessAuditSummary', Permission.READ_PHI],
    ['getSettings', Permission.CONFIGURE_SYSTEM],
    ['updateSettings', Permission.CONFIGURE_SYSTEM],
    ['updateLiveSimulation', Permission.VIEW_ANALYTICS],
    ['evaluateSimulation', Permission.VIEW_ANALYTICS],
    ['compareSimulation', Permission.VIEW_ANALYTICS],
    ['getSimulationRecommendations', Permission.VIEW_ANALYTICS],
  ];

  it.each(EXPECTED_CYCLE_239)('%s requires %s', (methodName, expectedPermission) => {
    const handler = EmergencyOsController.prototype[methodName];
    expect(typeof handler).toBe('function');
    const metadata = Reflect.getMetadata(PERMISSIONS_KEY, handler);
    expect(metadata).toEqual([expectedPermission]);
  });

  it('deliberately-deferred federated-learning/digital-twin routes are undecorated because neither service touches patient data, not because they were missed', () => {
    // Confirmed by direct read of FederatedLearningService/HybridDigitalTwinService
    // (emergency-os.advanced-services.ts): neither constructor injects
    // EmergencyPatientService, so no PHI-exposure risk exists today. Left open
    // pending a product decision on the right non-PHI permission (none of the
    // current Permission enum values cleanly fit "synthetic cross-hospital
    // model state"), rather than guessing one. This test pins the deferred
    // list so a future cycle closing it updates this test deliberately.
    const DEFERRED: Array<keyof EmergencyOsController> = [
      'registerFederatedHospital',
      'updateFederatedModel',
      'aggregateFederatedRound',
      'getFederatedGlobalModel',
      'getFederatedDashboard',
      'initializeDigitalTwin',
      'simulateDigitalTwin',
      'getDigitalTwinState',
      'evaluateDigitalTwinScenario',
    ];
    for (const methodName of DEFERRED) {
      const handler = EmergencyOsController.prototype[methodName];
      expect(typeof handler).toBe('function');
      const metadata = Reflect.getMetadata(PERMISSIONS_KEY, handler);
      expect(metadata).toBeUndefined();
    }
  });
});
