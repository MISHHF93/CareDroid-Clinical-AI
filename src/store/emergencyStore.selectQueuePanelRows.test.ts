import { describe, expect, it } from 'vitest';
import { selectQueuePanelRows } from './emergencyStore';

/**
 * Regression coverage for a real wiring-audit finding (2026-08-08):
 * selectQueuePanelRows() read `targetWaitMinutes` (a field that does not
 * exist on the real backend response -- QueueIntelligenceService.getQueues()
 * returns `targetMinutes`) and always recomputed `health` from scratch
 * instead of using the backend's own `breached` boolean when present. Net
 * effect: even when real backend queue data was present, every queue type
 * was silently evaluated against a uniform 30min threshold instead of its
 * real, per-type target (10-120min), and the server's own breach signal was
 * discarded. QueueIntelligencePanel.tsx renders `queue.health` from this
 * selector's output directly, so this was a real, visible bug.
 */
describe('selectQueuePanelRows', () => {
  it('reads the real targetMinutes field instead of the nonexistent targetWaitMinutes', () => {
    const [row] = selectQueuePanelRows({
      queues: [
        {
          id: 'q1',
          label: 'Triage',
          type: 'Triage',
          count: 2,
          oldestWaitMinutes: 12,
          targetMinutes: 10,
        },
      ],
    } as any);

    expect(row.targetMinutes).toBe(10);
  });

  it('prefers the backend-computed breached boolean over recomputing an approximation', () => {
    // oldestWaitMinutes (5) is well under targetMinutes (10) -- a naive
    // recompute would say healthy -- but the backend's own `breached: true`
    // must win, since it may reflect signals (e.g. averageWaitMinutes) this
    // selector doesn't have visibility into.
    const [row] = selectQueuePanelRows({
      queues: [
        {
          id: 'q1',
          label: 'Triage',
          type: 'Triage',
          count: 2,
          oldestWaitMinutes: 5,
          targetMinutes: 10,
          breached: true,
        },
      ],
    } as any);

    expect(row.breached).toBe(true);
    expect(row.health).toBe('red');
  });

  it('falls back to a computed breach only when the backend does not send one', () => {
    const [overTarget] = selectQueuePanelRows({
      queues: [
        { id: 'q1', label: 'EMS', type: 'EMS', count: 1, oldestWaitMinutes: 25, targetMinutes: 10 },
      ],
    } as any);
    expect(overTarget.breached).toBe(true);
    expect(overTarget.health).toBe('red');

    const [underTarget] = selectQueuePanelRows({
      queues: [
        { id: 'q1', label: 'EMS', type: 'EMS', count: 1, oldestWaitMinutes: 2, targetMinutes: 10 },
      ],
    } as any);
    expect(underTarget.breached).toBe(false);
    expect(underTarget.health).toBe('green');
  });

  it("respects each queue type's own target instead of a uniform 30min default", () => {
    // A 45min wait against a 120min target (e.g. Discharge) should NOT
    // read as breached, even though the old hardcoded 30min default would
    // have flagged it.
    const [row] = selectQueuePanelRows({
      queues: [
        {
          id: 'q1',
          label: 'Discharge',
          type: 'Discharge',
          count: 1,
          oldestWaitMinutes: 45,
          targetMinutes: 120,
        },
      ],
    } as any);

    expect(row.breached).toBe(false);
    expect(row.health).not.toBe('red');
  });
});
