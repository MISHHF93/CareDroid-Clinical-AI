import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(__dirname, '../App.jsx'), 'utf8');

describe('canonical route redirects', () => {
  it('preserves signup alias intent on the single canonical auth route', () => {
    expect(appSource).toContain('AUTH_SIGNUP_PATH_ALIASES.includes(location.pathname)');
    expect(appSource).toContain("search.set('mode', 'signup')");
  });

  it('keeps legacy dashboard and chat paths as redirects, not duplicate page routes', () => {
    expect(appSource).toContain("path: '/dashboard', element: <LegacyProtectedRouteRedirect to=\"/home\" />");
    expect(appSource).toContain("path: '/chat', element: <LegacyProtectedRouteRedirect to=\"/assistant\" />");
    expect(appSource).toContain("const ASSISTANT_ROUTE_ALIASES = ['/ai', '/copilot']");
    expect(appSource).not.toContain("path: '/chat', element: <AppShellPage><Dashboard /></AppShellPage>");
  });

  it('gives the fleet area an explicit canonical operations landing redirect', () => {
    expect(appSource).toContain("path: '/fleet', element: <LegacyProtectedRouteRedirect to=\"/operations\" />");
    expect(appSource).toContain("path: '/fleet/command', element: <AppShellPage><FleetDashboard /></AppShellPage>");
  });

  it('keeps developer/source audit catalog separate from the user-facing tools browser', () => {
    expect(appSource).toContain("path: '/tools', element: <AppShellPage><ToolsOverview /></AppShellPage>, requiresAuth: true");
    expect(appSource).toContain("const TOOLS_ROUTE_ALIASES = ['/all-tools', '/clinical-tools']");
    expect(appSource).toContain("path: '/tools/catalog'");
    expect(appSource).toContain('permission: Permission.CONFIGURE_SYSTEM');
    expect(appSource).toContain("path: '/catalog', element: <LegacyProtectedRouteRedirect to=\"/tools/catalog\" />");
  });

  it('renders product tool pages directly instead of redirecting them through assistant', () => {
    expect(appSource).toContain("path: '/tools/drug-checker', element: <AppShellPage><DrugChecker /></AppShellPage>");
    expect(appSource).toContain("path: '/tools/lab-interpreter', element: <AppShellPage><LabInterpreter /></AppShellPage>");
    expect(appSource).toContain("path: '/tools/ambient-scribe'");
    expect(appSource).toContain("element: <AppShellPage><AmbientScribe /></AppShellPage>");
    expect(appSource).toContain("path: '/tools/patient-summary-ai'");
    expect(appSource).toContain("element: <AppShellPage><PatientSummaryAi /></AppShellPage>");
    expect(appSource).not.toContain('function AssistantToolRedirect');
  });

  it('normalizes auth aliases to a single /auth route and preserves signup intent', () => {
    expect(appSource).toContain("{ path: '/auth', element: <AuthShell><AuthPage /></AuthShell>, publicOnly: true }");
    expect(appSource).toContain('AUTH_PATH_ALIASES.map((path) => ({');
    expect(appSource).toContain('pathname: \'/auth\'');
  });

  it('redirects legacy singular calculator paths to plural canonical calculator routes', () => {
    expect(appSource).toContain('LEGACY_CALCULATOR_ROUTE_ALIASES.map');
    expect(appSource).not.toContain("path: '/tools/calculator/sofa', element: <AppShellPage>");
  });

  it('does not register blank or null route elements', () => {
    expect(appSource).not.toMatch(/element:\s*null/);
    expect(appSource).not.toMatch(/element:\s*undefined/);
    expect(appSource).toContain("path: '*'");
  });
});
