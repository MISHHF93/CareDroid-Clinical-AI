import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(__dirname, '../App.jsx'), 'utf8');
const routeConfigSource = readFileSync(join(__dirname, '../config/routes.config.js'), 'utf8');

describe('auth canonical flow wiring', () => {
  it('redirects legacy auth paths instead of mounting sign-in pages', () => {
    expect(appSource).toContain('function AuthPathsRedirect()');
    expect(appSource).toContain('legacyAuthPaths');
    expect(appSource).not.toContain('function AuthRoute()');
    expect(routeConfigSource).not.toContain("['/auth', CANONICAL_ROUTES.emergencyWhiteboard]");
  });

  it('keeps Emergency OS routes inside the AppShell while UserProvider supplies platform access', () => {
    expect(appSource).not.toContain('buildAuthRedirectSearch(location)');
    expect(appSource).toContain('function RootLayout()');
    expect(appSource).toContain('<AppShell>');
    expect(appSource).toContain('<Outlet />');
    expect(appSource).not.toContain('LegacyOAuthCallbackRedirect');
  });

  it('redirects duplicate calculators route aliases into Medical Tools', () => {
    expect(appSource).toContain('path="/tools/*"');
    expect(appSource).toContain('<ToolsRedirect />');
    expect(routeConfigSource).toContain(
      "export const CALCULATORS_ROUTE_ALIASES = Object.freeze(['/calculators'])",
    );
    expect(routeConfigSource).toContain('aliases: CALCULATORS_ROUTE_ALIASES');
    expect(appSource).toContain('path="/calculators" element={<ToolsRedirect />}');
    expect(appSource).toContain('path="/calculators/*" element={<ToolsRedirect />}');
  });
});
