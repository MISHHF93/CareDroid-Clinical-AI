import { describe, expect, it } from 'vitest';
import {
  buildAssetRegistry,
  buildDigitalTwinSnapshot,
  buildGlobalSearchResults,
  PLATFORM_WORKFLOWS,
  workspaceFilterSummary,
} from './platformOperatingSystem';

describe('platformOperatingSystem', () => {
  it('searches workspaces, dashboards, tools, workflows, notifications, and documents', () => {
    expect(buildGlobalSearchResults({ query: 'digital twin' }).map((item) => item.path)).toContain('/digital-twin');
    expect(buildGlobalSearchResults({ query: 'qsofa', workspaceId: 'emergency' }).some((item) => item.title.toLowerCase().includes('qsofa'))).toBe(true);
  });

  it('filters workspace context across tools, calculators, maps, notifications, and workflows', () => {
    const summary = workspaceFilterSummary('emergency');
    expect(summary.calculators.map((tool) => tool.id)).toEqual(
      expect.arrayContaining(['qsofa', 'news2', 'sofa-score', 'nihss', 'heart-score', 'grace-acs'])
    );
    expect(summary.maps.map((item) => item.path)).toEqual(expect.arrayContaining(['/hospital-map']));
    expect(summary.notifications.length).toBeGreaterThan(0);
    expect(summary.workflows.map((workflow) => workflow.id)).toContain('chest-pain');
  });

  it('builds digital twin and asset registry snapshots', () => {
    expect(buildDigitalTwinSnapshot().rooms.length).toBeGreaterThan(0);
    expect(buildAssetRegistry()).toEqual(
      expect.arrayContaining([expect.objectContaining({ status: 'referenced' })])
    );
  });

  it('keeps workflow fixtures labeled as demo previews', () => {
    expect(PLATFORM_WORKFLOWS.every((workflow) => workflow.executionMode === 'demo-preview')).toBe(true);
  });
});
