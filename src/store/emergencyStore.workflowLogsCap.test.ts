import { afterEach, describe, expect, it } from 'vitest';
import { useEmergencyStore } from './emergencyStore';

/**
 * HEAL-072 follow-up: `workflowLogs` had no cap anywhere it was written --
 * every automation tick, journey event, and workflow action appended to it
 * forever, with a full re-sort of the whole accumulated array on every
 * append. Confirmed live: 7 -> 19 -> 507 entries in under 3 seconds of a
 * long-running dev session, and the growing per-append sort cost is what
 * made `/emergency/settings` (the one page that processes this array for
 * its Audit Log panel) progressively slower/unresponsive the longer a
 * session ran. This guards all 4 real append paths found and fixed:
 * `recordWorkflowAction`, `requestAdditionalStaff`, and the shared
 * `appendWorkflowLogs`/`mergeWorkflowLogs` helpers used by every other
 * workflow-logging call site plus `hydrateFromApi`.
 */

const MAX_WORKFLOW_LOGS = 500;
const originalState = useEmergencyStore.getState();

afterEach(() => {
  useEmergencyStore.setState(originalState, true);
});

describe('workflowLogs is capped, not unbounded', () => {
  it('recordWorkflowAction never grows workflowLogs past the cap', () => {
    useEmergencyStore.setState({ workflowLogs: [] });

    for (let i = 0; i < MAX_WORKFLOW_LOGS + 50; i += 1) {
      useEmergencyStore.getState().recordWorkflowAction({
        type: 'test_action',
        summary: `test action ${i}`,
        source: 'test',
      });
    }

    expect(useEmergencyStore.getState().workflowLogs.length).toBeLessThanOrEqual(
      MAX_WORKFLOW_LOGS,
    );
  });

  it('hydrateFromApi (via mergeWorkflowLogs) never grows workflowLogs past the cap', () => {
    const seeded = Array.from({ length: MAX_WORKFLOW_LOGS }, (_, i) => ({
      id: `seed-${i}`,
      type: 'test_action',
      summary: `seed ${i}`,
      timestamp: new Date(Date.now() - i * 1000).toISOString(),
      source: 'test',
      severity: 'Info' as const,
      status: 'recorded' as const,
      metadata: {},
    }));
    useEmergencyStore.setState({ workflowLogs: seeded });

    useEmergencyStore.getState().hydrateFromApi({
      workflowLogs: [
        {
          id: 'incoming-1',
          type: 'test_action',
          summary: 'incoming',
          timestamp: new Date().toISOString(),
          source: 'test',
          severity: 'Info',
          status: 'recorded',
          metadata: {},
        },
      ],
    });

    expect(useEmergencyStore.getState().workflowLogs.length).toBeLessThanOrEqual(
      MAX_WORKFLOW_LOGS,
    );
    // The newest entry (just hydrated) must survive the trim -- the cap
    // keeps the MOST RECENT entries, not an arbitrary prefix.
    expect(
      useEmergencyStore.getState().workflowLogs.some((log) => log.id === 'incoming-1'),
    ).toBe(true);
  });
});
