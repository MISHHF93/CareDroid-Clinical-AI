import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(__dirname, '../App.jsx'), 'utf8');
const routeConfigSource = readFileSync(join(__dirname, '../config/routes.config.js'), 'utf8');

describe('auth canonical flow wiring', () => {
  it('bypasses the auth page and redirects auth aliases into the Emergency Whiteboard', () => {
    expect(appSource).toContain('function AuthPathRedirect()');
    expect(appSource).toContain('<Navigate to="/emergency/whiteboard" replace />');
    expect(appSource).toContain('...AUTH_PATH_ALIASES.map');
    expect(appSource).toContain('element: <AuthPathRedirect />');
  });

  it('keeps protected-route shell wiring while UserProvider supplies platform access', () => {
    expect(appSource).not.toContain('buildAuthRedirectSearch(location)');
    expect(appSource).not.toContain("pathname: '/auth'");
    expect(appSource).toContain('<AppShellPage>{resolvedElement}</AppShellPage>');
  });

  it('redirects duplicate calculators route aliases to canonical /tools/calculators', () => {
    expect(appSource).toContain('PROTECTED_ROUTE_ALIAS_REDIRECTS.map');
    expect(routeConfigSource).toContain("export const CALCULATORS_ROUTE_ALIASES = Object.freeze(['/calculators'])");
    expect(routeConfigSource).toContain('aliases: CALCULATORS_ROUTE_ALIASES');
    expect(routeConfigSource).toContain("to: record.path");
  });
});
