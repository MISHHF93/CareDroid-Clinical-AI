import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QueueIntelligencePanel from './QueueIntelligencePanel';
import { useEmergencyStore } from '../../store/emergencyStore';

import './QueueIntelligencePanel.css';

const originalState = useEmergencyStore.getState();

function queue(type, count, averageWaitMinutes, longestWaitMinutes) {
  return {
    id: `queue-${type.toLowerCase()}`,
    type,
    name: type,
    patientIds: Array.from({ length: count }, (_, index) => `${type}-${index}`),
    targetWaitMinutes: 30,
    averageWaitMinutes,
    longestWaitMinutes,
    criticalCount: 0,
    updatedAt: '2026-06-11T06:00:00.000Z',
  };
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
        bottleneckAlert: null,
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
    expect(useEmergencyStore.getState().bottleneckAlert).toMatchObject({
      queue: 'Waiting',
      severity: 'Red',
    });

    await user.click(screen.getByRole('button', { name: /Provider/i }));

    expect(useEmergencyStore.getState().activeQueueFilter).toBe('Provider');
  });
});
