import { readFileSync } from 'fs';
import { join } from 'path';

const appSource = readFileSync(join(__dirname, '..', 'App.jsx'), 'utf8');

describe('canonical route/auth architecture', () => {
  it('defines canonical auth and alias redirects', () => {
    expect(appSource).toContain("{ path: '/auth', element: <AuthShell><AuthPage /></AuthShell>, publicOnly: true }");
    expect(appSource).toContain("pathname: '/auth'");
  });

  it('keeps one canonical tools and calculators route system', () => {
    expect(appSource).toContain("{ path: '/tools', element: <AppShellPage><ToolsOverview /></AppShellPage>, requiresAuth: true }");
    expect(appSource).toContain("{ path: '/tools/calculators', element: <AppShellPage><Calculators /></AppShellPage>, requiresAuth: true }");
    expect(appSource).toContain("{ path: '/tools/calculators/:slug', element: <AppShellPage><Calculators /></AppShellPage>, requiresAuth: true }");
  });

  it('uses redirects for auth aliases and login aliases', () => {
    expect(appSource).toContain('...AUTH_PATH_ALIASES.map((path) => ({');
    expect(appSource).toContain("{ path: '/chat', element: <LegacyProtectedRouteRedirect to=\"/assistant\" />, requiresAuth: true }");
  });

  it('ensures unknown protected routes render not found in app shell', () => {
    expect(appSource).toContain("{ path: '/tools/*', element: <AppShellPage><ToolNotFound /></AppShellPage>, requiresAuth: true }");
    expect(appSource).toContain('title="Page not found"');
  });
});
