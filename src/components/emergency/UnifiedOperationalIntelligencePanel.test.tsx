import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { UnifiedOperationalIntelligencePanel } from './UnifiedOperationalIntelligencePanel';

const mockUseUnifiedOperationalIntelligence = vi.hoisted(() => vi.fn());

vi.mock('../../hooks/useUnifiedOperationalIntelligence', () => ({
  default: (...args: unknown[]) => mockUseUnifiedOperationalIntelligence(...args),
}));

function renderPanel() {
  return render(
    <MemoryRouter>
      <UnifiedOperationalIntelligencePanel />
    </MemoryRouter>,
  );
}

describe('UnifiedOperationalIntelligencePanel', () => {
  it('P0.4: labels the insight list Manual, not an unlabeled AI confidence claim', () => {
    mockUseUnifiedOperationalIntelligence.mockReturnValue({
      unifiedSnapshot: {
        domainStatuses: [],
        metrics: {
          activePatients: 4,
          waitingPatients: 2,
          capacityScore: 70,
          capacityBand: 'watch',
          inboundEms: 1,
          activeBottlenecks: 1,
          congestionPredictions: 0,
          unresolvedAlerts: 0,
          workflowPendingReview: 0,
        },
        insights: [
          {
            id: 'i1',
            domain: 'capacity',
            type: 'congestion_risk',
            severity: 'watch',
            title: 'Rising ED occupancy',
            summary: 'Occupancy trending upward over the last hour.',
            ownerRole: 'charge_nurse',
            confidence: 0.72,
            route: null,
          },
        ],
        safetyStatement: 'Operational intelligence is advisory. Human review required.',
      },
      source: 'live',
      isRefreshing: false,
      refresh: vi.fn(),
      refreshError: null,
      lastRefreshedAt: null,
    });

    renderPanel();

    expect(screen.getByText(/Rising ED occupancy/)).toBeInTheDocument();
    const label = screen.getByTestId('ai-truth-label-chip');
    expect(label).toHaveTextContent('Manual');
    expect(label.getAttribute('title')).toMatch(/rule-based, not a trained model/i);
  });

  it('shows no truth label when there are no insights to label', () => {
    mockUseUnifiedOperationalIntelligence.mockReturnValue({
      unifiedSnapshot: {
        domainStatuses: [],
        metrics: {
          activePatients: 0,
          waitingPatients: 0,
          capacityScore: 20,
          capacityBand: 'stable',
          inboundEms: 0,
          activeBottlenecks: 0,
          congestionPredictions: 0,
          unresolvedAlerts: 0,
          workflowPendingReview: 0,
        },
        insights: [],
        safetyStatement: 'Operational intelligence is advisory. Human review required.',
      },
      source: 'live',
      isRefreshing: false,
      refresh: vi.fn(),
      refreshError: null,
      lastRefreshedAt: null,
    });

    renderPanel();

    expect(screen.queryByTestId('ai-truth-label-chip')).not.toBeInTheDocument();
  });
});
