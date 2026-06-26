import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as visibilityModule from '../../config/practitionerSurfaceVisibility';
import { usePractitionerSurfaceVisibility } from '../../contexts/PractitionerVisibilityContext';
import { MetricGrid } from './emergencyRouteShared';

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
});