/**
 * Registry of operational empty-state surfaces — used by discovery audit.
 */
export const EMPTY_STATE_SURFACE_REGISTRY = Object.freeze([
  {
    id: 'whiteboard-loading',
    component: 'emergency/index.tsx',
    hasGuidance: true,
    hasActions: false,
    hasStatus: true,
    hasNextSteps: true,
  },
  {
    id: 'whiteboard-empty',
    component: 'emergency/index.tsx',
    hasGuidance: true,
    hasActions: true,
    hasStatus: true,
    hasNextSteps: true,
  },
  {
    id: 'copilot-no-messages',
    component: 'CopilotPanel.tsx',
    hasGuidance: true,
    hasActions: true,
    hasStatus: true,
    hasNextSteps: true,
  },
  {
    id: 'reception-work-queues',
    component: 'ReceptionWorkQueues.jsx',
    hasGuidance: true,
    hasActions: true,
    hasStatus: true,
    hasNextSteps: true,
  },
  {
    id: 'reception-recent-arrivals',
    component: 'RecentArrivalsPanel.jsx',
    hasGuidance: true,
    hasActions: true,
    hasStatus: true,
    hasNextSteps: true,
  },
  {
    id: 'reception-ems-prearrival',
    component: 'EmsPreArrivalPanel.jsx',
    hasGuidance: true,
    hasActions: true,
    hasStatus: true,
    hasNextSteps: true,
  },
  {
    id: 'operational-search',
    component: 'PatientSearchResults.tsx',
    hasGuidance: true,
    hasActions: true,
    hasStatus: false,
    hasNextSteps: true,
  },
  {
    id: 'command-palette',
    component: 'CommandPalette.tsx',
    hasGuidance: true,
    hasActions: false,
    hasStatus: false,
    hasNextSteps: true,
  },
  {
    id: 'who-next',
    component: 'WhoNextPanel.tsx',
    hasGuidance: true,
    hasActions: false,
    hasStatus: true,
    hasNextSteps: true,
  },
  {
    id: 'protocol-suggestions',
    component: 'ProtocolSuggestion.jsx',
    hasGuidance: true,
    hasActions: false,
    hasStatus: false,
    hasNextSteps: true,
  },
  {
    id: 'vitals-chart',
    component: 'PatientDetailPanel.tsx',
    hasGuidance: true,
    hasActions: false,
    hasStatus: true,
    hasNextSteps: true,
  },
  {
    id: 'attention-strips',
    component: 'ChargeNurseOperationalStrip.jsx',
    hasGuidance: true,
    hasActions: false,
    hasStatus: true,
    hasNextSteps: false,
  },
  {
    id: 'clinical-risk-factors',
    component: 'RiskFactorsList.jsx',
    hasGuidance: true,
    hasActions: false,
    hasStatus: true,
    hasNextSteps: false,
  },
]);

export function auditEmptyStateSurfaces(surfaces = EMPTY_STATE_SURFACE_REGISTRY) {
  const incomplete = surfaces.filter(
    (surface) => !surface.hasGuidance || (!surface.hasStatus && !surface.hasNextSteps),
  );

  return {
    surfaceCount: surfaces.length,
    completeCount: surfaces.length - incomplete.length,
    incompleteSurfaces: incomplete.map((surface) => surface.id),
    passesAudit: incomplete.length === 0,
  };
}
