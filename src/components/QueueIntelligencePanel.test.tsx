import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QueueIntelligencePanel from './QueueIntelligencePanel';
import { selectQueueBottleneckAlert, useEmergencyStore } from '../store/emergencyStore';
import type { QueueSummary, QueueType } from '../types/emergency';

import './QueueIntelligencePanel.css';

const originalState = useEmergencyStore.getState();

function queue(
  type: QueueType,
  count: number,
  averageWaitMinutes: number,
  longestWaitMinutes: number,
): QueueSummary {
  return {
    id: `queue-${type.toLowerCase()}`,
    type,
    name: type,
    label: type,
    count,
    patientIds: Array.from({ length: count }, (_, index) => `${type}-${index}`),
    targetWaitMinutes: 30,
    averageWaitMinutes,
    longestWaitMinutes,
    criticalCount: 0,
    updatedAt: '2026-06-11T06:00:00.000Z',
  } as unknown as QueueSummary;
}

afterEach(() => {
  act(() => {
    useEmergencyStore.setState(originalState, true);
  });
});

describe('QueueIntelligencePanel', () => {
  it('sets queue filter and surfaces bottleneck detection', async () => {
    const user = userEvent.setup();
    act(() => {
      useEmergencyStore.setState({
        activeQueueFilter: null,
        queues: [
          queue('Waiting', 3, 45, 55),
          queue('Triage', 0, 0, 0),
          queue('Provider', 2, 25, 30),
          queue('Results', 1, 12, 12),
          queue('Referral', 0, 0, 0),
          queue('Admission', 0, 0, 0),
          queue('Discharge', 0, 0, 0),
          queue('Reassessment', 0, 0, 0),
        ],
      });
    });

    render(<QueueIntelligencePanel collapsed={false} onCollapsedChange={vi.fn()} />);

    expect(screen.getByText(/Queue Intelligence/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Bottleneck: Waiting — 3 patients, avg 45min/i)).toBeInTheDocument();
    });
    expect(selectQueueBottleneckAlert(useEmergencyStore.getState())).toMatchObject({
      queue: 'Waiting',
      severity: 'Red',
    });

    await user.click(screen.getByRole('button', { name: /Provider/i }));

    expect(useEmergencyStore.getState().activeQueueFilter).toBe('Provider');
  });
});
