import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(__dirname, '../App.jsx'), 'utf8');
const routeConfigSource = readFileSync(join(__dirname, '../config/routes.config.js'), 'utf8');

describe('auth canonical flow wiring', () => {
  it('defines a single canonical auth route and redirects aliases', () => {
    expect(appSource).toMatch(
      /path:\s*'\/auth'[\s\S]*<AuthShell>[\s\S]*<AuthPage \/>[\s\S]*<\/AuthShell>[\s\S]*publicOnly:\s*true/
    );
    expect(appSource).toContain("pathname: '/auth'");
    expect(appSource).toContain('...AUTH_PATH_ALIASES.map');
  });

  it('protects private routes and redirects unauthenticated users to /auth', () => {
    expect(appSource).toContain('if (requiresAuth && !isAuthenticated) {');
    expect(appSource).toContain('return <Navigate to="/auth" replace />;');
  });

  it('redirects duplicate calculators route aliases to canonical /tools/calculators', () => {
    expect(appSource).toContain('CALCULATORS_ROUTE_ALIASES.map');
    expect(routeConfigSource).toContain("export const CALCULATORS_ROUTE_ALIASES = Object.freeze(['/calculators'])");
    expect(appSource).toContain('to="/tools/calculators"');
  });
});
