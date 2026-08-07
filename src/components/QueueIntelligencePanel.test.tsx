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
      queueType: 'Waiting',
      severity: 'Critical',
    });

    await user.click(screen.getByRole('button', { name: /Provider/i }));

    expect(useEmergencyStore.getState().activeQueueFilter).toBe('Provider');
  });

  it('renders a real explicit queue-breach alert (not the synthetic fallback) using its structured queueType/queueBottleneckReason fields', async () => {
    // Regression guard: selectQueueBottleneckAlert prefers a real Alert from
    // state.alerts whose title/message match /capacity|queue|wait|boarding/i
    // over its own synthetic fallback construction — this is the common case
    // in the real app, since alertEngineDerived.ts's deriveQueueAlerts creates
    // exactly this shape of alert for any real queue breach. Before this fix,
    // the component read `.queue`/`.reason` via `as any`, fields that only
    // ever existed on the synthetic fallback — a real alert like this one
    // rendered "Bottleneck:  — " (blank) and never highlighted the offending
    // queue row.
    act(() => {
      useEmergencyStore.setState({
        activeQueueFilter: null,
        queues: [queue('Waiting', 3, 45, 55), queue('Provider', 2, 25, 30)],
        alerts: [
          {
            id: 'alert-queue-breach-Waiting',
            type: 'Queue',
            severity: 'Critical',
            title: 'Waiting queue breach',
            message: 'Longest wait is 55m against a 30m target.',
            queueType: 'Waiting',
            queueBottleneckReason: 'Longest wait is 55m against a 30m target.',
            createdAt: '2026-08-07T00:00:00.000Z',
            dismissed: false,
          },
        ],
      });
    });

    render(<QueueIntelligencePanel collapsed={false} onCollapsedChange={vi.fn()} />);

    await waitFor(() => {
      expect(
        screen.getByText(/Bottleneck: Waiting — Longest wait is 55m against a 30m target\./i),
      ).toBeInTheDocument();
    });
    expect(document.querySelector('.queue-intel__bottleneck--critical')).not.toBeNull();
  });

  it('falls back to title/message for a real alert with no specific queue association, without crashing or rendering blank fields', async () => {
    act(() => {
      useEmergencyStore.setState({
        activeQueueFilter: null,
        queues: [queue('Waiting', 3, 45, 55)],
        alerts: [
          {
            id: 'alert-capacity-degradation',
            type: 'Capacity',
            severity: 'Warning',
            title: 'Capacity degradation detected',
            message: 'ED occupancy exceeds 90%.',
            createdAt: '2026-08-07T00:00:00.000Z',
            dismissed: false,
          },
        ],
      });
    });

    render(<QueueIntelligencePanel collapsed={false} onCollapsedChange={vi.fn()} />);

    await waitFor(() => {
      expect(
        screen.getByText(/Bottleneck: Capacity degradation detected — ED occupancy exceeds 90%\./i),
      ).toBeInTheDocument();
    });
    expect(document.querySelector('.queue-intel__bottleneck--critical')).toBeNull();
  });
});
