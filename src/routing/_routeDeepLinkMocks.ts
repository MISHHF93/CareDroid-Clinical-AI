/**
 * Lightweight AppShell stub for deep-link integration tests only.
 * Import as the first line in canonicalAppRoutes.deepLink.test.tsx.
 *
 * Mirrors essential AppShell providers/redirects without heavy chrome timers.
 */
import { vi } from 'vitest';

vi.mock('../components/AppShell', async () => {
  const React = await import('react');
  const { Outlet, useLocation, useNavigate } = await import('react-router-dom');
  const { RouteChromeProvider } = await import('../contexts/RouteChromeContext');
  const { CANONICAL_ROUTES } = await import('../config/routes.config');

  function DeepLinkAppShell({ children }: { children?: React.ReactNode }) {
    const location = useLocation();
    const navigate = useNavigate();

    React.useEffect(() => {
      if (location.pathname !== CANONICAL_ROUTES.emergencyCopilot) return;
      navigate(`${CANONICAL_ROUTES.emergencyWhiteboard}${location.search}`, { replace: true });
    }, [location.pathname, location.search, navigate]);

    return React.createElement(
      RouteChromeProvider,
      null,
      React.createElement(
        'div',
        { role: 'main', id: 'main-content' },
        children ?? React.createElement(Outlet),
      ),
    );
  }

  return { AppShell: DeepLinkAppShell };
});