import { beforeEach, describe, expect, it, vi } from 'vitest';
import { recordUsageEvent } from './subscriptionApi';
import {
  ASSET_UTILIZATION_EVENT_TYPES,
  closeCurrentAssetUsageSession,
  recordAssetLaunchUsage,
  recordAssetRecommendationAccepted,
  recordWorkflowCompletion,
  USAGE_EVENT_TYPES,
} from './usageMeteringService';

vi.mock('./subscriptionApi', () => ({
  recordUsageEvent: vi.fn(async () => ({ ok: true, data: {}, message: '' })),
}));

describe('usageMeteringService asset utilization telemetry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
  });

  it('records launches and closes sessions with duration metadata', () => {
    const nowSpy = vi.spyOn(Date, 'now');
    nowSpy.mockReturnValue(1_000);

    recordAssetLaunchUsage(
      { registryId: 'qsofa', mode: 'calculator-route', pathname: '/tools/calculators/qsofa' },
      { source: 'registry-tool-launch' },
    );

    nowSpy.mockReturnValue(31_000);
    closeCurrentAssetUsageSession('closed');
    nowSpy.mockRestore();

    expect(recordUsageEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: USAGE_EVENT_TYPES.CALCULATOR_LAUNCH,
        assetId: 'qsofa',
        quantity: 1,
        metadata: expect.objectContaining({
          eventType: ASSET_UTILIZATION_EVENT_TYPES.ASSET_LAUNCHED,
          source: 'registry-tool-launch',
        }),
      }),
    );
    expect(recordUsageEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: USAGE_EVENT_TYPES.CALCULATOR_LAUNCH,
        assetId: 'qsofa',
        quantity: 0,
        metadata: expect.objectContaining({
          eventType: ASSET_UTILIZATION_EVENT_TYPES.ASSET_DURATION,
          durationSeconds: 30,
        }),
      }),
    );
  });

  it('records abandonment when a session closes below the threshold', () => {
    const nowSpy = vi.spyOn(Date, 'now');
    nowSpy.mockReturnValue(1_000);

    recordAssetLaunchUsage(
      { registryId: 'drug-check', mode: 'tool-page', pathname: '/tools/drug-checker' },
      { source: 'tools-overview' },
    );

    nowSpy.mockReturnValue(6_000);
    closeCurrentAssetUsageSession('closed');
    nowSpy.mockRestore();

    expect(recordUsageEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        assetId: 'drug-check',
        quantity: 0,
        metadata: expect.objectContaining({
          eventType: ASSET_UTILIZATION_EVENT_TYPES.ASSET_ABANDONED,
          durationSeconds: 5,
          abandonmentThresholdSeconds: 15,
        }),
      }),
    );
  });

  it('records recommendation acceptance and workflow completion as zero-quantity signals', () => {
    recordAssetRecommendationAccepted({
      recommendation: {
        id: 'rec-qsofa',
        type: 'tools',
        route: '/tools/calculators/qsofa',
        score: 92,
        item: { id: 'qsofa' },
      },
    });
    recordWorkflowCompletion({ workflowId: 'workflow-builder', blockCount: 3 });

    expect(recordUsageEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: USAGE_EVENT_TYPES.TOOL_LAUNCH,
        assetId: 'qsofa',
        quantity: 0,
        metadata: expect.objectContaining({
          eventType: ASSET_UTILIZATION_EVENT_TYPES.RECOMMENDATION_ACCEPTED,
          recommendationId: 'rec-qsofa',
        }),
      }),
    );
    expect(recordUsageEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: USAGE_EVENT_TYPES.TOOL_LAUNCH,
        assetId: 'workflow-builder',
        quantity: 0,
        metadata: expect.objectContaining({
          eventType: ASSET_UTILIZATION_EVENT_TYPES.WORKFLOW_COMPLETED,
          workflowId: 'workflow-builder',
          blockCount: 3,
        }),
      }),
    );
  });
});
