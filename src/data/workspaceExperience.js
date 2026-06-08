import {
  CARE_WORKSPACES,
  DEFAULT_CARE_WORKSPACE_ID,
  WORKSPACE_ROUTE_SHORTCUTS,
  getCareWorkspaceById,
  getCareWorkspaceRouteEntries,
} from '../config/workspace.config';

const EXPERIENCE_OVERRIDES = Object.freeze({
  emergency: {
    operatingLabel: 'Emergency OS',
    modeSummary: 'Rapid triage mode is active.',
    dashboardTitle: 'Emergency Command Center',
    dashboardSubtitle:
      'Triage risk, active alerts, emergency calculators, and live operational context are now prioritized.',
    toolsTitle: 'Emergency Tool Console',
    toolsSubtitle:
      'Emergency calculators, deterioration scores, stroke/cardiac pathways, and guided triage tools are prioritized.',
    recommendationsTitle: 'Emergency Recommendations',
    recommendationsSubtitle:
      'Recommendations now emphasize time-sensitive triage, escalation, alerts, and emergency care pathways.',
    assistantTitle: 'Emergency Assistant',
    assistantPlaceholder: 'Ask about triage, red flags, deterioration, stroke, sepsis, trauma, or chest pain...',
    primaryActionIds: ['assistant', 'calculators', 'active-alerts', 'hospital-map', 'workflows', 'tools'],
    quickPrompts: [
      'Help me triage an unstable patient with abnormal vitals.',
      'What emergency calculators should I use next?',
      'Summarize red flags and escalation steps for this presentation.',
    ],
  },
  'medical-iot': {
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
    operatingLabel: 'Fleet OS',
    modeSummary: 'Transport logistics mode is active.',
    dashboardTitle: 'Fleet Command Center',
    toolsTitle: 'Fleet Tool Console',
    recommendationsTitle: 'Fleet Recommendations',
    assistantTitle: 'Fleet Assistant',
    assistantPlaceholder: 'Ask about ETAs, route risk, vehicles, dispatch support, or maintenance...',
    primaryActionIds: ['fleet', 'operations', 'live-map', 'tools', 'assistant'],
    quickPrompts: [
      'Summarize route risk and transport readiness.',
      'Which vehicle or route needs attention first?',
      'Help me coordinate the next dispatch step.',
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
});

const DEFAULT_EXPERIENCE = Object.freeze({
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
