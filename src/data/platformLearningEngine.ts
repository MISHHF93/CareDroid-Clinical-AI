import {
  DEMO_PLATFORM_TELEMETRY_EVENTS,
  PLATFORM_ANALYTICS_DECISIONS,
  PLATFORM_ANALYTICS_EVENT_TYPES,
  buildPlatformAnalytics,
  sanitizeTelemetryEvents,
} from './platformAnalytics';
import { getUserFacingToolRegistryProjection } from './toolInventory';

export const PLATFORM_LEARNING_SUGGESTION_TYPES = Object.freeze({
  MERGE_TOOLS: 'merge_tools',
  HIDE_UNUSED_ASSET: 'hide_unused_asset',
  PROMOTE_HIGH_VALUE_ASSET: 'promote_high_value_asset',
  IMPROVE_DISCOVERY: 'improve_discovery',
  REPAIR_FAILED_LAUNCH: 'repair_failed_launch',
});

export const DEMO_PLATFORM_LEARNING_SIGNALS = Object.freeze({
  successfulWorkflows: [
    {
      id: 'workflow-sepsis',
      workflowId: 'sepsis-escalation',
      label: 'Sepsis escalation',
      count: 18,
      route: '/workflows',
    },
    {
      id: 'workflow-chest-pain',
      workflowId: 'chest-pain',
      label: 'Chest pain workflow',
      count: 11,
      route: '/workflows',
    },
  ],
  successfulSimulations: [
    {
      id: 'simulation-sepsis',
      scenarioId: 'sepsis-deterioration',
      label: 'Sepsis Deterioration',
      count: 13,
      route: '/simulation/sepsis-deterioration',
    },
  ],
  commonSearches: [
    { id: 'search-sepsis', category: 'sepsis', resultCount: 6, count: 24, route: '/tools' },
    {
      id: 'search-maps',
      category: 'operations maps',
      resultCount: 3,
      count: 15,
      route: '/operations',
    },
  ],
  abandonedPages: [
    {
      id: 'abandoned-ai-models',
      route: '/ai-models',
      label: 'AI Models',
      views: 16,
      completedActions: 1,
    },
    {
      id: 'abandoned-plugins',
      route: '/plugins',
      label: 'Plugins',
      views: 10,
      completedActions: 0,
    },
  ],
  failedLaunches: [
    {
      id: 'failed-lab',
      assetId: 'lab-interp',
      label: 'Lab Interpreter',
      route: '/tools/lab-interpreter',
      count: 5,
      reason: 'backend-timeout',
    },
    {
      id: 'failed-workflow-ai',
      assetId: 'workflow-builder-ai',
      label: 'Workflow Builder AI',
      route: '/tools/workflow-builder-ai',
      count: 3,
      reason: 'permission-or-route-blocked',
    },
  ],
});

function list(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function unique(values) {
  return [...new Set(list(values).flatMap(list).filter(Boolean).map(String))];
}

function toCount(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Math.round(Number(value) || 0)));
}

function priorityFromImpact(impact) {
  if (impact >= 80) return 'high';
  if (impact >= 45) return 'medium';
  return 'low';
}

function suggestion({
  id,
  type,
  title,
  rationale,
  route,
  impact,
  confidence,
  sourceSignals,
  metadata,
}) {
  return {
    id,
    type,
    title,
    rationale,
    route,
    impact: clamp(impact),
    confidence: Number(Math.max(0, Math.min(1, confidence ?? 0.72)).toFixed(2)),
    priority: priorityFromImpact(impact),
    sourceSignals: unique(sourceSignals),
    metadata: metadata || {},
  };
}

function normalizeLearningSignals(signals: any = {}) {
  return {
    successfulWorkflows: list(signals.successfulWorkflows),
    successfulSimulations: list(signals.successfulSimulations),
    commonSearches: list(signals.commonSearches),
    abandonedPages: list(signals.abandonedPages),
    failedLaunches: list(signals.failedLaunches),
  };
}

function signalTotals(signals) {
  return {
    successfulWorkflows: signals.successfulWorkflows.reduce(
      (sum, item) => sum + toCount(item.count, 1),
      0,
    ),
    successfulSimulations: signals.successfulSimulations.reduce(
      (sum, item) => sum + toCount(item.count, 1),
      0,
    ),
    commonSearches: signals.commonSearches.reduce((sum, item) => sum + toCount(item.count, 1), 0),
    abandonedPages: signals.abandonedPages.reduce((sum, item) => sum + toCount(item.views, 1), 0),
    failedLaunches: signals.failedLaunches.reduce((sum, item) => sum + toCount(item.count, 1), 0),
  };
}

function buildPromotionSuggestions({ analytics, signals }) {
  const topAssets = analytics.topUsed.slice(0, 4).map((row) =>
    suggestion({
      id: `promote-asset-${row.toolId}`,
      type: PLATFORM_LEARNING_SUGGESTION_TYPES.PROMOTE_HIGH_VALUE_ASSET,
      title: `Promote ${row.name}`,
      rationale: `${row.name} has ${row.usage} safe usage events and should be surfaced in navigation, onboarding, or recommendations.`,
      route: row.route || '/tools',
      impact: Math.min(100, 45 + row.usage),
      confidence: 0.82,
      sourceSignals: ['asset-usage', ...row.eventTypes],
      metadata: row,
    }),
  );

  const workflowSuggestions = signals.successfulWorkflows.slice(0, 3).map((workflow) =>
    suggestion({
      id: `promote-workflow-${workflow.workflowId || workflow.id}`,
      type: PLATFORM_LEARNING_SUGGESTION_TYPES.PROMOTE_HIGH_VALUE_ASSET,
      title: `Promote ${workflow.label || workflow.workflowId}`,
      rationale: `${workflow.label || workflow.workflowId} is repeatedly successful and should be promoted as a high-value workflow.`,
      route: workflow.route || '/workflows',
      impact: Math.min(100, 55 + toCount(workflow.count, 1) * 2),
      confidence: 0.84,
      sourceSignals: ['successful-workflows'],
      metadata: workflow,
    }),
  );

  const simulationSuggestions = signals.successfulSimulations.slice(0, 2).map((simulation) =>
    suggestion({
      id: `promote-simulation-${simulation.scenarioId || simulation.id}`,
      type: PLATFORM_LEARNING_SUGGESTION_TYPES.PROMOTE_HIGH_VALUE_ASSET,
      title: `Promote ${simulation.label || simulation.scenarioId}`,
      rationale: `${simulation.label || simulation.scenarioId} has repeated successful completions and should be recommended to matching roles.`,
      route: simulation.route || '/simulation',
      impact: Math.min(100, 50 + toCount(simulation.count, 1) * 2),
      confidence: 0.78,
      sourceSignals: ['successful-simulations'],
      metadata: simulation,
    }),
  );

  return [...topAssets, ...workflowSuggestions, ...simulationSuggestions];
}

function buildHideSuggestions({ analytics }) {
  return analytics.orphanTools.slice(0, 6).map((row) =>
    suggestion({
      id: `hide-unused-${row.toolId}`,
      type: PLATFORM_LEARNING_SUGGESTION_TYPES.HIDE_UNUSED_ASSET,
      title: `Review hiding ${row.name}`,
      rationale: `${row.name} has no safe usage signals in this learning window. Consider hiding, archiving, or moving it out of primary discovery.`,
      route: '/assets',
      impact: 48,
      confidence: 0.74,
      sourceSignals: ['unused-assets', 'inventory-gap'],
      metadata: row,
    }),
  );
}

function buildMergeSuggestions({ analytics }) {
  const mergeRows = analytics.decisions
    .filter((row) => row.decision === PLATFORM_ANALYTICS_DECISIONS.MERGE)
    .slice(0, 5);
  return mergeRows.map((row) =>
    suggestion({
      id: `merge-tool-${row.toolId}`,
      type: PLATFORM_LEARNING_SUGGESTION_TYPES.MERGE_TOOLS,
      title: `Merge or consolidate ${row.name}`,
      rationale: `${row.name} has low engagement compared with similar platform surfaces. Consider merging it into a related workflow or dashboard.`,
      route: '/tools',
      impact: 52,
      confidence: 0.68,
      sourceSignals: ['low-engagement', 'tool-overlap'],
      metadata: row,
    }),
  );
}

function buildDiscoverySuggestions({ signals }) {
  return signals.commonSearches.slice(0, 5).map((search) =>
    suggestion({
      id: `improve-discovery-${search.id || search.category}`,
      type: PLATFORM_LEARNING_SUGGESTION_TYPES.IMPROVE_DISCOVERY,
      title: `Improve discovery for ${search.category || search.label || 'common search'}`,
      rationale: `${toCount(search.count, 1)} common searches matched this category. Add a shortcut, recommendation, alias, or promoted asset.`,
      route: search.route || '/recommendations',
      impact: Math.min(100, 40 + toCount(search.count, 1) * 2),
      confidence: 0.8,
      sourceSignals: ['common-searches'],
      metadata: {
        category: search.category,
        resultCount: search.resultCount,
        count: search.count,
      },
    }),
  );
}

function buildRepairSuggestions({ signals }) {
  const failedLaunchSuggestions = signals.failedLaunches.slice(0, 5).map((failure) =>
    suggestion({
      id: `repair-launch-${failure.assetId || failure.id}`,
      type: PLATFORM_LEARNING_SUGGESTION_TYPES.REPAIR_FAILED_LAUNCH,
      title: `Repair ${failure.label || failure.assetId}`,
      rationale: `${failure.label || failure.assetId} has ${toCount(failure.count, 1)} failed launches. Review routing, permissions, backend support, or entitlement state.`,
      route: failure.route || '/tools',
      impact: Math.min(100, 60 + toCount(failure.count, 1) * 4),
      confidence: 0.86,
      sourceSignals: ['failed-launches'],
      metadata: failure,
    }),
  );

  const abandonedPageSuggestions = signals.abandonedPages
    .filter((page) => toCount(page.views) >= Math.max(3, toCount(page.completedActions) * 4))
    .slice(0, 5)
    .map((page) =>
      suggestion({
        id: `repair-abandoned-${page.id || page.route}`,
        type: PLATFORM_LEARNING_SUGGESTION_TYPES.IMPROVE_DISCOVERY,
        title: `Improve ${page.label || page.route}`,
        rationale: `${page.label || page.route} has ${toCount(page.views)} views but ${toCount(page.completedActions)} completed actions. Consider clearer CTAs, defaults, or guidance.`,
        route: page.route || '/dashboard',
        impact: Math.min(100, 44 + toCount(page.views)),
        confidence: 0.7,
        sourceSignals: ['abandoned-pages'],
        metadata: page,
      }),
    );

  return [...failedLaunchSuggestions, ...abandonedPageSuggestions];
}

export function buildPlatformLearningEngine({
  events = DEMO_PLATFORM_TELEMETRY_EVENTS,
  inventory = getUserFacingToolRegistryProjection(),
  recentTools = [] as any[],
  searchEvents = [] as any[],
  learningSignals = DEMO_PLATFORM_LEARNING_SIGNALS,
}: any = {}) {
  const signals = normalizeLearningSignals(learningSignals);
  const analytics = buildPlatformAnalytics({
    events: sanitizeTelemetryEvents(events),
    inventory,
    recentTools,
    searchEvents,
  });
  const suggestions = [
    ...buildRepairSuggestions({ signals }),
    ...buildPromotionSuggestions({ analytics, signals }),
    ...buildDiscoverySuggestions({ signals }),
    ...buildMergeSuggestions({ analytics }),
    ...buildHideSuggestions({ analytics }),
  ].sort(
    (a, b) => b.impact - a.impact || b.confidence - a.confidence || a.title.localeCompare(b.title),
  );

  const totals = signalTotals(signals);
  const byType = Object.values(PLATFORM_LEARNING_SUGGESTION_TYPES).map((type) => ({
    type,
    count: suggestions.filter((suggestionItem) => suggestionItem.type === type).length,
  }));

  return {
    generatedAt: new Date().toISOString(),
    privacy: analytics.privacy,
    summary: {
      ...totals,
      totalEvents: analytics.summary.totalEvents,
      trackedTools: analytics.summary.trackedTools,
      optimizationSuggestions: suggestions.length,
      highPrioritySuggestions: suggestions.filter((item) => item.priority === 'high').length,
    },
    signals,
    analytics,
    suggestions,
    byType,
    learningLoop: [
      'Capture safe usage signals',
      'Normalize behavior patterns',
      'Generate optimization suggestions',
      'Review with a human operator',
      'Apply configuration changes',
    ],
  };
}

export function buildLearningEventsFromSignals(signals = DEMO_PLATFORM_LEARNING_SIGNALS) {
  const normalized = normalizeLearningSignals(signals);
  return sanitizeTelemetryEvents([
    ...normalized.successfulWorkflows.map((workflow) => ({
      eventType: PLATFORM_ANALYTICS_EVENT_TYPES.WORKFLOW_USAGE,
      toolId: workflow.workflowId || workflow.id,
      count: workflow.count || 1,
      day: workflow.day,
    })),
    ...normalized.successfulSimulations.map((simulation) => ({
      eventType: PLATFORM_ANALYTICS_EVENT_TYPES.SIMULATION_COMPLETION,
      toolId: simulation.scenarioId || simulation.id,
      count: simulation.count || 1,
      day: simulation.day,
    })),
    ...normalized.commonSearches.map((search) => ({
      eventType: PLATFORM_ANALYTICS_EVENT_TYPES.SEARCH_ACTIVITY,
      toolId: search.category || search.id || 'platform-search',
      count: search.count || 1,
      day: search.day,
    })),
  ]);
}
