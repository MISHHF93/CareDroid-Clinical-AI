import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(__dirname, '../app/router.tsx'), 'utf8');
const routeConfigSource = readFileSync(join(__dirname, '../config/routes.config.ts'), 'utf8');

describe('auth canonical flow wiring', () => {
  it('mounts the real login/signup page at the sign-in aliases, and still redirects the remaining unbuilt auth flows (HEAL-347.12)', () => {
    // Before HEAL-347.12, EVERY auth-style path (including /login, /register)
    // bounced straight to the demo platform entry hub -- there was no real
    // sign-in page anywhere in the frontend, even though the backend has
    // always had a complete credential system. /login and /register now mount
    // AuthPage; the flows that don't have a real page yet (forgot-password,
    // reset-password, email verify, magic link, OAuth callback, invite,
    // 2FA/biometric setup) still redirect via AuthPathsRedirect/legacyAuthPaths.
    expect(appSource).toContain("AuthPage = lazyRoute(() => import('../pages/auth/AuthPage'))");
    expect(appSource).toContain('signInAliases.map');
    expect(appSource).toContain('AUTH_SIGNUP_PATH_ALIASES.map');
    expect(appSource).toMatch(/<AuthPage initialMode="login"\s*\/>/);
    expect(appSource).toMatch(/<AuthPage initialMode="signup"\s*\/>/);
    expect(appSource).toContain('function AuthPathsRedirect()');
    expect(appSource).toContain('legacyAuthPaths');
    expect(appSource).not.toContain('function AuthRoute()');
    expect(routeConfigSource).not.toContain("['/auth', CANONICAL_ROUTES.emergencyWhiteboard]");
    expect(routeConfigSource).toContain("login: '/login'");
    expect(routeConfigSource).toContain("register: '/register'");
  });

  it('gates the operational app behind a real session, redirecting an unauthenticated visitor to login (HEAL-347.13)', () => {
    // Before this, UserContext.tsx always fell back to an anonymous
    // open-access identity when no real session existed -- there was no
    // point where an unauthenticated visitor was actually turned away.
    // requireRealAuthGate (config/authGate.config.ts) defaults ON for real
    // browser use and OFF under Vitest, so the hundreds of existing page/
    // component tests that render CareDroid's UI don't need to simulate a
    // full login handshake -- see that file's own comment. The live,
    // end-to-end behavior (redirect + returnUrl round-trip through real
    // login) is verified via live-browser evidence in this fix's commit,
    // matching this session's established methodology for router-level
    // wiring that isn't practically simulable in jsdom.
    expect(appSource).toContain('function RequireRealSession(');
    expect(appSource).toContain("authMode !== 'real'");
    expect(appSource).toMatch(/<RequireRealSession>\s*<AppShell>/);
  });

  it("recognizes AuthPage.tsx's explicit dev-bypass marker, not the ambient auto-bootstrap authMode (HEAL-347.16)", () => {
    // UserContext.tsx's OWN background bootstrap effect already establishes
    // a 'local-dev-demo' session automatically on every app mount in dev
    // mode, regardless of whether anyone ever clicked the bypass button --
    // an earlier version of this gate trusted that value directly, which
    // made it pass for every dev-mode visitor within a couple seconds
    // (confirmed live, caught and fixed before commit). The gate must check
    // for 'explicit-dev-bypass' specifically -- the marker only
    // AuthPage.tsx's button handler ever stamps -- not 'local-dev-demo'.
    expect(appSource).toContain("authMode === 'explicit-dev-bypass'");
    expect(appSource).not.toMatch(
      /isDevBypassSession\s*=\s*isDev\s*&&\s*\(?authMode\s*===\s*'local-dev-demo'/,
    );
  });

  it('keeps CareDroid routes inside the AppShell while UserProvider supplies platform access', () => {
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
    expect(appSource).toMatch(/<Route path="\/calculators"\s+element=\{<ToolsRedirect \/>\}/);
    expect(appSource).toMatch(/<Route path="\/calculators\/\*"\s+element=\{<ToolsRedirect \/>\}/);
  });
});
