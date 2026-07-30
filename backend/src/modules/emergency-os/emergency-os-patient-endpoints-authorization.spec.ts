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
