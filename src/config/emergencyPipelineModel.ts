import { CANONICAL_ROUTES, EMERGENCY_OS_TARGET_ROUTES } from './routes.config';
import { normalizeEmergencyRole } from './emergencyRolePermissions';
import { isReceptionFirstUxEnabled } from './receptionFirstUx.config';

export const RECEPTION_PIPELINE_STAGE = Object.freeze({
  ARRIVAL: 'arrival',
  REGISTER: 'register',
  VERIFY: 'verify',
  HANDOFF: 'handoff',
});

export const EMERGENCY_SURFACE_ZONE = Object.freeze({
  PIPELINE: 'pipeline',
  CLINICAL: 'clinical',
  UTILITY: 'utility',
  RETAINED: 'retained',
});

export const RECEPTION_PIPELINE_STAGES = Object.freeze([
  Object.freeze({
    id: RECEPTION_PIPELINE_STAGE.ARRIVAL,
    label: 'Arrivals',
    querySignals: Object.freeze(['arrived', 'queue=ems']),
    defaultQueueTab: 'ems',
  }),
  Object.freeze({
    id: RECEPTION_PIPELINE_STAGE.REGISTER,
    label: 'Register',
    querySignals: Object.freeze(['express', 'intake', 'quickCreate', 'quickIntake']),
  }),
  Object.freeze({
    id: RECEPTION_PIPELINE_STAGE.VERIFY,
    label: 'Verify ID',
    querySignals: Object.freeze(['queue=verification']),
    defaultQueueTab: 'verification',
  }),
  Object.freeze({
    id: RECEPTION_PIPELINE_STAGE.HANDOFF,
    label: 'Send to nurse',
    querySignals: Object.freeze(['queue=pretriage', 'patient']),
    defaultQueueTab: 'pretriage',
  }),
]);

const RECEPTION_ACTIVE_QUERY_PREFIXES = Object.freeze([
  CANONICAL_ROUTES.emergencyReception,
]);

export const EMERGENCY_SURFACE_REGISTRY = Object.freeze([
  Object.freeze({
    id: 'reception',
    label: 'Reception',
    canonicalRoute: CANONICAL_ROUTES.emergencyReception,
    zone: EMERGENCY_SURFACE_ZONE.PIPELINE,
    pipelineStage: RECEPTION_PIPELINE_STAGE.ARRIVAL,
    embedInReception: true,
    sidebarNavId: 'reception',
    standaloneAllowed: true,
    panelKey: 'arrivalDashboard',
  }),
  Object.freeze({
    id: 'intake',
    label: 'Intake',
    canonicalRoute: CANONICAL_ROUTES.emergencyIntake,
    zone: EMERGENCY_SURFACE_ZONE.PIPELINE,
    pipelineStage: RECEPTION_PIPELINE_STAGE.REGISTER,
    embedInReception: true,
    sidebarNavId: 'intake',
    standaloneAllowed: true,
    panelKey: 'smartIntake',
  }),
  Object.freeze({
    id: 'ems',
    label: 'EMS',
    canonicalRoute: CANONICAL_ROUTES.emergencyEms,
    zone: EMERGENCY_SURFACE_ZONE.PIPELINE,
    pipelineStage: RECEPTION_PIPELINE_STAGE.ARRIVAL,
    embedInReception: true,
    sidebarNavId: 'ems',
    standaloneAllowed: true,
    panelKey: 'emsPreArrival',
  }),
  Object.freeze({
    id: 'patients',
    label: 'Patients',
    canonicalRoute: CANONICAL_ROUTES.emergencyPatients,
    zone: EMERGENCY_SURFACE_ZONE.PIPELINE,
    pipelineStage: RECEPTION_PIPELINE_STAGE.ARRIVAL,
    embedInReception: true,
    sidebarNavId: 'patients',
    standaloneAllowed: true,
    panelKey: 'patientSearch',
  }),
  Object.freeze({
    id: 'queues',
    label: 'Queues',
    canonicalRoute: CANONICAL_ROUTES.emergencyQueues,
    zone: EMERGENCY_SURFACE_ZONE.PIPELINE,
    pipelineStage: RECEPTION_PIPELINE_STAGE.HANDOFF,
    embedInReception: true,
    sidebarNavId: 'queues',
    standaloneAllowed: true,
    panelKey: 'receptionWorkQueues',
  }),
  Object.freeze({
    id: 'whiteboard',
    label: 'Whiteboard',
    canonicalRoute: CANONICAL_ROUTES.emergencyWhiteboard,
    zone: EMERGENCY_SURFACE_ZONE.CLINICAL,
    embedInReception: false,
    sidebarNavId: 'whiteboard',
    standaloneAllowed: true,
    panelKey: null,
  }),
  Object.freeze({
    id: 'reassessment',
    label: 'Reassess',
    canonicalRoute: CANONICAL_ROUTES.emergencyReassessment,
    zone: EMERGENCY_SURFACE_ZONE.CLINICAL,
    embedInReception: false,
    sidebarNavId: 'reassessment',
    standaloneAllowed: true,
    panelKey: null,
  }),
  Object.freeze({
    id: 'capacity',
    label: 'Capacity',
    canonicalRoute: CANONICAL_ROUTES.emergencyCapacity,
    zone: EMERGENCY_SURFACE_ZONE.CLINICAL,
    embedInReception: false,
    sidebarNavId: 'capacity',
    standaloneAllowed: true,
    panelKey: null,
  }),
  Object.freeze({
    id: 'boarding',
    label: 'Boarding',
    canonicalRoute: CANONICAL_ROUTES.emergencyBoarding,
    zone: EMERGENCY_SURFACE_ZONE.CLINICAL,
    embedInReception: false,
    sidebarNavId: null,
    standaloneAllowed: false,
    panelKey: null,
  }),
  Object.freeze({
    id: 'referrals',
    label: 'Referrals',
    canonicalRoute: CANONICAL_ROUTES.emergencyReferrals,
    zone: EMERGENCY_SURFACE_ZONE.CLINICAL,
    embedInReception: false,
    sidebarNavId: 'referrals',
    standaloneAllowed: true,
    panelKey: null,
  }),
  Object.freeze({
    id: 'copilot',
    label: 'Copilot',
    canonicalRoute: CANONICAL_ROUTES.emergencyCopilot,
    zone: EMERGENCY_SURFACE_ZONE.CLINICAL,
    embedInReception: false,
    sidebarNavId: 'copilot',
    standaloneAllowed: true,
    panelKey: null,
  }),
  Object.freeze({
    id: 'tools',
    label: 'Medical Tools',
    canonicalRoute: CANONICAL_ROUTES.emergencyTools,
    zone: EMERGENCY_SURFACE_ZONE.UTILITY,
    embedInReception: false,
    sidebarNavId: 'tools',
    standaloneAllowed: true,
    panelKey: null,
  }),
  Object.freeze({
    id: 'analytics',
    label: 'Analytics',
    canonicalRoute: CANONICAL_ROUTES.emergencyAnalytics,
    zone: EMERGENCY_SURFACE_ZONE.UTILITY,
    embedInReception: false,
    sidebarNavId: 'analytics',
    standaloneAllowed: true,
    panelKey: null,
  }),
  Object.freeze({
    id: 'settings',
    label: 'Settings',
    canonicalRoute: CANONICAL_ROUTES.emergencySettings,
    zone: EMERGENCY_SURFACE_ZONE.UTILITY,
    embedInReception: false,
    sidebarNavId: 'settings',
    standaloneAllowed: true,
    panelKey: null,
  }),
  Object.freeze({
    id: 'collaboration',
    label: 'Collaboration Hub',
    canonicalRoute: CANONICAL_ROUTES.emergencyCollaboration,
    zone: EMERGENCY_SURFACE_ZONE.UTILITY,
    embedInReception: false,
    sidebarNavId: 'collaboration',
    standaloneAllowed: true,
    panelKey: null,
  }),
  Object.freeze({
    id: 'integrations',
    label: 'Integrations',
    canonicalRoute: CANONICAL_ROUTES.integrationHub,
    zone: EMERGENCY_SURFACE_ZONE.UTILITY,
    embedInReception: false,
    sidebarNavId: 'integrations',
    standaloneAllowed: true,
    panelKey: null,
  }),
  Object.freeze({
    id: 'cosmos',
    label: 'Cosmos',
    canonicalRoute: CANONICAL_ROUTES.cosmosViewer,
    zone: EMERGENCY_SURFACE_ZONE.UTILITY,
    embedInReception: false,
    sidebarNavId: 'cosmos',
    standaloneAllowed: true,
    panelKey: null,
  }),
  Object.freeze({
    id: 'platform',
    label: 'Platform',
    canonicalRoute: CANONICAL_ROUTES.workspace,
    zone: EMERGENCY_SURFACE_ZONE.UTILITY,
    embedInReception: false,
    sidebarNavId: 'platform',
    standaloneAllowed: true,
    panelKey: null,
  }),
  Object.freeze({
    id: 'pulse',
    label: 'Department Pulse',
    canonicalRoute: CANONICAL_ROUTES.emergencyPulse,
    zone: EMERGENCY_SURFACE_ZONE.RETAINED,
    embedInReception: false,
    sidebarNavId: 'pulse',
    standaloneAllowed: true,
    panelKey: null,
    retainedReason: 'Shift command strip — utility nav',
  }),
  Object.freeze({
    id: 'shift',
    label: 'Shift Summary',
    canonicalRoute: CANONICAL_ROUTES.emergencyShift,
    zone: EMERGENCY_SURFACE_ZONE.RETAINED,
    embedInReception: false,
    sidebarNavId: 'shift',
    standaloneAllowed: true,
    panelKey: null,
    retainedReason: 'Handoff brief — utility nav',
  }),
  // ── Journey-tier surfaces added in the full emergency care rebuild ────────────
  Object.freeze({
    id: 'command-center',
    label: 'Command Center',
    canonicalRoute: CANONICAL_ROUTES.emergencyCommandCenter,
    zone: EMERGENCY_SURFACE_ZONE.CLINICAL,
    embedInReception: false,
    sidebarNavId: 'command-center',
    standaloneAllowed: true,
    panelKey: null,
  }),
  Object.freeze({
    id: 'journey',
    label: 'Full Journey',
    canonicalRoute: CANONICAL_ROUTES.emergencyJourney,
    zone: EMERGENCY_SURFACE_ZONE.CLINICAL,
    embedInReception: false,
    sidebarNavId: 'command-center',
    standaloneAllowed: true,
    panelKey: null,
  }),
  Object.freeze({
    id: 'dispatch',
    label: 'Dispatch Console',
    canonicalRoute: CANONICAL_ROUTES.emergencyDispatch,
    zone: EMERGENCY_SURFACE_ZONE.PIPELINE,
    embedInReception: false,
    sidebarNavId: 'dispatch',
    standaloneAllowed: true,
    panelKey: null,
  }),
  Object.freeze({
    id: 'ed-readiness',
    label: 'ED Readiness',
    canonicalRoute: CANONICAL_ROUTES.emergencyEdReadiness,
    zone: EMERGENCY_SURFACE_ZONE.PIPELINE,
    embedInReception: false,
    sidebarNavId: 'ed-readiness',
    standaloneAllowed: true,
    panelKey: null,
  }),
  Object.freeze({
    id: 'documentation',
    label: 'Clinical Documentation',
    canonicalRoute: CANONICAL_ROUTES.emergencyDocumentation,
    zone: EMERGENCY_SURFACE_ZONE.RETAINED,
    embedInReception: false,
    sidebarNavId: null,
    standaloneAllowed: true,
    panelKey: null,
    retainedReason: 'Clinical documentation assistant — accessible via AI Copilot',
  }),
  Object.freeze({
    id: 'diagnostics',
    label: 'Diagnostics',
    canonicalRoute: CANONICAL_ROUTES.emergencyDiagnostics,
    zone: EMERGENCY_SURFACE_ZONE.CLINICAL,
    embedInReception: false,
    sidebarNavId: 'diagnostics',
    standaloneAllowed: true,
    panelKey: null,
  }),
  Object.freeze({
    id: 'handoffs',
    label: 'Handoffs',
    canonicalRoute: CANONICAL_ROUTES.emergencyHandoffs,
    zone: EMERGENCY_SURFACE_ZONE.CLINICAL,
    embedInReception: false,
    sidebarNavId: 'handoffs',
    standaloneAllowed: true,
    panelKey: null,
  }),
  Object.freeze({
    id: 'reports',
    label: 'Operational Reports',
    canonicalRoute: CANONICAL_ROUTES.emergencyReports,
    zone: EMERGENCY_SURFACE_ZONE.UTILITY,
    embedInReception: false,
    sidebarNavId: 'reports',
    standaloneAllowed: true,
    panelKey: null,
  }),
  Object.freeze({
    id: 'alerts',
    label: 'Critical Alerts',
    canonicalRoute: CANONICAL_ROUTES.emergencyAlerts,
    zone: EMERGENCY_SURFACE_ZONE.CLINICAL,
    embedInReception: false,
    sidebarNavId: 'alerts',
    standaloneAllowed: true,
    panelKey: null,
  }),
  Object.freeze({
    id: 'help',
    label: 'Help Manual',
    canonicalRoute: CANONICAL_ROUTES.emergencyHelp,
    zone: EMERGENCY_SURFACE_ZONE.RETAINED,
    embedInReception: false,
    sidebarNavId: 'help',
    standaloneAllowed: true,
    panelKey: null,
    retainedReason: 'User manual — utility nav',
  }),
]);

const SURFACE_BY_ID = Object.freeze(
  Object.fromEntries(EMERGENCY_SURFACE_REGISTRY.map((surface) => [surface.id, surface])),
);

const SURFACE_BY_ROUTE = Object.freeze(
  Object.fromEntries(EMERGENCY_SURFACE_REGISTRY.map((surface) => [surface.canonicalRoute, surface])),
);

const NAV_ID_SET = new Set(
  EMERGENCY_SURFACE_REGISTRY.map((surface) => surface.sidebarNavId).filter(Boolean),
);

export function getEmergencySurface(idOrRoute) {
  return SURFACE_BY_ID[idOrRoute] || SURFACE_BY_ROUTE[idOrRoute] || null;
}

export function resolvePipelineStageFromSearchParams(searchParams: any = {}) {
  const queue = String(searchParams.get?.('queue') || searchParams.queue || '');
  if (searchParams.get?.('express') === '1' || searchParams.express === '1') {
    return RECEPTION_PIPELINE_STAGE.REGISTER;
  }
  if (searchParams.get?.('intake') === '1' || searchParams.intake === '1') {
    return RECEPTION_PIPELINE_STAGE.REGISTER;
  }
  if (
    searchParams.get?.('quickCreate') === '1' ||
    searchParams.quickCreate === '1' ||
    searchParams.get?.('quickIntake') === '1' ||
    searchParams.quickIntake === '1'
  ) {
    return RECEPTION_PIPELINE_STAGE.REGISTER;
  }
  if (queue === 'verification') return RECEPTION_PIPELINE_STAGE.VERIFY;
  if (queue === 'pretriage' || searchParams.get?.('patient') || searchParams.patient) {
    return RECEPTION_PIPELINE_STAGE.HANDOFF;
  }
  if (queue === 'ems' || searchParams.get?.('arrived') || searchParams.arrived) {
    return RECEPTION_PIPELINE_STAGE.ARRIVAL;
  }
  if (searchParams.get?.('patientId') || searchParams.get?.('q') || searchParams.q) {
    return RECEPTION_PIPELINE_STAGE.ARRIVAL;
  }
  return RECEPTION_PIPELINE_STAGE.ARRIVAL;
}

export function resolvePipelinePanel(stage, role) {
  const normalizedRole = normalizeEmergencyRole(role);
  const stageDef = RECEPTION_PIPELINE_STAGES.find((entry) => entry.id === stage);
  const surfaces = EMERGENCY_SURFACE_REGISTRY.filter(
    (surface) => (surface as any).pipelineStage === stage && surface.embedInReception,
  );

  return Object.freeze({
    stage: stageDef || RECEPTION_PIPELINE_STAGES[0],
    role: normalizedRole,
    surfaces,
    panelKey: surfaces[0]?.panelKey || 'arrivalDashboard',
    defaultQueueTab: (stageDef as any)?.defaultQueueTab || 'ems',
  });
}

export function isReceptionPipelinePath(pathname, search = '') {
  const normalizedPath = String(pathname || '').split('?')[0];
  if (!RECEPTION_ACTIVE_QUERY_PREFIXES.some((prefix) => normalizedPath === prefix)) {
    return false;
  }
  if (!search) return true;
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  return RECEPTION_PIPELINE_STAGES.some((stage) =>
    stage.querySignals.some((signal) => {
      if (signal.includes('=')) {
        const [key, value] = signal.split('=');
        return params.get(key) === value;
      }
      return params.has(signal);
    }),
  );
}

export function getReceptionNavActivePaths() {
  return Object.freeze([
    '/emergency',
    CANONICAL_ROUTES.emergencyReception,
    `${CANONICAL_ROUTES.emergencyReception}?express=1`,
    `${CANONICAL_ROUTES.emergencyReception}?intake=1`,
    `${CANONICAL_ROUTES.emergencyReception}?quickCreate=1`,
  ]);
}

export function auditNavCoverage(options: any = {}) {
  const retainedRoutes = new Set(options.retainedDirectRoutes || []);
  const navIds = new Set([...NAV_ID_SET, 'pulse', 'shift']);
  const orphans = [] as any[];
  const covered = [] as any[];

  for (const route of EMERGENCY_OS_TARGET_ROUTES) {
    if (!String(route).startsWith('/emergency')) {
      continue;
    }
    const surface = SURFACE_BY_ROUTE[route];
    if (!surface) {
      orphans.push({ route, reason: 'No surface registry entry' });
      continue;
    }

    const hasNav = navIds.has(surface.sidebarNavId);
    const embedded = surface.embedInReception && isReceptionFirstUxEnabled();
    const retained = retainedRoutes.has(route) || surface.zone === EMERGENCY_SURFACE_ZONE.RETAINED;

    if (hasNav || embedded || retained) {
      covered.push({
        route,
        surfaceId: surface.id,
        via: hasNav ? 'sidebar' : embedded ? 'reception_embed' : 'retained',
      });
    } else {
      orphans.push({
        route,
        surfaceId: surface.id,
        reason: 'Not in sidebar, not embedded, not retained',
      });
    }
  }

  const paletteNavIds = new Set(
    EMERGENCY_SURFACE_REGISTRY.filter((surface) => surface.sidebarNavId).map((s) => s.sidebarNavId),
  );
  const navNotInPalette = [...navIds].filter((id) => !paletteNavIds.has(id as any) && id !== 'intake');

  return Object.freeze({
    covered,
    orphans,
    navNotInPalette,
    passesAudit: orphans.length === 0,
    receptionFirstEnabled: isReceptionFirstUxEnabled(),
  });
}

export function auditEmergencyPipelineExposure() {
  return Object.freeze({
    stages: RECEPTION_PIPELINE_STAGES.map((stage) => stage.id),
    surfaces: EMERGENCY_SURFACE_REGISTRY.map((surface) => surface.id),
    targetRoutes: EMERGENCY_OS_TARGET_ROUTES,
  });
}
