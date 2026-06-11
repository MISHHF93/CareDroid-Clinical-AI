import {
  CARE_WORKSPACES,
  DEFAULT_CARE_WORKSPACE_ID,
  WORKSPACE_ROUTE_SHORTCUTS,
  getCareWorkspaceById,
  getCareWorkspaceRouteEntries,
} from '../config/workspace.config';

const EXPERIENCE_OVERRIDES = Object.freeze({
  emergency: {
    tone: 'emergency',
    theme: {
      accent: '#ff4d5e',
      surface: 'rgba(255, 77, 94, 0.12)',
      border: 'rgba(255, 77, 94, 0.36)',
    },
    environment: 'CareDroid Emergency OS',
    operatingLabel: 'CareDroid Emergency OS',
    modeSummary: 'CareDroid Emergency OS mode is active.',
    dashboardTitle: 'Emergency Whiteboard',
    dashboardSubtitle:
      'AI-assisted patient flow for small emergency departments, urgent care clinics, and clinics handling 50-150 patients/day with fewer than 10 staff.',
    toolsTitle: 'Emergency OS Console',
    toolsSubtitle:
      'Calculators, protocols, AI guidance, referrals, discharge, equipment, and surge workflows stay tied to the end-to-end ED flow.',
    recommendationsTitle: 'Emergency OS Recommendations',
    recommendationsSubtitle:
      'Recommendations emphasize throughput, capacity, coordination, cognitive load, human review, and bottleneck reduction.',
    assistantTitle: 'Emergency OS Copilot',
    assistantPlaceholder: 'Ask about ED flow, EMS handoff, triage, bed pressure, referrals, discharge, equipment, surge, or bottlenecks...',
    primaryActionIds: ['assistant', 'active-alerts', 'hospital-map', 'workflows', 'tools', 'calculators'],
    quickPrompts: [
      'Summarize current ED bottlenecks across waiting room, EMS arrivals, beds, referrals, equipment, and staffing.',
      'Build a flow-aware triage risk profile from vitals, chief complaint, arrival mode, age, and risk factors.',
      'Show discharge, referral, and bed-flow opportunities that could reduce waiting and boarding.',
    ],
    focusMetrics: [
      { label: 'Volume', value: '50-150', helper: 'patients/day pilot posture' },
      { label: 'Team', value: '<10', helper: 'staff operating model' },
      { label: 'Review', value: 'Required', helper: 'No autonomous decisions' },
    ],
    operatingBrief: [
      'Start from the Whiteboard, not dashboards: every operational action begins with visible patient, queue, EMS, capacity, and decision-support context.',
      'Hide calculators, workflows, protocols, analytics, automations, referrals, boarding, and capacity behind contextual actions and Copilot routing.',
      'Optimize for a small clinical team managing 50-150 patients/day by reducing clicks, searching, cognitive load, and missed operational signals.',
    ],
  },
  'medical-iot': {
    tone: 'iot',
    theme: {
      accent: '#2dd4bf',
      surface: 'rgba(45, 212, 191, 0.12)',
      border: 'rgba(45, 212, 191, 0.36)',
    },
    environment: 'Telemetry and device operations environment',
    operatingLabel: 'Medical IoT OS',
    modeSummary: 'Device telemetry mode is active.',
    dashboardTitle: 'Medical IoT Command Center',
    dashboardSubtitle:
      'Telemetry freshness, offline devices, battery risk, maintenance, and device maps are now prioritized.',
    toolsTitle: 'Medical IoT Tool Console',
    toolsSubtitle:
      'Device telemetry, fleet management, maintenance, battery intelligence, and map workflows are prioritized.',
    recommendationsTitle: 'Medical IoT Recommendations',
    recommendationsSubtitle:
      'Recommendations now emphasize telemetry quality, offline devices, maintenance readiness, and safety limits.',
    assistantTitle: 'Medical IoT Assistant',
    assistantPlaceholder: 'Ask about offline devices, telemetry freshness, battery risk, or maintenance priorities...',
    primaryActionIds: ['medical-iot', 'devices', 'hospital-map', 'live-map', 'operations', 'tools'],
    quickPrompts: [
      'Which devices need attention based on stale telemetry?',
      'Summarize battery and maintenance risk for the current unit.',
      'What should biomedical engineering check first?',
    ],
    focusMetrics: [
      { label: 'Telemetry', value: 'Live', helper: 'Freshness and drift' },
      { label: 'Device alerts', value: 'Priority', helper: 'Offline and battery risk' },
      { label: 'Maintenance', value: 'Biomedical', helper: 'Calibration and service' },
    ],
    operatingBrief: [
      'Start with telemetry freshness and offline device alerts.',
      'Highlight battery, calibration, and maintenance risk.',
      'Seed Assistant with device-state and biomedical engineering context.',
    ],
  },
  icu: {
    operatingLabel: 'ICU OS',
    modeSummary: 'Critical care mode is active.',
    dashboardTitle: 'ICU Command Center',
    toolsTitle: 'ICU Tool Console',
    recommendationsTitle: 'ICU Recommendations',
    assistantTitle: 'ICU Assistant',
    assistantPlaceholder: 'Ask about SOFA trends, oxygenation, ventilation, telemetry, or escalation...',
    primaryActionIds: ['assistant', 'calculators', 'medical-iot', 'tools'],
    quickPrompts: [
      'Summarize critical-care deterioration risk.',
      'Which oxygenation or SOFA tools should I use next?',
      'What telemetry gaps or escalation signals matter most?',
    ],
  },
  cardiology: {
    operatingLabel: 'Cardiology OS',
    modeSummary: 'Cardiac risk mode is active.',
    dashboardTitle: 'Cardiology Command Center',
    toolsTitle: 'Cardiology Tool Console',
    recommendationsTitle: 'Cardiology Recommendations',
    assistantTitle: 'Cardiology Assistant',
    assistantPlaceholder: 'Ask about chest pain, ACS, ECG, arrhythmia, troponin, or cardiac risk...',
    primaryActionIds: ['assistant', 'calculators', 'tools'],
    quickPrompts: [
      'Help me reason through chest pain and ACS risk.',
      'Which cardiac calculator fits this presentation?',
      'Summarize ECG and troponin follow-up priorities.',
    ],
  },
  operations: {
    operatingLabel: 'Operations OS',
    modeSummary: 'Hospital operations mode is active.',
    dashboardTitle: 'Operations Command Center',
    dashboardSubtitle:
      'Capacity, maps, alerts, devices, system health, and coordination routes are now prioritized.',
    toolsTitle: 'Operations Tool Console',
    recommendationsTitle: 'Operations Recommendations',
    assistantTitle: 'Operations Assistant',
    assistantPlaceholder: 'Ask about capacity, devices, alerts, maps, staffing, or operational constraints...',
    primaryActionIds: ['operations', 'hospital-map', 'live-map', 'devices', 'digital-twin', 'system-status'],
    quickPrompts: [
      'Summarize operational bottlenecks right now.',
      'Which alerts or device issues should be handled first?',
      'What coordination steps should operations take next?',
    ],
  },
  fleet: {
    tone: 'fleet',
    theme: {
      accent: '#f59e0b',
      surface: 'rgba(245, 158, 11, 0.12)',
      border: 'rgba(245, 158, 11, 0.36)',
    },
    environment: 'Transport logistics and dispatch environment',
    operatingLabel: 'Fleet OS',
    modeSummary: 'Transport logistics mode is active.',
    dashboardTitle: 'Fleet Command Center',
    dashboardSubtitle:
      'Fleet map, dispatch readiness, route risk, and maintenance signals are now prioritized.',
    toolsTitle: 'Fleet Tool Console',
    recommendationsTitle: 'Fleet Recommendations',
    recommendationsSubtitle:
      'Recommendations now emphasize dispatch, route sequencing, vehicle readiness, and maintenance risk.',
    assistantTitle: 'Fleet Assistant',
    assistantPlaceholder: 'Ask about ETAs, route risk, vehicles, dispatch support, or maintenance...',
    primaryActionIds: ['fleet', 'live-map', 'operations', 'digital-twin', 'tools'],
    quickPrompts: [
      'Summarize route risk and transport readiness.',
      'Which vehicle or route needs attention first?',
      'Help me coordinate the next dispatch step.',
    ],
    focusMetrics: [
      { label: 'Fleet map', value: 'Active', helper: 'Vehicle location and route state' },
      { label: 'Dispatch', value: 'Ready', helper: 'Human-approved coordination' },
      { label: 'Maintenance', value: 'Predictive', helper: 'Vehicle risk and readiness' },
    ],
    operatingBrief: [
      'Start with fleet map and dispatch readiness.',
      'Prioritize route risk, ETAs, and vehicle availability.',
      'Surface maintenance signals before general operations tools.',
    ],
  },
  laboratory: {
    operatingLabel: 'Laboratory OS',
    modeSummary: 'Lab interpretation mode is active.',
    dashboardTitle: 'Laboratory Command Center',
    toolsTitle: 'Laboratory Tool Console',
    recommendationsTitle: 'Laboratory Recommendations',
    assistantTitle: 'Laboratory Assistant',
    assistantPlaceholder: 'Ask about abnormal labs, critical values, specimen flow, or interpretation...',
    primaryActionIds: ['laboratory', 'assistant', 'tools', 'calculators'],
    quickPrompts: [
      'Interpret these abnormal lab results and flag critical values.',
      'What follow-up labs should be verified?',
      'Summarize specimen or result bottlenecks.',
    ],
  },
  pharmacy: {
    operatingLabel: 'Pharmacy OS',
    modeSummary: 'Medication safety mode is active.',
    dashboardTitle: 'Pharmacy Command Center',
    toolsTitle: 'Pharmacy Tool Console',
    recommendationsTitle: 'Pharmacy Recommendations',
    assistantTitle: 'Pharmacy Assistant',
    assistantPlaceholder: 'Ask about drug interactions, dosing, renal adjustment, antibiotics, or medication safety...',
    primaryActionIds: ['assistant', 'tools', 'calculators'],
    quickPrompts: [
      'Check medication safety and interaction risk.',
      'Help review renal dosing and dose adjustments.',
      'Summarize antibiotic guidance for this case.',
    ],
  },
  simulation: {
    operatingLabel: 'Simulation OS',
    modeSummary: 'Training simulation mode is active.',
    dashboardTitle: 'Simulation Command Center',
    toolsTitle: 'Simulation Tool Console',
    recommendationsTitle: 'Simulation Recommendations',
    assistantTitle: 'Simulation Coach',
    assistantPlaceholder: 'Ask for practice scenarios, debriefs, competency gaps, or learner feedback...',
    primaryActionIds: ['simulation', 'simulation-outcomes', 'assistant', 'tools'],
    quickPrompts: [
      'Recommend a simulation scenario for this learner.',
      'Generate a structured debrief with competency gaps.',
      'What practice should come next?',
    ],
  },
  education: {
    operatingLabel: 'Education OS',
    modeSummary: 'Learning mode is active.',
    dashboardTitle: 'Education Command Center',
    toolsTitle: 'Education Tool Console',
    recommendationsTitle: 'Education Recommendations',
    assistantTitle: 'Education Coach',
    assistantPlaceholder: 'Ask for teaching plans, practice cases, debriefs, or competency goals...',
    primaryActionIds: ['simulation', 'simulation-outcomes', 'assistant', 'tools'],
    quickPrompts: [
      'Create a learning plan for this topic.',
      'Recommend practice based on competency gaps.',
      'Turn this case into a teaching scenario.',
    ],
  },
  governance: {
    operatingLabel: 'Governance OS',
    modeSummary: 'Compliance and audit mode is active.',
    dashboardTitle: 'Governance Command Center',
    toolsTitle: 'Governance Tool Console',
    recommendationsTitle: 'Governance Recommendations',
    assistantTitle: 'Governance Assistant',
    assistantPlaceholder: 'Ask about audit posture, safety review, policy, configuration, or unsupported capabilities...',
    primaryActionIds: ['system-status', 'settings', 'tools', 'assistant'],
    quickPrompts: [
      'Summarize governance and audit readiness.',
      'Which unsupported capabilities need review?',
      'Create a safety review checklist.',
    ],
  },
  administration: {
    operatingLabel: 'Administration OS',
    modeSummary: 'SaaS administration mode is active.',
    dashboardTitle: 'Administration Command Center',
    toolsTitle: 'Administration Tool Console',
    recommendationsTitle: 'Administration Recommendations',
    assistantTitle: 'Administration Assistant',
    assistantPlaceholder: 'Ask about workspace setup, roles, entitlements, backend readiness, or tenant operations...',
    primaryActionIds: ['settings', 'system-status', 'tools', 'assistant'],
    quickPrompts: [
      'Summarize workspace and tenant setup gaps.',
      'Which backend fallbacks need implementation?',
      'Review roles, permissions, and SaaS readiness.',
    ],
  },
});

const DEFAULT_EXPERIENCE = Object.freeze({
  tone: 'default',
  theme: {
    accent: 'var(--app-accent-interactive)',
    surface: 'color-mix(in srgb, var(--app-accent-interactive) 10%, transparent)',
    border: 'color-mix(in srgb, var(--app-accent-interactive) 30%, var(--app-panel-border))',
  },
  environment: 'Workspace-aware operating environment',
  operatingLabel: 'CareDroid OS',
  modeSummary: 'Workspace-aware mode is active.',
  dashboardTitle: 'Workspace Command Center',
  dashboardSubtitle:
    'Dashboard, tools, recommendations, and assistant context now follow the active workspace.',
  toolsTitle: 'Workspace Tool Console',
  toolsSubtitle: 'Tools are prioritized for the active workspace, role, access, and preferences.',
  recommendationsTitle: 'Workspace Recommendations',
  recommendationsSubtitle:
    'Recommendations are ranked using active workspace, role, organization, usage, and search signals.',
  assistantTitle: 'Workspace Assistant',
  assistantPlaceholder: 'Ask CareDroid with the active workspace context...',
  primaryActionIds: ['assistant', 'tools', 'operations', 'workspace'],
  quickPrompts: [
    'What should I focus on in this workspace?',
    'Which tools are most relevant right now?',
    'Summarize the current workspace priorities.',
  ],
  focusMetrics: [
    { label: 'Workspace', value: 'Active', helper: 'Context-aware routes' },
    { label: 'Tools', value: 'Filtered', helper: 'Role and access aware' },
    { label: 'Assistant', value: 'Contextual', helper: 'Workspace-seeded prompts' },
  ],
  operatingBrief: [
    'Use the active workspace to prioritize dashboards, tools, and recommendations.',
    'Keep Assistant seeded with workspace context.',
    'Route broad discovery through the shared shell.',
  ],
});

function workspaceIdFrom(value) {
  return (
    value?.id ||
    value?.workspaceId ||
    value?.workspaceKey ||
    value?.type ||
    value?.workspaceProfile?.id ||
    value?.workspaceProfile?.workspaceId ||
    DEFAULT_CARE_WORKSPACE_ID
  );
}

export function normalizeWorkspaceShortcut(shortcut) {
  if (!shortcut) return null;
  if (typeof shortcut === 'string') return WORKSPACE_ROUTE_SHORTCUTS[shortcut] || null;
  if (shortcut.path && shortcut.label) return shortcut;
  return WORKSPACE_ROUTE_SHORTCUTS[shortcut.id] || WORKSPACE_ROUTE_SHORTCUTS[shortcut.routeId] || null;
}

export function getWorkspaceExperienceProfile(workspaceLike = null) {
  const requestedId = workspaceIdFrom(workspaceLike);
  const knownWorkspace = CARE_WORKSPACES.some((workspace) => workspace.id === requestedId);
  const workspace = knownWorkspace
    ? getCareWorkspaceById(requestedId)
    : {
        id: requestedId,
        label: workspaceLike?.name || workspaceLike?.label || 'Workspace',
        shortLabel: workspaceLike?.shortLabel || workspaceLike?.name || workspaceLike?.label || 'Workspace',
        description: DEFAULT_EXPERIENCE.dashboardSubtitle,
        aiContext: workspaceLike?.assistantContext || DEFAULT_EXPERIENCE.modeSummary,
        toolIds: workspaceLike?.toolIds || [],
      };
  const override = EXPERIENCE_OVERRIDES[workspace.id] || {};
  const label = workspaceLike?.name || workspaceLike?.label || workspace.label;
  const shortLabel = workspace.shortLabel || label;
  const routeEntries = knownWorkspace ? getCareWorkspaceRouteEntries(workspace.id) : [];

  return {
    ...DEFAULT_EXPERIENCE,
    ...override,
    id: workspace.id,
    label,
    shortLabel,
    description: workspace.description,
    aiContext: workspace.aiContext,
    routeEntries,
    toolIds: workspaceLike?.toolIds?.length ? workspaceLike.toolIds : workspace.toolIds,
    focusMetrics: override.focusMetrics || DEFAULT_EXPERIENCE.focusMetrics,
    operatingBrief: override.operatingBrief || DEFAULT_EXPERIENCE.operatingBrief,
    dashboardSubtitle: override.dashboardSubtitle || workspace.description || DEFAULT_EXPERIENCE.dashboardSubtitle,
    toolsSubtitle: override.toolsSubtitle || workspace.description || DEFAULT_EXPERIENCE.toolsSubtitle,
    recommendationsSubtitle:
      override.recommendationsSubtitle || workspace.description || DEFAULT_EXPERIENCE.recommendationsSubtitle,
    assistantContext: workspaceLike?.assistantContext || workspace.aiContext,
  };
}

export function buildWorkspaceAssistantPrompt(prompt, experience) {
  const text = String(prompt || '').trim();
  if (!text) return '';
  const profile = experience || getWorkspaceExperienceProfile();
  return `[${profile.operatingLabel}] ${profile.assistantContext || profile.modeSummary}\n\n${text}`;
}
