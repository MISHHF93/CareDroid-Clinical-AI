import { describe, expect, it } from 'vitest';
import { CANONICAL_ROUTES } from './routes.config';
import { buildCommandCenterWorkflowActions } from './operationalWorkflow.config';

describe('operational workflow config', () => {
  it('surfaces the five highest-priority command center actions from live workflow context', () => {
    const actions = buildCommandCenterWorkflowActions({
      dispatch: { echoCount: 1, deltaCount: 2 },
      readiness: { overdueCount: 1, pendingCount: 3 },
      metrics: {
        unacknowledgedCriticalAlerts: 4,
        p1p2Patients: 2,
        inboundEms: 1,
      },
      staffRouting: { pendingAcknowledgement: 6 },
      bottlenecks: { analytics: { activeCount: 2 } },
    });

    expect(actions).toHaveLength(5);
    expect(actions.map((action) => action.id)).toEqual([
      'dispatch-echo-delta',
      'ed-readiness-overdue',
      'ack-critical-alerts',
      'review-ai-chief',
      'clear-service-bottleneck',
    ]);
    expect(actions[0]).toMatchObject({
      count: 3,
      route: CANONICAL_ROUTES.emergencyDispatch,
      owner: 'Dispatcher',
      deadlineLabel: '3 min target',
      active: true,
    });
  });

  it('keeps clear-state actions visible with empty-state copy and real routes', () => {
    const actions = buildCommandCenterWorkflowActions({});

    expect(actions[0]).toMatchObject({
      id: 'dispatch-echo-delta',
      count: 0,
      active: false,
      reason: 'No Echo or Delta calls waiting.',
      route: CANONICAL_ROUTES.emergencyDispatch,
    });
    expect(actions.every((action) => action.route.startsWith('/'))).toBe(true);
  });
});

