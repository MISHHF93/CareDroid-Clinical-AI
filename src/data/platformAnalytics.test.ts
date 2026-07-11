import { describe, expect, it } from 'vitest';
import {
  buildPlatformAnalytics,
  PLATFORM_ANALYTICS_DECISIONS,
  PLATFORM_ANALYTICS_EVENT_TYPES,
  sanitizeTelemetryEvent,
} from './platformAnalytics';

const inventory = [
  { id: 'qsofa', name: 'qSOFA', category: 'Calculator', presentationCategory: 'Calculator' },
  { id: 'documentation', name: 'Documentation', category: 'Reference', launchType: 'clinical-page' },
  { id: 'simulation-suite', name: 'Simulation Suite', category: 'Education & Simulation' },
  { id: 'dashboard-a', name: 'Dashboard A', category: 'Hospital Operations' },
  { id: 'orphan-tool', name: 'Orphan Tool', category: 'Reference' },
];

describe('platformAnalytics', () => {
  it('sanitizes telemetry events without identifiers, PHI, or free text', () => {
    const safe = sanitizeTelemetryEvent({
      eventName: 'search activity',
      toolId: 'qsofa',
      timestamp: '2026-05-30T10:00:00Z',
      userId: 'user-123',
      patientId: 'patient-123',
      email: 'clinician@example.com',
      queryText: 'patient chest pain free text',
      count: 2,
    });

    expect(safe).toEqual({
      eventType: PLATFORM_ANALYTICS_EVENT_TYPES.SEARCH_ACTIVITY,
      toolId: 'qsofa',
      count: 2,
      day: '2026-05-30',
    });
    expect(Object.keys(safe)).not.toEqual(expect.arrayContaining(['userId', 'patientId', 'email', 'queryText']));
  });

  it('builds usage dashboards, orphan tools, adoption trends, and feature engagement', () => {
    const analytics = buildPlatformAnalytics({
      inventory,
      events: [
        { eventType: 'calculator_usage', toolId: 'qsofa', count: 10, day: '2026-05-28' },
        { eventType: 'ai_launch', toolId: 'documentation', count: 4, day: '2026-05-29' },
        { eventType: 'simulation_completion', toolId: 'simulation-suite', count: 3, day: '2026-05-29' },
        { eventType: 'dashboard_activity', toolId: 'dashboard-a', count: 1, day: '2026-05-30' },
      ],
      searchEvents: [{ toolId: 'qsofa', count: 5, day: '2026-05-30', queryText: 'hidden' }],
    });

    expect(analytics.privacy.storesPhi).toBe(false);
    expect(analytics.topUsed[0]).toMatchObject({ toolId: 'qsofa' });
    expect(analytics.leastUsed.map((tool) => tool.toolId)).toContain('dashboard-a');
    expect(analytics.orphanTools.map((tool) => tool.toolId)).toContain('orphan-tool');
    expect(analytics.adoptionTrend.map((point) => point.day)).toEqual([
      '2026-05-28',
      '2026-05-29',
      '2026-05-30',
    ]);
    const searchActivityEvent = analytics.featureEngagement.find(
      (event) => event.eventType === PLATFORM_ANALYTICS_EVENT_TYPES.SEARCH_ACTIVITY
    );
    if (!searchActivityEvent) throw new Error('expected a search_activity featureEngagement event');
    expect(searchActivityEvent.count).toBe(5);
  });

  it('flags tools for promote, improve, merge, hide, or monitor decisions', () => {
    const analytics = buildPlatformAnalytics({
      inventory,
      events: [
        { eventType: 'calculator_usage', toolId: 'qsofa', count: 50, day: '2026-05-30' },
        { eventType: 'ai_launch', toolId: 'documentation', count: 1, day: '2026-05-30' },
        { eventType: 'dashboard_activity', toolId: 'dashboard-a', count: 6, day: '2026-05-30' },
      ],
    });
    const decisions = Object.fromEntries(analytics.decisions.map((row) => [row.toolId, row.decision]));

    expect(decisions.qsofa).toBe(PLATFORM_ANALYTICS_DECISIONS.PROMOTE);
    expect(decisions.documentation).toBe(PLATFORM_ANALYTICS_DECISIONS.MERGE);
    expect(decisions['orphan-tool']).toBe(PLATFORM_ANALYTICS_DECISIONS.HIDE);
  });
});
