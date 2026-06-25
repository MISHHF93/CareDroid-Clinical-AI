import { OrganizationType } from '../platform-assets/enums/platform-asset.enums';

const DEFAULT_ALERT_RULES = {
  longWait: { enabled: true, severity: 'Warning' },
  lwbsRisk: { enabled: true, severity: 'Critical' },
  reassessmentDue: { enabled: true, severity: 'Warning' },
  capacity: { enabled: true, severity: 'Warning' },
  emsCritical: { enabled: true, severity: 'Critical' },
};

const DEFAULT_CTAS = {
  P1: 0,
  P2: 15,
  P3: 30,
  P4: 60,
  P5: 120,
};

export function buildEmergencyOsOnboardingSeed(options: {
  organizationName: string;
  organizationType: OrganizationType | string;
  defaultRoleProfileId?: string | null;
}) {
  const clinicScale = options.organizationType === OrganizationType.CLINIC;

  return {
    tenantName: options.organizationName,
    defaultWorkspace: 'emergency-whiteboard',
    thresholds: {
      waitWarningMinutes: clinicScale ? 30 : 45,
      waitCriticalMinutes: clinicScale ? 45 : 60,
      capacityWarningPercent: clinicScale ? 75 : 80,
      capacityOrangePercent: clinicScale ? 85 : 90,
      capacityRedPercent: clinicScale ? 92 : 95,
      emsOffloadTargetMinutes: clinicScale ? 20 : 15,
      reassessmentIntervals: { ...DEFAULT_CTAS },
      ctasTargets: { ...DEFAULT_CTAS },
    },
    alertRules: { ...DEFAULT_ALERT_RULES },
    staff: {
      seedRoster: clinicScale
        ? [
            { roleId: 'registration_clerk', label: 'Front desk', capacity: 1 },
            { roleId: 'triage_nurse', label: 'Triage nurse', capacity: 1 },
            { roleId: 'physician', label: 'Clinic physician', capacity: 2 },
          ]
        : [
            { roleId: 'charge_nurse', label: 'Charge nurse', capacity: 1 },
            { roleId: 'triage_nurse', label: 'Triage nurse', capacity: 2 },
            { roleId: 'physician', label: 'ED physician', capacity: 4 },
            { roleId: 'registration_clerk', label: 'Registration', capacity: 2 },
          ],
    },
    queues: {
      enabledQueueIds: clinicScale
        ? ['waiting-room', 'triage-queue', 'provider-queue', 'discharge-queue']
        : [
            'waiting-room',
            'triage-queue',
            'provider-queue',
            'results-queue',
            'reassessment-queue',
            'referral-queue',
            'admission-queue',
            'discharge-queue',
            'ems-pre-arrival-queue',
          ],
      clinicScale,
    },
    roles: {
      defaultRoleProfileId:
        options.defaultRoleProfileId || (clinicScale ? 'nurse' : 'emergency-physician'),
      emergencyRoleMapping: {
        nurse: 'triage_nurse',
        physician: 'physician',
        'emergency-physician': 'physician',
        'clinic-administrator': 'admin',
        'hospital-administrator': 'admin',
      },
    },
    featureFlags: {
      smartIntake: true,
      copilot: true,
      queueIntelligence: true,
    },
    provisionedAt: new Date().toISOString(),
    onboardingVersion: 1,
  };
}
