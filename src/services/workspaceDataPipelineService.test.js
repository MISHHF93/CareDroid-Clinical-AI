import { describe, expect, it } from 'vitest';
import WorkspaceDataPipelineService, {
  getWorkspaceAIContext,
  getWorkspaceAlerts,
  getWorkspaceAnalytics,
  getWorkspaceRecommendations,
  normalizeWorkspaceData,
} from './workspaceDataPipelineService';

describe('WorkspaceDataPipelineService', () => {
  it('normalizes workspace data through the canonical pipeline stages', () => {
    const data = normalizeWorkspaceData('emergency');

    expect(data.pipelineStages).toEqual([
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
    expect(data.workspace.id).toBe('emergency');
    expect(data.mode.modeName).toMatch(/Emergency/);
    expect(data.recommendations.some((item) => item.assetId === 'qsofa')).toBe(true);
    expect(data.analytics.counts.automations).toBeGreaterThan(0);
    expect(data.analytics.solutionPackage.title).toBe('Emergency Department Solution');
    expect(data.alerts.length).toBeGreaterThan(0);
  });

  it('returns honest backend status labels instead of claiming unavailable live services', () => {
    const data = WorkspaceDataPipelineService.getWorkspaceData('medical-iot');

    expect(data.backendConnections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'devices',
          status: 'demo-local-fallback',
          statusLabel: 'Demo/local fallback',
          isBackendWired: false,
        }),
      ])
    );
    expect(data.sourceStatus).toMatch(/demo\/local fallback/i);
  });

  it('returns non-null AI context for operational workspaces', () => {
    for (const workspaceId of ['emergency', 'laboratory', 'medical-iot', 'fleet', 'governance']) {
      const context = getWorkspaceAIContext(workspaceId);
      expect(context.workspaceId).toBe(workspaceId);
      expect(context.assistantContext).toEqual(expect.any(String));
      expect(context.assistantContext.length).toBeGreaterThan(12);
      expect(context.tools.length).toBeGreaterThan(0);
      expect(context.automations).toEqual(expect.any(Array));
    }
  });

  it('returns workspace-specific asset, alert, and analytics slices', () => {
    expect(getWorkspaceRecommendations('laboratory').map((item) => item.assetId)).toContain('lab-interp');
    expect(getWorkspaceRecommendations('fleet').map((item) => item.assetId)).toContain('fleet-live-map');
    expect(getWorkspaceRecommendations('governance').map((item) => item.assetId)).toEqual(
      expect.arrayContaining(['ai-governance', 'ai-security'])
    );
    expect(getWorkspaceAlerts('medical-iot').map((item) => item.label).join(' ')).toMatch(/telemetry|offline|battery/i);
    expect(getWorkspaceAnalytics('fleet').counts.tools).toBeGreaterThan(0);
  });
});
