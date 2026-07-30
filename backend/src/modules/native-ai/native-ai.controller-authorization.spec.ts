import { PERMISSIONS_KEY } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { NativeAiController } from './native-ai.controller';

/**
 * Cycle 240: all 9 routes on NativeAiController carried no
 * @RequirePermission/@Permissions/@AnyPermission decorator despite the
 * controller applying AuthorizationGuard, which fails open with no metadata
 * present. routePatient/getClinicalAcuity/evaluateTriage/inferSpecialists all
 * take a real Patient (or Patient[]) request body and run it through
 * routePatientToClinicalSpecialists/buildClinicalAcuityLeaderboard/
 * inferTriageFromExpertSystem with sourceState: 'live' -- confirmed by direct
 * read of native-ai.service.ts, not assumed from the route names -- so any
 * authenticated user, including STUDENT, could submit real patient clinical
 * data and receive real AI-generated routing/acuity/triage/specialist output.
 * addTriageRule is more severe still: it mutates a global, structured triage
 * rule set (addStructuredTriageRule) that shapes every future triage
 * evaluation platform-wide, not a per-patient record.
 */
describe('NativeAiController — every route requires a permission (Cycle 240)', () => {
  const EXPECTED: Array<[keyof NativeAiController, Permission]> = [
    ['getRegistry', Permission.VIEW_OBSERVABILITY],
    ['getDrift', Permission.VIEW_OBSERVABILITY],
    ['evaluateDrift', Permission.VIEW_OBSERVABILITY],
    ['routePatient', Permission.READ_PHI],
    ['getClinicalAcuity', Permission.READ_PHI],
    ['listTriageRules', Permission.VIEW_GOVERNANCE],
    ['addTriageRule', Permission.MANAGE_CLINICAL_POLICY],
    ['evaluateTriage', Permission.READ_PHI],
    ['inferSpecialists', Permission.READ_PHI],
  ];

  it.each(EXPECTED)('%s requires %s', (methodName, expectedPermission) => {
    const handler = NativeAiController.prototype[methodName];
    expect(typeof handler).toBe('function');
    const metadata = Reflect.getMetadata(PERMISSIONS_KEY, handler);
    expect(metadata).toEqual([expectedPermission]);
  });

  it('STUDENT (never granted READ_PHI/MANAGE_CLINICAL_POLICY/VIEW_GOVERNANCE/VIEW_OBSERVABILITY) cannot satisfy any of the gates above', () => {
    // Mirrors role-permissions.config.ts's STUDENT block, which is scoped to
    // 5 educational-use clinical-tool permissions only.
    const STUDENT_PERMISSIONS = [
      Permission.USE_CALCULATORS,
      Permission.USE_DRUG_CHECKER,
      Permission.USE_LAB_INTERPRETER,
      Permission.USE_PROTOCOLS,
      Permission.USE_AI_CHAT,
    ];
    const requiredHere = new Set(EXPECTED.map(([, permission]) => permission));
    for (const permission of requiredHere) {
      expect(STUDENT_PERMISSIONS).not.toContain(permission);
    }
  });
});
