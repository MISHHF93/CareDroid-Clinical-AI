import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as visibilityModule from '../../config/practitionerSurfaceVisibility';
import { usePractitionerSurfaceVisibility } from '../../contexts/PractitionerVisibilityContext';
import EdDataSourceBanner from './EdDataSourceBanner';

vi.mock('../../contexts/PractitionerVisibilityContext', () => ({
  usePractitionerSurfaceVisibility: vi.fn(),
}));

const FULL_SURFACES = visibilityModule.getPractitionerSurfaceVisibility();

// Mirrors buildPilotVisibility()'s chrome surface with pilot-customer cleanup
// mode fully active: the cosmetic data-source/dev-banner flags are
// suppressed, but showBackendUnavailableIndicator is never suppressed --
// this is exactly the shape isPractitionerCleanupEnabled()===true produces.
const PILOT_CLEANUP_SURFACES = {
  ...FULL_SURFACES,
  active: true,
  chrome: {
    ...FULL_SURFACES.chrome,
    showDeveloperApiBanners: false,
    showEdDataSourceBanner: false,
    showBackendUnavailableIndicator: true,
  },
};

describe('EdDataSourceBanner', () => {
  beforeEach(() => {
    vi.mocked(usePractitionerSurfaceVisibility).mockReturnValue(FULL_SURFACES);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the backend-unavailable warning during pilot cleanup (the fixed gap)', () => {
    vi.mocked(usePractitionerSurfaceVisibility).mockReturnValue(PILOT_CLEANUP_SURFACES);

    render(<EdDataSourceBanner envelope={null} loading={false} error="Network request failed" />);

    expect(screen.getByRole('status')).toHaveTextContent(
      'Department data unavailable — check connection',
    );
  });

  it('still hides the plain data-source line during pilot cleanup when there is no error', () => {
    vi.mocked(usePractitionerSurfaceVisibility).mockReturnValue(PILOT_CLEANUP_SURFACES);

    const { container } = render(
      <EdDataSourceBanner
        envelope={{ source: 'backend', generatedAt: '2020-01-01T00:00:00.000Z' }}
        loading={false}
        error={null}
      />,
    );

    // showEdDataSourceBanner is suppressed and there is no error -- the
    // cosmetic "data may be stale" note should stay hidden, unaffected by
    // this fix (only the genuine-outage case is now unsuppressible).
    expect(container.querySelector('.ed-data-source')).toBeFalsy();
  });

  it('renders the error warning when pilot cleanup is fully off too', () => {
    render(<EdDataSourceBanner envelope={null} loading={false} error="CareDroid backend unavailable." />);

    expect(screen.getByRole('status')).toHaveTextContent(
      'Department data unavailable — check connection',
    );
  });

  it('does not render anything when there is no error and data is fresh', () => {
    const { container } = render(
      <EdDataSourceBanner
        envelope={{ source: 'backend', generatedAt: new Date().toISOString() }}
        loading={false}
        error={null}
      />,
    );

    expect(container.querySelector('.ed-data-source')).toBeFalsy();
  });
});
