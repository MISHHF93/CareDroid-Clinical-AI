import { render, screen } from '@testing-library/react';
import { RouteLoadingFallback } from './router';

describe('RouteLoadingFallback', () => {
  it('renders the default loading label with a polite status role', () => {
    render(<RouteLoadingFallback />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('Loading CareDroid...');
  });

  it('renders a custom label when one is provided', () => {
    render(<RouteLoadingFallback label="Loading patient chart..." />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading patient chart...');
  });
});
