import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as visibilityModule from '../../config/practitionerSurfaceVisibility';
import { usePractitionerSurfaceVisibility } from '../../contexts/PractitionerVisibilityContext';
import { MetricGrid, OperationalModuleState, WorkflowSituationBrief } from './emergencyRouteShared';

vi.mock('../../contexts/PractitionerVisibilityContext', () => ({
  usePractitionerSurfaceVisibility: vi.fn(),
}));

const FULL_SURFACES = visibilityModule.getPractitionerSurfaceVisibility();

describe('emergencyRouteShared visibility', () => {
  beforeEach(() => {
    vi.mocked(usePractitionerSurfaceVisibility).mockReturnValue(FULL_SURFACES);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('hides route metrics during practitioner cleanup', () => {
    vi.mocked(usePractitionerSurfaceVisibility).mockReturnValue({
      ...FULL_SURFACES,
      active: true,
      emergencyRoutes: {
        ...FULL_SURFACES.emergencyRoutes,
        showMetricCards: false,
      },
    });

    const { container } = render(
      <MetricGrid
        metrics={[
          { label: 'Total queued', value: 12 },
          { label: 'Breached queues', value: 2, color: '#EF4444' },
        ]}
      />,
    );

    expect(container.querySelector('.emergency-route-metric-strip')).toBeFalsy();
    expect(container.querySelector('.emergency-route-metric-grid')).toBeFalsy();
    expect(screen.queryByText('12')).not.toBeInTheDocument();
    expect(screen.queryByText('Total queued')).not.toBeInTheDocument();
  });

  it('renders metric cards when cleanup is off', () => {
    vi.mocked(usePractitionerSurfaceVisibility).mockReturnValue({
      ...FULL_SURFACES,
      active: false,
      emergencyRoutes: {
        ...FULL_SURFACES.emergencyRoutes,
        showMetricCards: true,
      },
    });

    const { container } = render(<MetricGrid metrics={[{ label: 'Due now', value: 3 }]} />);

    expect(container.querySelector('.emergency-route-metric-grid')).toBeTruthy();
    expect(container.querySelector('.emergency-route-metric-strip')).toBeFalsy();
  });

  it('renders workflow situation brief with four operational questions', () => {
    render(
      <WorkflowSituationBrief
        status="12 active patients on the board"
        attention="2 high-risk · 4 waiting"
        owner="Care team"
        nextAction="Open the longest-waiting patient"
        tone="warning"
      />,
    );

    expect(screen.getByText('Happening now')).toBeInTheDocument();
    expect(screen.getByText('Needs attention')).toBeInTheDocument();
    expect(screen.getByText('Owner')).toBeInTheDocument();
    expect(screen.getByText('Next action')).toBeInTheDocument();
    expect(screen.getByText('12 active patients on the board')).toBeInTheDocument();
    expect(screen.getByText('Open the longest-waiting patient')).toBeInTheDocument();
  });

  it('keeps situation brief visible when route metrics are suppressed', () => {
    vi.mocked(usePractitionerSurfaceVisibility).mockReturnValue({
      ...FULL_SURFACES,
      active: true,
      emergencyRoutes: {
        ...FULL_SURFACES.emergencyRoutes,
        showMetricCards: false,
        showSituationBrief: true,
      },
    });

    const { container } = render(
      <WorkflowSituationBrief
        status="3 patients awaiting triage"
        attention="1 queue past target wait"
        owner="Triage nurse"
        nextAction="Complete triage for oldest wait"
      />,
    );

    expect(container.querySelector('.emergency-route-situation-brief')).toBeTruthy();
    expect(screen.getByText('3 patients awaiting triage')).toBeInTheDocument();
  });

  it('composes header and footer module state placements', () => {
    vi.mocked(usePractitionerSurfaceVisibility).mockReturnValue({
      ...FULL_SURFACES,
      chrome: {
        ...FULL_SURFACES.chrome,
        showDeveloperApiBanners: true,
        showEdDataSourceBanner: true,
      },
    });

    const { rerender } = render(
      <OperationalModuleState
        moduleState={{
          loading: false,
          error: 'Queue endpoint unavailable',
          isEmpty: false,
          data: null,
        }}
        activeScenarioId="scenario-1"
        backendAvailable
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Queue endpoint unavailable');

    rerender(
      <OperationalModuleState
        moduleState={{
          loading: false,
          error: null,
          isEmpty: false,
          data: { generatedAt: '2026-07-04T12:00:00.000Z', source: 'backend' },
        }}
        placement="footer"
      />,
    );

    expect(screen.getByText(/Source:/i)).toBeInTheDocument();
  });
});
