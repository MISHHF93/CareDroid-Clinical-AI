import { describe, expect, it } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CareDroidPage } from './CareDroidPrimitives';
import { RouteChromeProvider, useRouteChrome } from '../../contexts/RouteChromeContext';

/**
 * HEAL-185: CareDroidPage previously always rendered its own visible <h1> via PageHeader, while
 * AppShell's ShellRouteTab ALSO renders a real shell-level <h1> for every route -- 2 real <h1>s
 * per page on every one of the ~36 pages that route through CareDroidPage (directly or via
 * ToolPageLayout.tsx), the same app-wide a11y bug HEAL-169 already fixed for just the 8
 * PlatformGovernanceWorkspace routes. Now defaults to registering with the shell's single
 * RouteChrome slot and rendering NO heading element of its own once registration succeeds --
 * a visually-hidden (sr-only) <h1> was tried first but still left 2 real elements with the
 * identical heading role/name in the accessibility tree (screen readers would announce the
 * title twice; canonicalRouteTree.redirects.test.tsx's getByRole('heading', {name...}) failed
 * on the ambiguity), so this instead mirrors PlatformGovernanceWorkspace's own already-proven
 * fix (HEAL-169): once the shell owns the title, don't render a page-local heading at all.
 * `registerRouteChrome={false}` (used by
 * ToolPageLayout.tsx when `embedded`) keeps the old always-visible-header behavior for instances
 * nested inside another page's own CareDroidPage, since there's no shell-chrome slot available
 * to carry the title in that context, and registering would clobber the real page's title.
 */
function ChromeSpy() {
  const { chrome } = useRouteChrome();
  return (
    <div
      data-testid="chrome-spy"
      data-title={String(chrome.title ?? '')}
      data-has-title={String('title' in chrome && chrome.title != null)}
    />
  );
}

function renderWithChrome(ui: React.ReactNode) {
  return render(
    <MemoryRouter>
      <RouteChromeProvider>
        <ChromeSpy />
        {ui}
      </RouteChromeProvider>
    </MemoryRouter>,
  );
}

describe('CareDroidPage outside a RouteChromeProvider (isolated render, no shell)', () => {
  it('falls back to its own visible header instead of silently dropping title/actions (regression: TrainingDashboard "Queue Training" button vanished)', () => {
    const { container } = render(
      <MemoryRouter>
        <CareDroidPage
          title="Training Dashboard"
          actions={<button type="button">Queue Training</button>}
        >
          <p>body</p>
        </CareDroidPage>
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: 'Queue Training' })).toBeInTheDocument();
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Training Dashboard');
    expect(heading.className).not.toContain('sr-only');
    expect(container.querySelector('.cd-page-header')).not.toBeNull();
  });
});

describe('CareDroidPage route-chrome registration (HEAL-185)', () => {
  it('by default (top-level page) renders no heading of its own and registers with the shell instead (avoids a duplicate accessible-name heading)', () => {
    const { container } = renderWithChrome(
      <CareDroidPage title="Executive Command Center" description="Live operational overview">
        <p>page body</p>
      </CareDroidPage>,
    );

    expect(container.querySelector('.cd-page-header')).toBeNull();
    expect(container.querySelector('h1')).toBeNull();
    expect(screen.queryAllByRole('heading', { hidden: true })).toHaveLength(0);
    // Still a real, always-present plain-text copy of the title (not a heading) -- so the title
    // is never truly absent from the DOM even in a harness that provides RouteChromeProvider
    // without also mounting the real ShellRouteTab consumer (regression: routePagesSmoke.test.tsx).
    expect(screen.getByText('Executive Command Center')).toBeInTheDocument();

    const spy = screen.getByTestId('chrome-spy');
    expect(spy.dataset.title).toBe('Executive Command Center');
  });

  it('registerRouteChrome={false} (embedded instance) keeps its own visible header and does not touch the shell chrome', () => {
    const { container } = renderWithChrome(
      <CareDroidPage title="Drug Interaction Checker" registerRouteChrome={false}>
        <p>embedded tool body</p>
      </CareDroidPage>,
    );

    const visibleHeader = container.querySelector('.cd-page-header');
    expect(visibleHeader).not.toBeNull();
    expect(visibleHeader?.querySelector('h1')).toHaveTextContent('Drug Interaction Checker');

    const spy = screen.getByTestId('chrome-spy');
    expect(spy.dataset.hasTitle).toBe('false');
  });

  it('unmounting a registered CareDroidPage clears the shell chrome slot it set', () => {
    function Wrapper({ mounted }: { mounted: boolean }) {
      return (
        <MemoryRouter>
          <RouteChromeProvider>
            <ChromeSpy />
            {mounted ? (
              <CareDroidPage title="Training Dashboard">
                <p>body</p>
              </CareDroidPage>
            ) : null}
          </RouteChromeProvider>
        </MemoryRouter>
      );
    }

    const { rerender } = render(<Wrapper mounted />);
    expect(screen.getByTestId('chrome-spy').dataset.title).toBe('Training Dashboard');

    act(() => {
      rerender(<Wrapper mounted={false} />);
    });
    expect(screen.getByTestId('chrome-spy').dataset.hasTitle).toBe('false');
  });
});
