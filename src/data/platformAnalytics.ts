import { getUserFacingToolRegistryProjection } from './toolInventory';

export const PLATFORM_ANALYTICS_EVENT_TYPES = Object.freeze({
  TOOL_USAGE: 'tool_usage',
  CALCULATOR_USAGE: 'calculator_usage',
  AI_LAUNCH: 'ai_launch',
  SIMULATION_COMPLETION: 'simulation_completion',
  DASHBOARD_ACTIVITY: 'dashboard_activity',
  WORKFLOW_USAGE: 'workflow_usage',
  SEARCH_ACTIVITY: 'search_activity',
});

export const PLATFORM_ANALYTICS_DECISIONS = Object.freeze({
  IMPROVE: 'improve',
  MERGE: 'merge',
  HIDE: 'hide',
  PROMOTE: 'promote',
  MONITOR: 'monitor',
});

const PRIVACY_BLOCKLIST = new Set([
  'userId',
  'email',
  'name',
  'patientId',
  'patientName',
  'mrn',
  'note',
  'notes',
  'message',
  'queryText',
  'freeText',
  'rawInput',
]);

export const DEMO_PLATFORM_TELEMETRY_EVENTS = Object.freeze([
  { eventType: 'tool_usage', toolId: 'qsofa', count: 42, day: '2026-05-24' },
  { eventType: 'calculator_usage', toolId: 'qsofa', count: 31, day: '2026-05-25' },
  { eventType: 'calculator_usage', toolId: 'news2', count: 27, day: '2026-05-26' },
  { eventType: 'ai_launch', toolId: 'clinical-decision-support', count: 22, day: '2026-05-26' },
  {
    eventType: 'ai_launch',
    toolId: 'clinical-documentation-assistant',
    count: 18,
    day: '2026-05-27',
  },
  { eventType: 'simulation_completion', toolId: 'simulation-suite', count: 13, day: '2026-05-27' },
  {
    eventType: 'simulation_completion',
    toolId: 'simulation-outcomes',
    count: 9,
    day: '2026-05-28',
  },
  {
    eventType: 'dashboard_activity',
    toolId: 'digital-operations-center',
    count: 16,
    day: '2026-05-28',
  },
  {
    eventType: 'dashboard_activity',
    toolId: 'predictive-analytics-dashboard',
    count: 14,
    day: '2026-05-29',
  },
  { eventType: 'workflow_usage', toolId: 'research-evidence-hub', count: 11, day: '2026-05-29' },
  { eventType: 'workflow_usage', toolId: 'protocols', count: 21, day: '2026-05-30' },
  { eventType: 'search_activity', toolId: 'tools-overview', count: 34, day: '2026-05-30' },
]);

function normalizeEventType(type) {
  const normalized = String(type || '')
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, '_');
  if (Object.values(PLATFORM_ANALYTICS_EVENT_TYPES).includes(normalized as any)) return normalized;
  return PLATFORM_ANALYTICS_EVENT_TYPES.TOOL_USAGE;
}

function normalizeToolId(toolId) {
  return String(toolId || 'unknown-tool')
    .trim()
    .toLowerCase();
}

function dayBucket(timestampOrDay) {
  const value = String(timestampOrDay || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : 'unknown-day';
}

export function sanitizeTelemetryEvent(event: any = {}) {
  const safe: any = {
    eventType: normalizeEventType(event.eventType || event.eventName || event.event),
    toolId: normalizeToolId(event.toolId || event.toolType || event.parameters?.toolId),
    count: Math.max(1, Number(event.count) || 1),
    day: dayBucket(event.day || event.timestamp),
  };

  if (event.surface) safe.surface = String(event.surface);
  if (event.category) safe.category = String(event.category);

  for (const key of Object.keys(event)) {
    if (PRIVACY_BLOCKLIST.has(key)) continue;
    if (
      [
        'eventType',
        'eventName',
        'event',
        'toolId',
        'toolType',
        'count',
        'day',
        'timestamp',
        'surface',
        'category',
        'parameters',
      ].includes(key)
    )
      continue;
    if (['string', 'number', 'boolean'].includes(typeof event[key])) {
      safe[key] = event[key];
    }
  }

  return safe;
}

export function sanitizeTelemetryEvents(events = [] as any[]) {
  return events.map(sanitizeTelemetryEvent);
}

function eventsFromToolResults(toolResults = [] as any[]) {
  return toolResults.map((result) =>
    sanitizeTelemetryEvent({
      eventType: PLATFORM_ANALYTICS_EVENT_TYPES.TOOL_USAGE,
      toolId: result.toolType || result.toolId,
      timestamp: result.createdAt || result.timestamp,
      count: 1,
    }),
  );
}

function toolLookup(inventory) {
  return new Map(inventory.map((tool) => [tool.id, tool]));
}

function classifyTool(tool) {
  const haystack = [
    tool?.id,
    tool?.name,
    tool?.category,
    tool?.presentationCategory,
    tool?.surface,
    tool?.launchType,
    ...(tool?.tags || []),
  ]
    .join(' ')
    .toLowerCase();

  if (
    tool?.presentationCategory === 'Calculator' ||
    tool?.category === 'Calculator' ||
    haystack.includes('calculator')
  )
    return 'calculator';
  if (haystack.includes('simulation')) return 'simulation';
  if (
    haystack.includes('dashboard') ||
    haystack.includes('command center') ||
    haystack.includes('operations')
  )
    return 'dashboard';
  if (
    haystack.includes('workflow') ||
    haystack.includes('protocol') ||
    haystack.includes('documentation')
  )
    return 'workflow';
  if (
    haystack.includes('ai') ||
    haystack.includes('assistant') ||
    tool?.launchType === 'chat-assisted'
  )
    return 'ai';
  return 'tool';
}

function aggregateUsage(events, inventory) {
  const byTool = new Map();
  const tools = toolLookup(inventory);

  for (const event of events) {
    const toolId = normalizeToolId(event.toolId);
    const tool: any = tools.get(toolId);
    const current = byTool.get(toolId) || {
      toolId,
      name: tool?.name || toolId,
      category: tool?.category || 'Unknown',
      usage: 0,
      eventTypes: new Set(),
      decision: PLATFORM_ANALYTICS_DECISIONS.MONITOR,
    };

    current.usage += Math.max(1, Number(event.count) || 1);
    current.eventTypes.add(event.eventType);
    byTool.set(toolId, current);
  }

  return [...byTool.values()]
    .map((row) => ({ ...row, eventTypes: [...row.eventTypes] }))
    .sort((a, b) => b.usage - a.usage || a.name.localeCompare(b.name));
}

function aggregateByEventType(events) {
  const byType = new Map();
  for (const event of events) {
    byType.set(event.eventType, (byType.get(event.eventType) || 0) + event.count);
  }
  return Object.values(PLATFORM_ANALYTICS_EVENT_TYPES).map((eventType) => ({
    eventType,
    count: byType.get(eventType) || 0,
  }));
}

function buildTrend(events) {
  const byDay = new Map();
  for (const event of events) {
    const current = byDay.get(event.day) || 0;
    byDay.set(event.day, current + event.count);
  }
  return [...byDay.entries()]
    .map(([day, count]) => ({ day, count }))
    .sort((a, b) => a.day.localeCompare(b.day));
}

function decideToolAction(tool, usage, medianUsage) {
  const category = classifyTool(tool);
  if (usage === 0) return PLATFORM_ANALYTICS_DECISIONS.HIDE;
  if (usage >= Math.max(12, medianUsage * 2)) return PLATFORM_ANALYTICS_DECISIONS.PROMOTE;
  if (
    usage <= Math.max(2, medianUsage * 0.25) &&
    ['workflow', 'dashboard', 'ai'].includes(category)
  ) {
    return PLATFORM_ANALYTICS_DECISIONS.MERGE;
  }
  if (usage <= Math.max(4, medianUsage * 0.5)) return PLATFORM_ANALYTICS_DECISIONS.IMPROVE;
  return PLATFORM_ANALYTICS_DECISIONS.MONITOR;
}

export function buildPlatformAnalytics({
  metrics = null,
  toolResults = [] as any[],
  events = DEMO_PLATFORM_TELEMETRY_EVENTS,
  inventory = getUserFacingToolRegistryProjection(),
  recentTools = [] as any[],
  searchEvents = [] as any[],
}: any = {}) {
  const sanitizedEvents = sanitizeTelemetryEvents([
    ...events,
    ...eventsFromToolResults(toolResults),
    ...recentTools.map((toolId) => ({
      eventType: PLATFORM_ANALYTICS_EVENT_TYPES.TOOL_USAGE,
      toolId,
      count: 1,
      day: 'unknown-day',
    })),
    ...searchEvents.map((event) => ({
      ...event,
      eventType: PLATFORM_ANALYTICS_EVENT_TYPES.SEARCH_ACTIVITY,
    })),
  ]);

  const usageRows = aggregateUsage(sanitizedEvents, inventory);
  const usageById = new Map(usageRows.map((row) => [row.toolId, row.usage]));
  const usageValues = usageRows.map((row) => row.usage).sort((a, b) => a - b);
  const medianUsage = usageValues.length ? usageValues[Math.floor(usageValues.length / 2)] : 0;
  const orphanTools = inventory
    .filter((tool) => !usageById.has(tool.id))
    .map((tool) => ({
      toolId: tool.id,
      name: tool.name,
      category: tool.category,
      recommendation: PLATFORM_ANALYTICS_DECISIONS.HIDE,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const decisionRows = inventory
    .map((tool) => {
      const usage = usageById.get(tool.id) || 0;
      return {
        toolId: tool.id,
        name: tool.name,
        category: tool.category,
        usage,
        decision: decideToolAction(tool, usage, medianUsage),
      };
    })
    .sort((a, b) => {
      if (a.decision !== b.decision) return a.decision.localeCompare(b.decision);
      return b.usage - a.usage || a.name.localeCompare(b.name);
    });

  const engagement = aggregateByEventType(sanitizedEvents);
  const topUsed = usageRows.slice(0, 8);
  const leastUsed = decisionRows
    .filter((row) => row.usage > 0)
    .sort((a, b) => a.usage - b.usage || a.name.localeCompare(b.name))
    .slice(0, 8);

  return {
    privacy: {
      mode: 'privacy-safe-aggregate',
      excludes: [...PRIVACY_BLOCKLIST],
      storesPhi: false,
      storesUserIdentifiers: false,
    },
    summary: {
      totalEvents:
        metrics?.totalEvents ?? sanitizedEvents.reduce((total, event) => total + event.count, 0),
      trackedTools: usageRows.length,
      inventoryTools: inventory.length,
      orphanToolCount: orphanTools.length,
      activeUsers: metrics?.dailyActiveUsers ?? null,
      searchEvents:
        engagement.find((item) => item.eventType === PLATFORM_ANALYTICS_EVENT_TYPES.SEARCH_ACTIVITY)
          ?.count || 0,
    },
    usageRows,
    topUsed,
    leastUsed,
    orphanTools,
    adoptionTrend: buildTrend(sanitizedEvents),
    featureEngagement: engagement,
    decisions: decisionRows,
  };
}
