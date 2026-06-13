import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(__dirname, '../App.jsx'), 'utf8');
const routeConfigSource = readFileSync(join(__dirname, '../config/routes.config.js'), 'utf8');

describe('auth canonical flow wiring', () => {
  it('bypasses the auth page and redirects auth aliases into the Emergency Whiteboard', () => {
    expect(appSource).toContain('LEGACY_EMERGENCY_ROUTE_REDIRECTS.map(({ path, to }) => (');
    expect(routeConfigSource).toContain("['/auth', CANONICAL_ROUTES.emergencyWhiteboard]");
    expect(appSource).not.toContain('function AuthPathRedirect()');
  });

  it('keeps Emergency OS routes inside the AppShell while UserProvider supplies platform access', () => {
    expect(appSource).not.toContain('buildAuthRedirectSearch(location)');
    expect(appSource).not.toContain("pathname: '/auth'");
    expect(appSource).toContain('function RootLayout()');
    expect(appSource).toContain('<AppShell>');
    expect(appSource).toContain('<Outlet />');
    expect(appSource).not.toContain('<AuthCallback');
    expect(appSource).not.toContain('LegacyOAuthCallbackRedirect');
  });

  it('redirects duplicate calculators route aliases into the Emergency OS whiteboard', () => {
    expect(appSource).toContain('<Route path="/tools/*" element={<Navigate to={CANONICAL_ROUTES.emergencyWhiteboard} replace />} />');
    expect(routeConfigSource).toContain("export const CALCULATORS_ROUTE_ALIASES = Object.freeze(['/calculators'])");
    expect(routeConfigSource).toContain('aliases: CALCULATORS_ROUTE_ALIASES');
    expect(routeConfigSource).toContain("['/calculators', CANONICAL_ROUTES.emergencyWhiteboard]");
  });
});
