import { CANONICAL_ROUTES } from '../config/routes.config';

export const FRONTEND_OS_FLOW = Object.freeze([
  Object.freeze({
    id: 'app-shell',
    label: 'AppShell',
    path: CANONICAL_ROUTES.dashboard,
    description: 'One authenticated shell owns chrome, workspace context, search, and command launch.',
  }),
  Object.freeze({
    id: 'workspace',
    label: 'CareDroid',
    path: CANONICAL_ROUTES.emergencyWhiteboard,
    description: 'CareDroid sets the operating mode, recommendations, copilot context, and patient flow.',
  }),
  Object.freeze({
    id: 'dashboard',
    label: 'Whiteboard',
    path: CANONICAL_ROUTES.emergencyWhiteboard,
    description: 'Whiteboard summarizes CareDroid flow and prioritizes the next action.',
  }),
  Object.freeze({
    id: 'asset-launch',
    label: 'Asset Launch',
    path: CANONICAL_ROUTES.search,
    description: 'Search, command palette, and assistant launch assets without navigation hunting.',
  }),
  Object.freeze({
    id: 'workflow',
    label: 'Workflow',
    path: CANONICAL_ROUTES.workflows,
    description: 'Workflow turns launched assets into repeatable workspace execution.',
  }),
  Object.freeze({
    id: 'result',
    label: 'Result',
    path: CANONICAL_ROUTES.timeline,
    description: 'Results, signals, outcomes, and follow-up context return to the workspace.',
  }),
]);

const WORKSPACE_ROUTES = [/^\/workspace(\/|$)/, /^\/workspaces$/];
const DASHBOARD_ROUTES = [
  CANONICAL_ROUTES.dashboard,
  CANONICAL_ROUTES.operations,
  CANONICAL_ROUTES.digitalTwin,
  CANONICAL_ROUTES.hospitalMap,
  CANONICAL_ROUTES.medicalIot,
  CANONICAL_ROUTES.devices,
  CANONICAL_ROUTES.fleetMap,
];
const ASSET_LAUNCH_ROUTES = [
  CANONICAL_ROUTES.search,
  CANONICAL_ROUTES.assistant,
  CANONICAL_ROUTES.tools,
  CANONICAL_ROUTES.assets,
  CANONICAL_ROUTES.calculators,
  CANONICAL_ROUTES.developerCatalog,
];
const WORKFLOW_ROUTES = [
  CANONICAL_ROUTES.workflows,
  CANONICAL_ROUTES.automation,
  CANONICAL_ROUTES.simulation,
];
const RESULT_ROUTES = [
  CANONICAL_ROUTES.timeline,
  CANONICAL_ROUTES.notifications,
  CANONICAL_ROUTES.recommendations,
  CANONICAL_ROUTES.simulationOutcomes,
  CANONICAL_ROUTES.platformAnalytics,
  CANONICAL_ROUTES.workflowMining,
  CANONICAL_ROUTES.outcomes,
];

function pathMatches(pathname, routes) {
  return routes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export function getFrontendOperatingSystemStage(pathname = CANONICAL_ROUTES.dashboard) {
  const path = String(pathname || CANONICAL_ROUTES.dashboard).split('?')[0];
  if (WORKSPACE_ROUTES.some((pattern) => pattern.test(path))) return 'workspace';
  if (pathMatches(path, DASHBOARD_ROUTES)) return 'dashboard';
  if (pathMatches(path, ASSET_LAUNCH_ROUTES)) return 'asset-launch';
  if (pathMatches(path, WORKFLOW_ROUTES)) return 'workflow';
  if (pathMatches(path, RESULT_ROUTES)) return 'result';
  return 'asset-launch';
}

function workspaceLabelFrom(workspaceLike) {
  return (
    workspaceLike?.label ||
    workspaceLike?.name ||
    workspaceLike?.shortLabel ||
    workspaceLike?.workspaceProfile?.label ||
    'CareDroid'
  );
}

export function getFrontendOperatingSystemState({
  pathname = CANONICAL_ROUTES.dashboard,
  workspace = null,
  tenantId = 'personal',
  plan = 'free',
}: any = {}) {
  const currentStageId = getFrontendOperatingSystemStage(pathname);
  const currentIndex = FRONTEND_OS_FLOW.findIndex((step) => step.id === currentStageId);
  const safeIndex = currentIndex >= 0 ? currentIndex : 0;
  const workspaceLabel = workspaceLabelFrom(workspace);

  return {
    shellLabel: 'CareDroid Frontend OS',
    workspaceLabel,
    tenantId,
    plan,
    currentStageId,
    currentStage: FRONTEND_OS_FLOW[safeIndex],
    flowSteps: FRONTEND_OS_FLOW.map((step, index) => ({
      ...step,
      state: index < safeIndex ? 'complete' : index === safeIndex ? 'current' : 'next',
    })),
    summary: `${workspaceLabel} is in ${FRONTEND_OS_FLOW[safeIndex].label} mode.`,
  };
}
