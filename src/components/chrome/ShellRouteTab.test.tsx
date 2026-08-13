import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ShellRouteTab from './ShellRouteTab';
import { RouteChromeProvider } from '../../contexts/RouteChromeContext';
import { CANONICAL_ROUTES } from '../../config/routes.config';

function renderAt(path: string, props: { title: string; subtitle?: string }) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <RouteChromeProvider>
        <ShellRouteTab {...props} />
      </RouteChromeProvider>
    </MemoryRouter>,
  );
}

/**
 * HEAL-187: getBreadcrumbsForRoute() (src/config/routes.config.ts) had real per-route data for
 * 46 routes but was never rendered anywhere -- ShellRouteTab's own doc comment previously said
 * "no badge/eyebrow/Guide nesting" was deliberate, a call made when the app had far fewer
 * routes. User confirmed adding breadcrumbs back is the right call now. Only routes with real
 * multi-entry data should show a trail -- the other ~72 routes fall back to a lone ['CareDroid']
 * entry, which isn't a breadcrumb trail and would just be noise if rendered as one.
 */
describe('ShellRouteTab breadcrumbs (HEAL-187)', () => {
  it('shows a breadcrumb trail for a route with real breadcrumb data', () => {
    renderAt(CANONICAL_ROUTES.emergencyWhiteboard, { title: 'Whiteboard' });

    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(nav).toHaveTextContent('Command');
    expect(nav).toHaveTextContent('Whiteboard');
  });

  it('does not show a breadcrumb trail for a route with no real breadcrumb data (lone fallback entry)', () => {
    renderAt('/some-route-with-no-breadcrumb-config', { title: 'Untracked Route' });

    expect(screen.queryByRole('navigation', { name: 'Breadcrumb' })).not.toBeInTheDocument();
  });

  it('still renders title, subtitle, and does not regress on route-chrome overrides', () => {
    renderAt('/some-route-with-no-breadcrumb-config', {
      title: 'Untracked Route',
      subtitle: 'A subtitle',
    });

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Untracked Route');
    expect(screen.getByText('A subtitle')).toBeInTheDocument();
  });
});
