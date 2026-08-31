import { render, screen } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';

function Bomb(): never {
  throw new Error('boom');
}

describe('ErrorBoundary', () => {
  const originalError = console.error;
  beforeEach(() => {
    // React logs the caught error to console.error -- expected noise for this suite.
    console.error = () => {};
  });
  afterEach(() => {
    console.error = originalError;
  });

  it('renders children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <div>All good</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText('All good')).toBeInTheDocument();
  });

  it('renders the full-page fallback when a child throws and no fallback prop is given', () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByText('CareDroid hit a snag')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload Application' })).toBeInTheDocument();
  });

  it('renders the compact fallbackText variant when fallbackText is provided', () => {
    render(
      <ErrorBoundary fallbackText="This panel failed to load.">
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('This panel failed to load.');
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument();
  });

  it('renders a custom fallback element when fallback is provided', () => {
    render(
      <ErrorBoundary fallback={<span>Custom fallback</span>}>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Custom fallback')).toBeInTheDocument();
  });
});
