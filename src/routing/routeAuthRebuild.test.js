import { readFileSync } from 'fs';
import { join } from 'path';

const appSource = readFileSync(join(__dirname, '..', 'App.jsx'), 'utf8');
const routeConfigSource = readFileSync(join(__dirname, '..', 'config/routes.config.js'), 'utf8');

describe('canonical route/auth architecture', () => {
  it('bypasses canonical auth and routes aliases to the Emergency Whiteboard', () => {
    expect(appSource).toContain('function AuthPathRedirect()');
    expect(appSource).toContain('<Navigate to="/emergency/whiteboard" replace />');
    expect(appSource).toContain('...AUTH_PATH_ALIASES.map((path) => ({');
    expect(appSource).toContain('element: <AuthPathRedirect />');
  });

  it('keeps one protected AppShell owner for canonical Emergency OS routes', () => {
    expect(appSource).not.toContain('<TenantRequired>');
    expect(appSource).toContain('<AppShellPage>{resolvedElement}</AppShellPage>');
    expect(appSource.match(/<AppShellPage\b/g)).toHaveLength(1);
    expect(appSource).toContain("path: '/emergency/whiteboard'");
    expect(appSource).toContain("path: '/emergency/patients'");
    expect(appSource).toContain("path: '/emergency/settings'");
  });

  it('uses redirects for auth aliases and login aliases', () => {
    expect(routeConfigSource).toContain(
      "export const ASSISTANT_ROUTE_ALIASES = Object.freeze(['/chat', '/ai', '/copilot'])"
    );
    expect(appSource).toContain('...PROTECTED_ROUTE_ALIAS_REDIRECTS.map(({ path, to }) => ({');
  });

  it('normalizes legacy tools and product aliases into Emergency OS redirects', () => {
    expect(routeConfigSource).toContain(
      "export const TOOLS_ROUTE_ALIASES = Object.freeze(['/all-tools', '/clinical-tools', '/catalog'])"
    );
    expect(routeConfigSource).toContain(
      "export const OPERATIONS_ROUTE_ALIASES = Object.freeze(['/operations-center'])"
    );
    expect(appSource).toContain("['/tools', '/emergency/copilot']");
    expect(appSource).toContain("path: '/emergency/tools'");
    expect(appSource).toContain('<LegacyProtectedRouteRedirect to="/emergency/copilot" />');
    expect(appSource).toContain('...PROTECTED_ROUTE_ALIAS_REDIRECTS.map(({ path, to }) => ({');
  });

  it('ensures unknown protected routes redirect to the Emergency Whiteboard', () => {
    expect(appSource).toMatch(
      /path:\s*'\*'[\s\S]*<Navigate to="\/emergency\/whiteboard" replace \/>[\s\S]*requiresAuth:\s*true/
    );
  });
});
