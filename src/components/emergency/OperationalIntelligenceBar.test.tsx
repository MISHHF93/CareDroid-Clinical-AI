import '@testing-library/jest-dom/vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import OperationalIntelligenceBar from './OperationalIntelligenceBar';

let showAiChiefBar = true;

vi.mock('../../contexts/PractitionerVisibilityContext', () => ({
  usePractitionerSurfaceVisibility: () => ({
    emergencyRoutes: {
      showAiChiefBar,
    },
  }),
}));

const aiChiefMock = vi.fn();
const unifiedMock = vi.fn();

vi.mock('../../hooks/useAiChiefOrchestrator', () => ({
  default: () => aiChiefMock(),
}));

vi.mock('../../hooks/useUnifiedOperationalIntelligence', () => ({
  default: () => unifiedMock(),
}));

function baseAiChief(overrides: Partial<ReturnType<typeof buildAiChief>> = {}) {
  return { ...buildAiChief(), ...overrides };
}

function buildAiChief() {
  return {
    snapshot: {
      metrics: {
        activePatients: 12,
        p1p2Patients: 3,
        inboundEms: 1,
        unacknowledgedCriticalAlerts: 0,
      },
    },
    knowledgeGraphSummary: { criticalNodes: [] as unknown[] },
    topRisk: null as { summary: string; title: string } | null,
    topRecommendation: null as { rationale: string; action: string; route?: string } | null,
    criticalDomainCount: 0,
    watchDomainCount: 0,
  };
}

function buildUnified() {
  return {
    unifiedSnapshot: { metrics: { activeBottlenecks: 2, congestionPredictions: 1 } },
    topInsight: null as { summary: string; title: string; route?: string } | null,
    criticalDomainCount: 0,
    watchDomainCount: 0,
    source: 'backend',
  };
}

function renderBar() {
  return render(
    <MemoryRouter>
      <OperationalIntelligenceBar />
    </MemoryRouter>,
  );
}

describe('OperationalIntelligenceBar', () => {
  beforeEach(() => {
    showAiChiefBar = true;
    aiChiefMock.mockReset();
    unifiedMock.mockReset();
  });

  it('renders identity, signals, and actions from both hooks without duplicating either bar', () => {
    aiChiefMock.mockReturnValue(baseAiChief());
    unifiedMock.mockReturnValue(buildUnified());

    renderBar();

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('AI Chief')).toBeInTheDocument();
    expect(screen.getByText('12 active')).toBeInTheDocument();
    expect(screen.getByText('3 P1/P2')).toBeInTheDocument();
    expect(screen.getByText('1 EMS inbound')).toBeInTheDocument();
    expect(screen.getByText('2 bottlenecks')).toBeInTheDocument();
    expect(screen.getByText('1 congestion')).toBeInTheDocument();
    expect(screen.getByText('Ask AI Chief')).toBeInTheDocument();
    expect(screen.getByText('Command center')).toBeInTheDocument();
  });

  it('applies critical tone when a domain is critical or a critical alert is unacknowledged', () => {
    aiChiefMock.mockReturnValue(baseAiChief({ criticalDomainCount: 1 }));
    unifiedMock.mockReturnValue(buildUnified());

    renderBar();

    expect(screen.getByLabelText('AI Chief and operational intelligence status')).toHaveClass(
      'operational-intelligence-bar--critical',
    );
    expect(screen.getByText('1 critical domain')).toBeInTheDocument();
  });

  it('falls back to the unified hook\'s top insight when AI Chief has no risk or recommendation', () => {
    aiChiefMock.mockReturnValue(baseAiChief());
    unifiedMock.mockReturnValue({
      ...buildUnified(),
      topInsight: { summary: 'Congestion building in triage', title: 'Triage congestion rising', route: '/emergency/triage' },
    });

    renderBar();

    expect(screen.getByText('Insight:')).toBeInTheDocument();
    expect(screen.getByText('Triage congestion rising')).toBeInTheDocument();
    expect(screen.getByText('Open workflow')).toBeInTheDocument();
  });

  it('HEAL-175: discloses a failed background refresh instead of always claiming "live feed"', () => {
    aiChiefMock.mockReturnValue(baseAiChief());
    unifiedMock.mockReturnValue({
      ...buildUnified(),
      // A failed refresh re-serves the last-known snapshot under its existing
      // 'backend' source (not 'degraded') -- refreshError is the only signal.
      source: 'backend',
      refreshError: 'Unable to refresh unified operational intelligence.',
    });

    renderBar();

    expect(screen.getByText('refresh failed — showing last known data')).toBeInTheDocument();
    expect(screen.queryByText('live feed')).not.toBeInTheDocument();
  });

  // Regression coverage: the "AI Chief" identity chip plus Risk/Suggest text
  // both read as model-generated analysis, but every source behind them
  // (AI Chief's recommendation engine, the unified hook's fallback insight)
  // is deterministic rule/threshold scoring with zero truth-label disclosure.
  it('labels the AI Chief bar as Manual (rule-based), not silently AI-branded', () => {
    aiChiefMock.mockReturnValue(baseAiChief());
    unifiedMock.mockReturnValue(buildUnified());

    renderBar();

    const label = screen.getByTestId('ai-truth-label-chip');
    expect(label).toHaveTextContent('Manual');
    expect(label.getAttribute('title')).toMatch(/rule-based/i);
  });

  it('renders nothing when the AI Chief surface is hidden for this role/route', () => {
    showAiChiefBar = false;
    aiChiefMock.mockReturnValue(baseAiChief());
    unifiedMock.mockReturnValue(buildUnified());

    const { container } = renderBar();

    expect(container).toBeEmptyDOMElement();
  });
});
