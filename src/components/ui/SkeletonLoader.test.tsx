import { render } from '@testing-library/react';
import SkeletonLoader from './SkeletonLoader';

describe('SkeletonLoader', () => {
  it('renders the default panel variant with 3 rows and the standard card height', () => {
    const { container } = render(<SkeletonLoader />);
    const grid = container.querySelector('[data-caredroid-skeleton]');
    expect(grid).toHaveClass('skeleton-grid');
    expect(grid).not.toHaveClass('skeleton-grid--whiteboard');
    expect(container.querySelectorAll('.skeleton-card')).toHaveLength(3);
    expect(container.querySelectorAll('.skeleton-card--tall')).toHaveLength(0);
  });

  it('renders the whiteboard variant with 6 tall cards and the auto-fill grid, ignoring rows', () => {
    const { container } = render(<SkeletonLoader variant="whiteboard" rows={2} />);
    const grid = container.querySelector('[data-caredroid-skeleton]');
    expect(grid).toHaveClass('skeleton-grid--whiteboard');
    expect(container.querySelectorAll('.skeleton-card--tall')).toHaveLength(6);
  });

  it('renders the card variant as tall but respects a custom row count', () => {
    const { container } = render(<SkeletonLoader variant="card" rows={5} />);
    const grid = container.querySelector('[data-caredroid-skeleton]');
    expect(grid).not.toHaveClass('skeleton-grid--whiteboard');
    expect(container.querySelectorAll('.skeleton-card--tall')).toHaveLength(5);
  });

  it('exposes a busy status role for assistive tech', () => {
    const { getByRole } = render(<SkeletonLoader />);
    const status = getByRole('status');
    expect(status).toHaveAttribute('aria-busy', 'true');
    expect(status).toHaveAttribute('aria-label', 'Loading');
  });
});
