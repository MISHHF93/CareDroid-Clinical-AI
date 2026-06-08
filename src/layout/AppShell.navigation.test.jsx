import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AppShell from './AppShell';

vi.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({
    preference: 'system',
    resolvedTheme: 'light',
    setPreference: vi.fn(),
  }),
}));

vi.mock('../contexts/WorkspaceContext', () => ({
  useWorkspace: () => ({
    activeWorkspace: { id: 'emergency', name: 'Emergency' },
  }),
}));

vi.mock('../components/WorkspaceSwitcher', () => ({
  default: () => <div data-testid="workspace-switcher">Workspace</div>,
}));

vi.mock('../components/QuickCommandLauncher', () => ({
  default: () => null,
}));

vi.mock('../components/Sidebar', async () => {
  const React = await import('react');
  const MockSidebar = React.forwardRef(function MockSidebar({ layoutCompact, mobileNavOpen }, ref) {
    return (
      <aside
        ref={ref}
        id="app-sidebar-nav"
        className={[
          'sidebar',
          layoutCompact ? 'sidebar--compact' : '',
          layoutCompact && mobileNavOpen ? 'sidebar--open' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-hidden={layoutCompact && !mobileNavOpen ? 'true' : undefined}
        data-testid="app-sidebar"
      >
        {(!layoutCompact || mobileNavOpen) && (
          <>
            <nav aria-label="Primary navigation">
              {['Dashboard', 'Assistant', 'Tools', 'Operations', 'Profile'].map((label) => (
                <button key={label} type="button">
                  {label}
                </button>
              ))}
            </nav>
          </>
        )}
      </aside>
    );
  });

  return {
    default: MockSidebar,
  };
});

function setViewportWidth(width) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: query.includes('max-width: 900px') ? width <= 900 : false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

function renderShell(width, initialPath = '/dashboard') {
  setViewportWidth(width);
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AppShell isAuthed conversations={[]} activeConversation={null}>
        <section data-testid="main-page">Dashboard content</section>
      </AppShell>
    </MemoryRouter>
  );
}

describe('AppShell navigation surfaces', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows sidebar and hides bottom nav on desktop', () => {
    const { container } = renderShell(1280);

    expect(screen.getByTestId('app-sidebar')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /primary navigation/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open quick command/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/frontend operating system flow/i)).toHaveTextContent(/caredroid frontend os/i);
    expect(screen.getByLabelText(/frontend operating system flow/i)).toHaveTextContent(/emergency/i);
    expect(screen.getByLabelText(/frontend operating system flow/i)).toHaveTextContent(/dashboard/i);
    expect(screen.queryByRole('button', { name: /open notifications/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /open profile/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /open settings/i })).not.toBeInTheDocument();
    expect(container.querySelector('.app-shell-bottom-nav')).not.toBeInTheDocument();
  });

  it('uses compact drawer mode without bottom nav on tablet', () => {
    const { container } = renderShell(768);

    expect(screen.getByTestId('app-sidebar')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('button', { name: /open navigation menu/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/frontend operating system flow/i)).not.toBeInTheDocument();
    expect(container.querySelector('.app-shell-bottom-nav')).not.toBeInTheDocument();
  });

  it('opens one mobile drawer navigation without duplicate bottom destinations', () => {
    const { container } = renderShell(390);

    fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));

    const sidebar = screen.getByTestId('app-sidebar');
    expect(sidebar).not.toHaveAttribute('aria-hidden');
    expect(container.querySelector('.app-shell-bottom-nav')).not.toBeInTheDocument();

    const nav = within(sidebar).getByRole('navigation', { name: /primary navigation/i });
    for (const name of [
      /^dashboard$/i,
      /^assistant$/i,
      /^tools$/i,
      /^operations$/i,
      /^profile$/i,
    ]) {
      expect(screen.getAllByRole('button', { name })).toHaveLength(1);
      expect(within(nav).getByRole('button', { name })).toBeInTheDocument();
    }
  });

  it.each([320, 390, 412, 768, 1024, 1440])(
    'renders one navigation system without bottom nav at %ipx',
    (width) => {
      const { container } = renderShell(width);

      expect(screen.getByRole('main')).toHaveAttribute('data-layout-role', 'MainContent');
      expect(container.querySelector('.app-shell-bottom-nav')).not.toBeInTheDocument();

      if (width <= 900) {
        expect(screen.getByRole('button', { name: /open navigation menu/i })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
      }

      expect(screen.getAllByRole('navigation', { name: /primary navigation/i })).toHaveLength(1);
    }
  );

  it('renders dashboard content without a bottom tab bar when sidebar exists', () => {
    const { container } = renderShell(1280, '/dashboard');

    expect(screen.getByTestId('main-page')).toBeInTheDocument();
    expect(screen.getByTestId('app-sidebar')).toBeInTheDocument();
    expect(container.querySelector('.app-shell-bottom-nav')).not.toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveAttribute('data-layout-role', 'MainContent');
  });

  it('renders an environment banner in authenticated non-production shells', () => {
    renderShell(1280, '/dashboard');

    expect(screen.getByText(/development/i).closest('[role="status"]')).toBeInTheDocument();
    expect(screen.getByText(/environment/i)).toBeInTheDocument();
  });
});
