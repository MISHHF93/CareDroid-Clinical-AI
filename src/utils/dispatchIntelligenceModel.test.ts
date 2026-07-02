import { describe, expect, it } from 'vitest';
import {
  buildDispatchLoadChart,
  buildDispatchPriorityQueue,
} from './dispatchIntelligenceModel';

describe('dispatchIntelligenceModel', () => {
  it('ranks vehicles by utilization, energy, maintenance, and alerts', () => {
    const queue = buildDispatchPriorityQueue(
      [
        {
          id: 'VH-1',
          label: 'Routine Van',
          status: 'available',
          utilizationPercent: 40,
          energyPercent: 80,
          maintenanceStatus: 'ok',
        },
        {
          id: 'VH-2',
          label: 'Critical Van',
          status: 'occupied',
          utilizationPercent: 92,
          energyPercent: 22,
          maintenanceStatus: 'warning',
          freshness: 'stale',
        },
      ],
      [{ vehicleId: 'VH-2', severity: 'high', title: 'Low energy' }],
    );

    expect(queue[0]).toMatchObject({
      id: 'VH-2',
      priorityScore: expect.any(Number),
      reason: expect.stringMatching(/low energy|active alert|high utilization/i),
    });
    expect(queue[0].priorityScore).toBeGreaterThan(queue[1]?.priorityScore ?? 0);
  });

  it('limits queue rows and builds chart data', () => {
    const vehicles = Array.from({ length: 12 }, (_, index) => ({
      id: `VH-${index}`,
      label: `Unit ${index}`,
      status: 'available',
      utilizationPercent: index * 8,
    }));
    const queue = buildDispatchPriorityQueue(vehicles, []);
    expect(queue).toHaveLength(8);
    expect(buildDispatchLoadChart(queue)).toEqual(
      queue.map((row) => ({ name: row.id, value: row.priorityScore })),
    );
  });
});