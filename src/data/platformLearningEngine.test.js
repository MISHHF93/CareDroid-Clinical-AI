import { describe, expect, it } from 'vitest';
import {
  PLATFORM_LEARNING_SUGGESTION_TYPES,
  buildLearningEventsFromSignals,
  buildPlatformLearningEngine,
} from './platformLearningEngine';
import { PLATFORM_ANALYTICS_EVENT_TYPES } from './platformAnalytics';

const inventory = [
  { id: 'qsofa', name: 'qSOFA', category: 'Calculator' },
  { id: 'news2', name: 'NEWS2', category: 'Calculator' },
  { id: 'unused-dashboard', name: 'Unused Dashboard', category: 'Dashboard' },
  { id: 'workflow-helper', name: 'Workflow Helper', category: 'Workflow' },
];

const learningSignals = {
  successfulWorkflows: [
    { id: 'workflow-1', workflowId: 'sepsis-escalation', label: 'Sepsis escalation', count: 14 },
  ],
  successfulSimulations: [
    { id: 'sim-1', scenarioId: 'sepsis-deterioration', label: 'Sepsis Deterioration', count: 8 },
  ],
  commonSearches: [
    { id: 'search-1', category: 'sepsis', count: 12, resultCount: 4 },
  ],
  abandonedPages: [
    { id: 'abandoned-1', route: '/ai-models', label: 'AI Models', views: 14, completedActions: 1 },
  ],
  failedLaunches: [
    { id: 'failed-1', assetId: 'workflow-helper', label: 'Workflow Helper', count: 5, route: '/tools/workflow-builder-ai' },
  ],
};

describe('platformLearningEngine', () => {
  it('generates optimization suggestions from successful and failed usage signals', () => {
    const model = buildPlatformLearningEngine({
      inventory,
      learningSignals,
      events: [
        { eventType: PLATFORM_ANALYTICS_EVENT_TYPES.TOOL_USAGE, toolId: 'qsofa', count: 30, day: '2026-06-01' },
        { eventType: PLATFORM_ANALYTICS_EVENT_TYPES.CALCULATOR_USAGE, toolId: 'news2', count: 18, day: '2026-06-01' },
        { eventType: PLATFORM_ANALYTICS_EVENT_TYPES.WORKFLOW_USAGE, toolId: 'workflow-helper', count: 1, day: '2026-06-01' },
      ],
    });

    expect(model.summary.successfulWorkflows).toBe(14);
    expect(model.summary.successfulSimulations).toBe(8);
    expect(model.summary.commonSearches).toBe(12);
    expect(model.summary.failedLaunches).toBe(5);
    expect(model.suggestions.map((item) => item.type)).toEqual(
      expect.arrayContaining([
        PLATFORM_LEARNING_SUGGESTION_TYPES.PROMOTE_HIGH_VALUE_ASSET,
        PLATFORM_LEARNING_SUGGESTION_TYPES.HIDE_UNUSED_ASSET,
        PLATFORM_LEARNING_SUGGESTION_TYPES.IMPROVE_DISCOVERY,
        PLATFORM_LEARNING_SUGGESTION_TYPES.REPAIR_FAILED_LAUNCH,
      ]),
    );
  });

  it('builds privacy-safe analytics events from learning signals', () => {
    const events = buildLearningEventsFromSignals(learningSignals);

    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventType: PLATFORM_ANALYTICS_EVENT_TYPES.WORKFLOW_USAGE,
          toolId: 'sepsis-escalation',
          count: 14,
        }),
        expect.objectContaining({
          eventType: PLATFORM_ANALYTICS_EVENT_TYPES.SIMULATION_COMPLETION,
          toolId: 'sepsis-deterioration',
          count: 8,
        }),
        expect.objectContaining({
          eventType: PLATFORM_ANALYTICS_EVENT_TYPES.SEARCH_ACTIVITY,
          toolId: 'sepsis',
          count: 12,
        }),
      ]),
    );
    expect(events[0]).not.toHaveProperty('queryText');
  });
});
