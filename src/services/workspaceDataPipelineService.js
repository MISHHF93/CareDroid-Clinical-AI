import {
  DEFAULT_CARE_WORKSPACE_ID,
  buildCareWorkspaceModel,
  getWorkspaceFunctionalityMode,
  getWorkspaceSubpageEntries,
} from '../config/workspace.config';
import {
  getSolutionPackageForWorkspace,
  getWorkspaceAutomations,
} from '../data/automationRegistry';
import { workspaceFilterSummary } from '../data/platformOperatingSystem';

const PIPELINE_STAGES = Object.freeze([
  'Source',
  'Ingestion',
  'Normalization',
  'Workspace Context',
  'Asset Recommendations',
  'Dashboard Widgets',
  'Alerts',
  'AI Context',
  'Reports',
]);

function normalizeWorkspaceId(workspaceId) {
  return String(workspaceId || DEFAULT_CARE_WORKSPACE_ID).trim() || DEFAULT_CARE_WORKSPACE_ID;
}

function backendLabel(service) {
  return service.status === 'backend-wired' ? 'Backend wired' : 'Demo/local fallback';
}

function buildDataSources(mode) {
  return (mode.primaryDataSources || []).map((source) => ({
    id: source.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    label: source,
    status: source === 'backend APIs' ? 'mixed' : 'available',
  }));
}

function buildBackendConnections(mode) {
  return (mode.backendServices || []).map((service) => ({
    ...service,
    statusLabel: backendLabel(service),
    isBackendWired: service.status === 'backend-wired',
  }));
}

function buildRecommendations(model, mode) {
  const toolRecommendations = model.toolEntries.slice(0, 6).map((tool) => ({
    id: `tool:${tool.id}`,
    type: 'asset',
    assetId: tool.id,
    label: tool.name,
    description: tool.description,
    source: 'workspace-asset-registry',
  }));
  const workflowRecommendations = (mode.workflows || []).slice(0, 4).map((workflow) => ({
    id: `workflow:${workflow.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    type: 'workflow',
    label: workflow,
    description: `Continue ${workflow} in ${mode.modeName}.`,
    source: 'workspace-mode-model',
  }));
  return [...toolRecommendations, ...workflowRecommendations];
}

function buildAlerts(workspaceId, mode) {
  const summary = workspaceFilterSummary(workspaceId);
  const localAlerts = (mode.alerts || []).map((alert) => ({
    id: `mode:${alert.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    label: alert,
    severity: /critical|offline|security|risk|gap/i.test(alert) ? 'high' : 'medium',
    source: 'workspace-mode-model',
    status: 'demo/local fallback',
  }));
  const notifications = (summary.notifications || []).slice(0, 4).map((notification) => ({
    id: `notification:${notification.id}`,
    label: notification.title,
    detail: notification.body,
    severity: notification.priority || 'medium',
    source: 'workspace-filter-summary',
    status: 'frontend local/demo data',
  }));
  return [...localAlerts, ...notifications];
}

function buildAnalytics(model, mode, recommendations, alerts) {
  const automations = getWorkspaceAutomations(model.workspace.id);
  return {
    workspaceId: model.workspace.id,
    modeName: mode.modeName,
    counts: {
      subpages: model.subpageEntries.length,
      tools: model.toolEntries.length,
      automations: automations.length,
      activeAutomations: automations.filter((automation) => automation.status === 'active').length,
      dashboards: mode.dashboards.length,
      workflows: mode.workflows.length,
      alerts: alerts.length,
      recommendations: recommendations.length,
      backendWiredServices: model.backendStatus.live.length,
      fallbackServices: model.backendStatus.fallback.length,
    },
    dashboardWidgets: mode.dashboards,
    solutionPackage: getSolutionPackageForWorkspace(model.workspace.id),
    backendCoverage:
      mode.backendServices.length > 0
        ? Math.round((model.backendStatus.live.length / mode.backendServices.length) * 100)
        : 0,
  };
}

export const WorkspaceDataPipelineService = {
  getWorkspaceData(workspaceId = DEFAULT_CARE_WORKSPACE_ID) {
    const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId);
    const model = buildCareWorkspaceModel(normalizedWorkspaceId);
    const mode = getWorkspaceFunctionalityMode(model.workspace.id);
    const recommendations = buildRecommendations(model, mode);
    const alerts = buildAlerts(model.workspace.id, mode);
    const analytics = buildAnalytics(model, mode, recommendations, alerts);

    return {
      workspace: model.workspace,
      mode,
      subpages: getWorkspaceSubpageEntries(model.workspace.id),
      pipelineStages: PIPELINE_STAGES,
      dataSources: buildDataSources(mode),
      backendConnections: buildBackendConnections(mode),
      recommendations,
      alerts,
      analytics,
      aiContext: this.getWorkspaceAIContext(model.workspace.id),
      sourceStatus: model.backendStatus.fallback.length
        ? 'Backend connected where wired; demo/local fallback where endpoints are not implemented.'
        : 'Backend wired.',
    };
  },

  normalizeWorkspaceData(workspaceId = DEFAULT_CARE_WORKSPACE_ID) {
    const data = this.getWorkspaceData(workspaceId);
    return {
      ...data,
      normalizedAt: 'frontend-runtime',
      pipeline: {
        source: data.dataSources,
        ingestion: data.mode.dataPipeline.ingestion,
        normalization: data.mode.dataPipeline.normalization,
        workspaceContext: data.mode.dataPipeline.workspaceContext,
        assetRecommendations: data.recommendations,
        dashboardWidgets: data.mode.dataPipeline.dashboardWidgets,
        alerts: data.alerts,
        aiContext: data.aiContext,
        reports: data.mode.dataPipeline.reports,
      },
    };
  },

  getWorkspaceAlerts(workspaceId = DEFAULT_CARE_WORKSPACE_ID) {
    const mode = getWorkspaceFunctionalityMode(workspaceId);
    return buildAlerts(normalizeWorkspaceId(workspaceId), mode);
  },

  getWorkspaceRecommendations(workspaceId = DEFAULT_CARE_WORKSPACE_ID) {
    const model = buildCareWorkspaceModel(workspaceId);
    return buildRecommendations(model, getWorkspaceFunctionalityMode(model.workspace.id));
  },

  getWorkspaceAnalytics(workspaceId = DEFAULT_CARE_WORKSPACE_ID) {
    const model = buildCareWorkspaceModel(workspaceId);
    const mode = getWorkspaceFunctionalityMode(model.workspace.id);
    const recommendations = buildRecommendations(model, mode);
    const alerts = buildAlerts(model.workspace.id, mode);
    return buildAnalytics(model, mode, recommendations, alerts);
  },

  getWorkspaceAIContext(workspaceId = DEFAULT_CARE_WORKSPACE_ID) {
    const model = buildCareWorkspaceModel(workspaceId);
    const mode = getWorkspaceFunctionalityMode(model.workspace.id);
    return {
      workspaceId: model.workspace.id,
      operatingMode: mode.modeName,
      assistantContext: model.workspace.aiContext || mode.purpose,
      agents: mode.aiAgents,
      tools: model.toolEntries.map((tool) => ({ id: tool.id, name: tool.name, category: tool.category })),
      workflows: mode.workflows,
      alerts: mode.alerts,
      reports: mode.reports,
      backendConnections: buildBackendConnections(mode),
      automations: getWorkspaceAutomations(model.workspace.id).map((automation) => ({
        automationId: automation.automationId,
        title: automation.title,
        riskLevel: automation.riskLevel,
        humanReviewRequired: automation.humanReviewRequired,
      })),
    };
  },
};

export const getWorkspaceData = WorkspaceDataPipelineService.getWorkspaceData.bind(WorkspaceDataPipelineService);
export const normalizeWorkspaceData = WorkspaceDataPipelineService.normalizeWorkspaceData.bind(WorkspaceDataPipelineService);
export const getWorkspaceAlerts = WorkspaceDataPipelineService.getWorkspaceAlerts.bind(WorkspaceDataPipelineService);
export const getWorkspaceRecommendations = WorkspaceDataPipelineService.getWorkspaceRecommendations.bind(WorkspaceDataPipelineService);
export const getWorkspaceAnalytics = WorkspaceDataPipelineService.getWorkspaceAnalytics.bind(WorkspaceDataPipelineService);
export const getWorkspaceAIContext = WorkspaceDataPipelineService.getWorkspaceAIContext.bind(WorkspaceDataPipelineService);

export default WorkspaceDataPipelineService;
