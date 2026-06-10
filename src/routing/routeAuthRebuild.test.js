import { readFileSync } from 'fs';
import { join } from 'path';

const appSource = readFileSync(join(__dirname, '..', 'App.jsx'), 'utf8');
const routeConfigSource = readFileSync(join(__dirname, '..', 'config/routes.config.js'), 'utf8');

describe('canonical route/auth architecture', () => {
  it('bypasses canonical auth and routes aliases to the dashboard', () => {
    expect(appSource).toMatch(
      /path:\s*'\/auth'[\s\S]*element:\s*<Navigate to="\/dashboard" replace \/>[\s\S]*publicOnly:\s*true/
    );
    expect(appSource).toContain('function AuthPathRedirect()');
    expect(appSource).toContain('<Navigate to="/dashboard" replace />');
  });

  it('keeps one canonical tools and calculators route system', () => {
    expect(appSource).toMatch(
      /path:\s*'\/tools'[\s\S]*<ToolsOverview \/>[\s\S]*requiresAuth:\s*true/
    );
    expect(appSource).toMatch(
      /path:\s*'\/tools\/calculators'[\s\S]*<ToolsOverview \/>[\s\S]*requiresAuth:\s*true/
    );
    expect(appSource).toMatch(
      /path:\s*'\/tools\/calculators\/:slug'[\s\S]*<Calculators \/>[\s\S]*requiresAuth:\s*true/
    );
    expect(appSource).not.toContain('<TenantRequired>');
    expect(appSource).toContain('<AppShellPage>{resolvedElement}</AppShellPage>');
    expect(appSource.match(/<AppShellPage\b/g)).toHaveLength(1);
  });

  it('uses redirects for auth aliases and login aliases', () => {
    expect(appSource).toContain('...AUTH_PATH_ALIASES.map((path) => ({');
    expect(routeConfigSource).toContain(
      "export const ASSISTANT_ROUTE_ALIASES = Object.freeze(['/chat', '/ai', '/copilot'])"
    );
    expect(appSource).toContain('...PROTECTED_ROUTE_ALIAS_REDIRECTS.map(({ path, to }) => ({');
  });

  it('normalizes product aliases to the compact canonical map', () => {
    expect(routeConfigSource).toContain(
      "export const TOOLS_ROUTE_ALIASES = Object.freeze(['/all-tools', '/clinical-tools', '/catalog'])"
    );
    expect(routeConfigSource).toContain(
      "export const OPERATIONS_ROUTE_ALIASES = Object.freeze(['/operations-center'])"
    );
    expect(routeConfigSource).toMatch(
      /export const FLEET_MAP_ROUTE_ALIASES = Object\.freeze\(\[[\s\S]*'\/fleet'[\s\S]*'\/fleet\/live-map'[\s\S]*'\/fleet\/tracking'/
    );
    expect(appSource).toContain('...PROTECTED_ROUTE_ALIAS_REDIRECTS.map(({ path, to }) => ({');
    expect(appSource).toMatch(
      /path:\s*'\/operations'[\s\S]*<Operations \/>[\s\S]*requiresAuth:\s*true/
    );
    expect(appSource).not.toContain('...FLEET_MAP_ROUTE_ALIASES.map((path) => ({');
  });

  it('ensures unknown protected routes render not found in app shell', () => {
    expect(appSource).toMatch(
      /path:\s*'\/tools\/\*'[\s\S]*<ToolNotFound \/>[\s\S]*requiresAuth:\s*true/
    );
    expect(appSource).toContain('title="Page not found"');
  });
});
