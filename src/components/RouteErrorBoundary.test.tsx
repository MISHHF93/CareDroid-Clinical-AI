import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import RouteErrorBoundary from './RouteErrorBoundary';

function Bomb(): never {
  throw new Error('route section boom');
}

function CountingBomb({ calls }: { calls: { count: number } }): never {
  calls.count += 1;
  throw new Error('always fails');
}

describe('RouteErrorBoundary', () => {
  const originalError = console.error;
  beforeEach(() => {
    console.error = () => {};
  });
  afterEach(() => {
    console.error = originalError;
  });

  it('renders children when nothing throws', () => {
    render(
      <MemoryRouter initialEntries={['/emergency']}>
        <RouteErrorBoundary>
          <div>Route content</div>
        </RouteErrorBoundary>
      </MemoryRouter>,
    );
    expect(screen.getByText('Route content')).toBeInTheDocument();
  });

  it('renders the fallback with the given title and current route path when a child throws', () => {
    render(
      <MemoryRouter initialEntries={['/tools/calculators']}>
        <RouteErrorBoundary fallbackTitle="Tools section error">
          <Bomb />
        </RouteErrorBoundary>
      </MemoryRouter>,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Tools section error')).toBeInTheDocument();
    expect(screen.getByText(/Route: \/tools\/calculators/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('falls back to a default title when none is given', () => {
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <RouteErrorBoundary>
          <Bomb />
        </RouteErrorBoundary>
      </MemoryRouter>,
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('re-invokes children on Try again rather than leaving the fallback inert', async () => {
    const user = userEvent.setup();
    const calls = { count: 0 };
    render(
      <MemoryRouter initialEntries={['/emergency']}>
        <RouteErrorBoundary fallbackTitle="Emergency module error">
          <CountingBomb calls={calls} />
        </RouteErrorBoundary>
      </MemoryRouter>,
    );

    expect(screen.getByText('Emergency module error')).toBeInTheDocument();
    const callsAfterMount = calls.count;
    expect(callsAfterMount).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(screen.getByText('Emergency module error')).toBeInTheDocument();
    expect(calls.count).toBeGreaterThan(callsAfterMount);
  });
});
