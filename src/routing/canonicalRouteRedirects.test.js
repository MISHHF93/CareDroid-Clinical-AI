import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(__dirname, '../App.jsx'), 'utf8');

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
    expectRedirect('/chat', '/assistant');
    expect(appSource).toContain("const ASSISTANT_ROUTE_ALIASES = ['/ai', '/copilot']");
    expect(appSource).not.toContain("path: '/dashboard', element: <LegacyProtectedRouteRedirect to=\"/home\" />");
    expect(appSource).not.toContain("path: '/chat', element: <AppShellPage><Dashboard /></AppShellPage>");
  });

  it('gives the fleet area an explicit canonical live-map redirect', () => {
    expectRedirect('/fleet', '/fleet/map');
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
    expect(appSource).toContain("const TOOLS_ROUTE_ALIASES = ['/all-tools', '/clinical-tools']");
    expect(appSource).toContain("path: '/tools/catalog'");
    expect(appSource).toContain('permission: Permission.CONFIGURE_SYSTEM');
    expectRedirect('/catalog', '/tools/catalog');
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
