import { CANONICAL_APP_ROUTE_TREE, CANONICAL_ROUTES } from '../config/routes.config.js';

function page({
  id,
  label,
  path,
  componentKey,
  navId,
  screenshotSlug,
  loadEndpoints = [],
  actionEndpoints = [],
  duplicateRenderPaths = [],
  backendContract = 'real',
  notes = '',
}) {
  return Object.freeze({
    id,
    label,
    path,
    componentKey,
    navId,
    screenshotSlug,
    loadEndpoints: Object.freeze(loadEndpoints),
    actionEndpoints: Object.freeze(actionEndpoints),
    duplicateRenderPaths: Object.freeze(duplicateRenderPaths),
    backendContract,
    notes,
  });
}

export const EMERGENCY_PAGE_RENDER_INVENTORY = Object.freeze([
  page({
    id: 'emergency-whiteboard',
    label: 'Board',
    path: CANONICAL_ROUTES.emergencyWhiteboard,
    componentKey: 'EmergencyWhiteboard',
    navId: 'emergency_whiteboard',
    screenshotSlug: '01-emergency-whiteboard',
    loadEndpoints: ['/api/emergency/whiteboard'],
  }),
  page({
    id: 'emergency-patients',
    label: 'Emergency Patients',
    path: CANONICAL_ROUTES.emergencyPatients,
    componentKey: 'EmergencyPatientsRoute',
    navId: 'emergency_patients',
    screenshotSlug: '02-emergency-patients',
    loadEndpoints: ['/api/emergency/patients'],
    actionEndpoints: ['POST /api/emergency/patients'],
  }),
  page({
    id: 'ems-pipeline',
    label: 'EMS',
    path: CANONICAL_ROUTES.emergencyEms,
    componentKey: 'EMSPipeline',
    navId: 'ems_pipeline',
    screenshotSlug: '04-ems-pipeline',
    loadEndpoints: ['/api/emergency/ems'],
  }),
  page({
    id: 'smart-intake',
    label: 'Smart Intake',
    path: CANONICAL_ROUTES.emergencyIntake,
    componentKey: 'SmartIntake',
    navId: 'smart_intake',
    screenshotSlug: '05-smart-intake',
    loadEndpoints: ['/api/emergency/intake'],
    actionEndpoints: ['POST /api/emergency/intake', 'POST /api/emergency/intake/vertical-slice'],
  }),
  page({
    id: 'queue-intelligence',
    label: 'Queue Intelligence',
    path: CANONICAL_ROUTES.emergencyQueues,
    componentKey: 'EmergencyQueueRoute',
    navId: 'queue_intelligence',
    screenshotSlug: '06-queue-intelligence',
    loadEndpoints: ['/api/emergency/queues'],
  }),
  page({
    id: 'reassessment-engine',
    label: 'Reassessment Engine',
    path: CANONICAL_ROUTES.emergencyReassessment,
    componentKey: 'EmergencyReassessmentRoute',
    navId: 'reassessment_engine',
    screenshotSlug: '07-reassessment-engine',
    loadEndpoints: ['/api/emergency/reassessment'],
  }),
  page({
    id: 'capacity-intelligence',
    label: 'Capacity Intelligence',
    path: CANONICAL_ROUTES.emergencyCapacity,
    componentKey: 'CapacityDetail',
    navId: 'capacity_intelligence',
    screenshotSlug: '08-capacity-intelligence',
    loadEndpoints: ['/api/emergency/capacity'],
  }),
  page({
    id: 'boarding-intelligence',
    label: 'Boarding Intelligence',
    path: CANONICAL_ROUTES.emergencyBoarding,
    componentKey: 'EmergencyBoardingRoute',
    navId: 'boarding_intelligence',
    screenshotSlug: '09-boarding-intelligence',
    loadEndpoints: ['/api/emergency/boarding'],
  }),
  page({
    id: 'referral-intelligence',
    label: 'Referral Intelligence',
    path: CANONICAL_ROUTES.emergencyReferrals,
    componentKey: 'ReferralPanel',
    navId: 'referral_intelligence',
    screenshotSlug: '10-referral-intelligence',
    loadEndpoints: ['/api/emergency/referrals'],
  }),
  page({
    id: 'ed-copilot',
    label: 'ED Copilot',
    path: CANONICAL_ROUTES.emergencyCopilot,
    componentKey: 'EmergencyCopilotRoute',
    navId: 'ed_copilot',
    screenshotSlug: '13-ed-copilot',
    loadEndpoints: ['/api/emergency/copilot'],
  }),
  page({
    id: 'emergency-analytics',
    label: 'Emergency Analytics',
    path: CANONICAL_ROUTES.emergencyAnalytics,
    componentKey: 'EmergencyAnalytics',
    navId: 'emergency_analytics',
    screenshotSlug: '14-emergency-analytics',
    loadEndpoints: ['/api/emergency/analytics'],
    backendContract: 'demo',
  }),
  page({
    id: 'emergency-settings',
    label: 'Emergency Settings',
    path: CANONICAL_ROUTES.emergencySettings,
    componentKey: 'EmergencySettingsRoute',
    navId: 'emergency_settings',
    screenshotSlug: '18-emergency-settings',
    loadEndpoints: ['/api/emergency/settings'],
  }),
]);

export const EMERGENCY_PAGE_PRIMARY_PATHS = Object.freeze(
  EMERGENCY_PAGE_RENDER_INVENTORY.map((entry) => entry.path),
);

export const EMERGENCY_PAGE_ALL_RENDER_PATHS = Object.freeze(
  EMERGENCY_PAGE_RENDER_INVENTORY.flatMap((entry) => [entry.path, ...entry.duplicateRenderPaths]),
);

export const EMERGENCY_PAGE_SCREENSHOT_TARGETS = Object.freeze(
  EMERGENCY_PAGE_RENDER_INVENTORY.flatMap((entry) => [
    Object.freeze({
      id: entry.id,
      label: entry.label,
      path: entry.path,
      screenshotSlug: entry.screenshotSlug,
      isDuplicateRenderPath: false,
    }),
    ...entry.duplicateRenderPaths.map((path, index) =>
      Object.freeze({
        id: `${entry.id}-alias-${index + 1}`,
        label: `${entry.label} alias`,
        path,
        screenshotSlug: `${entry.screenshotSlug}-alias-${index + 1}`,
        isDuplicateRenderPath: true,
      }),
    ),
  ]),
);

export function getCanonicalAppPagePaths() {
  return CANONICAL_APP_ROUTE_TREE.filter((route) => route.type === 'page').map(
    (route) => route.path,
  );
}
