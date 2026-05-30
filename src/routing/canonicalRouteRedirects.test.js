import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(__dirname, '../App.jsx'), 'utf8');
const routeConfigSource = readFileSync(join(__dirname, '../config/routes.config.js'), 'utf8');

function expectRoute(path, component) {
  expect(appSource).toMatch(new RegExp(`path:\\s*'${path.replace(/\//g, '\\/')}'[\\s\\S]*?<${component}\\s*\\/>`));
}

function expectRedirect(path, to) {
  expect(appSource).toMatch(
    new RegExp(`path:\\s*'${path.replace(/\//g, '\\/')}'[\\s\\S]*?<LegacyProtectedRouteRedirect\\s+to="${to.replace(/\//g, '\\/')}"\\s*\\/>`)
  );
}

describe('canonical route redirects', () => {
  it('preserves signup alias intent on the single canonical auth route', () => {
    expect(appSource).toContain('AUTH_SIGNUP_PATH_ALIASES.includes(location.pathname)');
    expect(appSource).toContain("search.set('mode', 'signup')");
  });

  it('keeps command dashboard canonical and legacy chat paths as redirects', () => {
    expectRoute('/dashboard', 'CommandDashboard');
    expectRedirect('/home', '/dashboard');
    expect(appSource).toContain('ASSISTANT_ROUTE_ALIASES.map');
    expect(routeConfigSource).toContain("export const ASSISTANT_ROUTE_ALIASES = Object.freeze(['/chat', '/ai', '/copilot'])");
    expect(appSource).toContain('OPERATIONS_ROUTE_ALIASES.map');
    expect(routeConfigSource).toContain("export const OPERATIONS_ROUTE_ALIASES = Object.freeze(['/operations'])");
    expect(appSource).not.toContain("path: '/dashboard', element: <LegacyProtectedRouteRedirect to=\"/home\" />");
    expect(appSource).not.toContain("path: '/chat', element: <AppShellPage><Dashboard /></AppShellPage>");
  });

  it('gives the fleet area an explicit canonical live-map redirect', () => {
    expect(appSource).toContain('FLEET_MAP_ROUTE_ALIASES.map');
    expect(routeConfigSource).toContain("export const FLEET_MAP_ROUTE_ALIASES = Object.freeze(['/fleet', '/fleet/live-map', '/fleet/tracking'])");
    expectRoute('/fleet/command', 'FleetDashboard');
  });

  it('keeps Medical IoT as a first-class authenticated dashboard route', () => {
    expectRoute('/medical-iot', 'MedicalIotDashboard');
    expect(appSource).not.toContain("to=\"/fleet/medical-iot\"");
    expect(appSource).not.toContain("to=\"/tools/catalog?tool=medical-iot-dashboard\"");
  });

  it('keeps Hospital Map as a first-class authenticated operations route', () => {
    expectRoute('/hospital-map', 'HospitalMapDashboard');
    expect(appSource).not.toContain("to=\"/tools/catalog?tool=hospital-map\"");
  });

  it('keeps developer/source audit catalog separate from the user-facing tools browser', () => {
    expectRoute('/tools', 'ToolsOverview');
    expect(appSource).toContain('TOOLS_ROUTE_ALIASES.map');
    expect(routeConfigSource).toContain("export const TOOLS_ROUTE_ALIASES = Object.freeze(['/all-tools', '/clinical-tools', '/catalog'])");
    expect(appSource).toContain("path: '/tools/catalog'");
    expect(appSource).toContain('permission: Permission.CONFIGURE_SYSTEM');
  });

  it('redirects legacy audit-log entry points to the canonical audit route', () => {
    expect(appSource).toContain('AUDIT_ROUTE_ALIASES.map');
    expect(appSource).toContain('to="/audit"');
    expect(routeConfigSource).toContain("export const AUDIT_ROUTE_ALIASES = Object.freeze(['/audit-logs'])");
  });

  it('registers profile tool preferences without redirecting canonical tool routes', () => {
    expectRoute('/profile/tool-preferences', 'ProfileToolPreferences');
    expect(appSource).toContain("path: '/tools'");
    expect(appSource).toContain("path: '/tools/calculators/:slug'");
    expect(appSource).not.toContain("to=\"/profile/preferences?tool-preferences\"");
  });

  it('renders product tool pages directly instead of redirecting them through assistant', () => {
    expectRoute('/tools/drug-checker', 'DrugChecker');
    expectRoute('/tools/lab-interpreter', 'LabInterpreter');
    expect(appSource).toContain("path: '/tools/ambient-scribe'");
    expectRoute('/tools/ambient-scribe', 'AmbientScribe');
    expect(appSource).toContain("path: '/tools/patient-summary-ai'");
    expectRoute('/tools/patient-summary-ai', 'PatientSummaryAi');
    expect(appSource).not.toContain('function AssistantToolRedirect');
  });

  it('normalizes auth aliases to a single /auth route and preserves signup intent', () => {
    expect(appSource).toMatch(/path:\s*'\/auth'[\s\S]*?<AuthShell>[\s\S]*?<AuthPage\s*\/>[\s\S]*?<\/AuthShell>[\s\S]*?publicOnly:\s*true/);
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
