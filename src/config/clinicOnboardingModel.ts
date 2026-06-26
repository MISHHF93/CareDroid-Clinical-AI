/**
 * Clinic onboarding simulation — staff, queues, thresholds, alerts, roles.
 * Node-safe; documents setup friction and provisioning expectations.
 */

const DEFAULT_EMERGENCY_CTAS_TARGETS = Object.freeze({
  P1: 0,
  P2: 15,
  P3: 30,
  P4: 60,
  P5: 120,
});

const DEFAULT_EMERGENCY_ALERT_RULES = Object.freeze({
  longWait: Object.freeze({ enabled: true, severity: 'Warning' }),
  lwbsRisk: Object.freeze({ enabled: true, severity: 'Critical' }),
  reassessmentDue: Object.freeze({ enabled: true, severity: 'Warning' }),
  capacity: Object.freeze({ enabled: true, severity: 'Warning' }),
  emsCritical: Object.freeze({ enabled: true, severity: 'Critical' }),
});

export const CLINIC_ONBOARDING_STEP_IDS = Object.freeze({
  ORGANIZATION: 'organization',
  STAFF: 'staff',
  QUEUES: 'queues',
  THRESHOLDS: 'thresholds',
  ALERTS: 'alerts',
  ROLES: 'roles',
});

export const CLINIC_ONBOARDING_STEPS = Object.freeze([
  Object.freeze({
    id: CLINIC_ONBOARDING_STEP_IDS.ORGANIZATION,
    label: 'Create clinic organization',
    configDomain: 'tenant',
    automated: true,
    route: '/onboarding',
  }),
  Object.freeze({
    id: CLINIC_ONBOARDING_STEP_IDS.STAFF,
    label: 'Configure staff roster',
    configDomain: 'staff',
    storageKey: 'settings.emergencyOs.staff',
    automated: false,
    route: '/emergency/settings',
  }),
  Object.freeze({
    id: CLINIC_ONBOARDING_STEP_IDS.QUEUES,
    label: 'Enable queue targets',
    configDomain: 'queues',
    storageKey: 'settings.emergencyOs.queues',
    automated: true,
    route: '/emergency/queues',
  }),
  Object.freeze({
    id: CLINIC_ONBOARDING_STEP_IDS.THRESHOLDS,
    label: 'Set wait & capacity thresholds',
    configDomain: 'thresholds',
    storageKey: 'settings.emergencyOs.thresholds',
    automated: true,
    route: '/emergency/settings',
  }),
  Object.freeze({
    id: CLINIC_ONBOARDING_STEP_IDS.ALERTS,
    label: 'Enable alert rules',
    configDomain: 'alerts',
    storageKey: 'settings.emergencyOs.alertRules',
    automated: true,
    route: '/emergency/settings',
  }),
  Object.freeze({
    id: CLINIC_ONBOARDING_STEP_IDS.ROLES,
    label: 'Assign roles & permissions',
    configDomain: 'roles',
    storageKey: 'settings.emergencyOs.roles',
    automated: true,
    route: '/tenant-admin',
  }),
]);

export function buildClinicOnboardingDefaults({
  organizationName = 'Riverside Walk-In Clinic',
  defaultRoleProfileId = 'nurse',
}: any = {}) {
  return Object.freeze({
    tenantName: organizationName,
    defaultWorkspace: 'emergency-whiteboard',
    thresholds: Object.freeze({
      waitWarningMinutes: 30,
      waitCriticalMinutes: 45,
      capacityWarningPercent: 75,
      capacityOrangePercent: 85,
      capacityRedPercent: 92,
      emsOffloadTargetMinutes: 20,
      reassessmentIntervals: Object.freeze({ ...DEFAULT_EMERGENCY_CTAS_TARGETS }),
      ctasTargets: Object.freeze({ ...DEFAULT_EMERGENCY_CTAS_TARGETS }),
    }),
    alertRules: Object.freeze({ ...DEFAULT_EMERGENCY_ALERT_RULES }),
    staff: Object.freeze({
      seedRoster: Object.freeze([
        Object.freeze({ roleId: 'registration_clerk', label: 'Front desk', capacity: 1 }),
        Object.freeze({ roleId: 'triage_nurse', label: 'Triage nurse', capacity: 1 }),
        Object.freeze({ roleId: 'physician', label: 'Clinic physician', capacity: 2 }),
      ]),
    }),
    queues: Object.freeze({
      enabledQueueIds: Object.freeze([
        'waiting-room',
        'triage-queue',
        'provider-queue',
        'discharge-queue',
      ]),
      clinicScale: true,
    }),
    roles: Object.freeze({
      defaultRoleProfileId,
      emergencyRoleMapping: Object.freeze({
        nurse: 'triage_nurse',
        physician: 'physician',
        'clinic-administrator': 'admin',
      }),
    }),
    featureFlags: Object.freeze({
      smartIntake: true,
      copilot: true,
      queueIntelligence: true,
    }),
  });
}

/**
 * @param {object} context
 * @param {object} [context.organization]
 * @param {object} [context.emergencyOs]
 * @param {object} [context.frictionFlags]
 */
export function evaluateClinicOnboardingStep(step, context: any = {}) {
  const emergencyOs = context.emergencyOs || {};
  const flags = context.frictionFlags || {};
  const blockers = [] as any[];
  let status = 'pending';
  let automated = step.automated;

  switch (step.id) {
    case CLINIC_ONBOARDING_STEP_IDS.ORGANIZATION:
      status = context.organization?.id ? 'complete' : 'pending';
      if (!context.organization?.id) blockers.push('Organization not created');
      break;
    case CLINIC_ONBOARDING_STEP_IDS.STAFF:
      if (emergencyOs.staff?.seedRoster?.length) {
        status = 'complete';
        automated = true;
      } else if (flags.staffUiWired) {
        status = emergencyOs.staff ? 'complete' : 'manual';
        blockers.push('Staff roster not saved to organization settings');
      } else {
        status = 'manual';
        blockers.push('No staff onboarding UI — seed roster or settings form required');
      }
      break;
    case CLINIC_ONBOARDING_STEP_IDS.QUEUES:
      if (emergencyOs.queues?.enabledQueueIds?.length) {
        status = 'complete';
      } else {
        status = 'partial';
        blockers.push('Queue wait targets remain static in queueAuditModel until org overrides exist');
      }
      break;
    case CLINIC_ONBOARDING_STEP_IDS.THRESHOLDS:
      if (emergencyOs.thresholds) {
        status = flags.orgScopedThresholdSave ? 'complete' : 'partial';
        if (!flags.orgScopedThresholdSave) {
          blockers.push('Threshold saves must persist to organization.settings.emergencyOs');
        }
      } else {
        status = 'pending';
        blockers.push('No thresholds seeded during provisioning');
      }
      break;
    case CLINIC_ONBOARDING_STEP_IDS.ALERTS:
      if (emergencyOs.alertRules) {
        status = flags.orgScopedAlertSave ? 'complete' : 'partial';
        if (!flags.orgScopedAlertSave) {
          blockers.push('Alert rule saves must persist per organization');
        }
      } else {
        status = 'pending';
        blockers.push('No alert rules seeded during provisioning');
      }
      break;
    case CLINIC_ONBOARDING_STEP_IDS.ROLES:
      if (emergencyOs.roles?.defaultRoleProfileId) {
        status = flags.edRbacWired ? 'complete' : 'partial';
        if (!flags.edRbacWired) {
          blockers.push('ED RBAC still uses static matrix — role mapping stored but not applied');
        }
      } else if (context.organization?.defaultRoleProfileId) {
        status = 'partial';
        blockers.push('Platform role profile assigned but emergencyOs.roles not seeded');
      } else {
        status = 'pending';
        blockers.push('No default role profile');
      }
      break;
    default:
      status = 'pending';
  }

  return Object.freeze({
    id: step.id,
    label: step.label,
    status,
    automated,
    route: step.route,
    blockers: Object.freeze(blockers),
    frictionScore: blockers.length * (status === 'manual' ? 2 : 1),
  });
}

/**
 * Simulate onboarding a new clinic and score setup friction.
 * @param {object} [scenario]
 */
export function simulateClinicOnboarding(scenario: any = {}) {
  const organization = Object.freeze({
    id: scenario.organizationId || 'clinic-riverside-001',
    name: scenario.organizationName || 'Riverside Walk-In Clinic',
    organizationType: 'clinic',
    defaultRoleProfileId: scenario.defaultRoleProfileId || 'nurse',
  });

  const emergencyOs = Object.freeze(
    scenario.emergencyOs ||
      (scenario.provisioned !== false ? buildClinicOnboardingDefaults(organization) : {}),
  );

  const frictionFlags = Object.freeze({
    orgScopedThresholdSave: scenario.orgScopedThresholdSave !== false,
    orgScopedAlertSave: scenario.orgScopedAlertSave !== false,
    storeHydration: scenario.storeHydration !== false,
    staffUiWired: Boolean(scenario.staffUiWired),
    edRbacWired: Boolean(scenario.edRbacWired),
  });

  const context = { organization, emergencyOs, frictionFlags };
  const steps = CLINIC_ONBOARDING_STEPS.map((step) => evaluateClinicOnboardingStep(step, context));
  const totalFriction = steps.reduce((sum, step) => sum + step.frictionScore, 0);
  const manualSteps = steps.filter((step) => step.status === 'manual').length;
  const completeSteps = steps.filter((step) => step.status === 'complete').length;

  const frictionPoints = Object.freeze(
    [
      ...new Set(steps.flatMap((step) => step.blockers)),
      manualSteps ? `${manualSteps} step(s) require manual navigation outside onboarding wizard` : null,
      !frictionFlags.storeHydration
        ? 'Emergency store does not hydrate from organization.settings.emergencyOs on login'
        : null,
    ].filter(Boolean),
  );

  return Object.freeze({
    organization,
    emergencyOs,
    steps,
    summary: Object.freeze({
      totalSteps: steps.length,
      completeSteps,
      manualSteps,
      totalFriction,
      readinessPercent: Math.round((completeSteps / steps.length) * 100),
    }),
    frictionPoints,
    mitigations: Object.freeze([
      'Seed settings.emergencyOs during tenant provisioning for new clinics',
      'Save Emergency Settings to organization tenant-admin when organizationId is present',
      'Hydrate emergencyStore from organization engine on login',
      'Expose emergencyOs on tenant-admin GET for verification',
      'Add staff roster editor or accept provisioned seedRoster as complete',
    ]),
  });
}

export function auditClinicOnboardingExposure() {
  return Object.freeze({
    wizardRoute: '/onboarding',
    postWizardRoutes: Object.freeze([
      '/tenant-admin',
      '/emergency/settings',
      '/emergency/queues',
    ]),
    provisionedDomains: Object.freeze(['thresholds', 'alertRules', 'staff', 'queues', 'roles']),
    manualDomains: Object.freeze(['staff-ui']),
  });
}
