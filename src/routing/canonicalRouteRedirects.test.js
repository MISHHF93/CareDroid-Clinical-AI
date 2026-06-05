import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { PROTECTED_ROUTE_ALIAS_REDIRECTS } from '../config/routes.config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(__dirname, '../App.jsx'), 'utf8');
const routeConfigSource = readFileSync(join(__dirname, '../config/routes.config.js'), 'utf8');

function expectRoute(path, component) {
  expect(appSource).toMatch(
    new RegExp(`path:\\s*'${path.replace(/\//g, '\\/')}'[\\s\\S]*?<${component}\\s*\\/>`)
  );
}

function expectGeneratedRedirect(path, to) {
  expect(PROTECTED_ROUTE_ALIAS_REDIRECTS).toEqual(
    expect.arrayContaining([expect.objectContaining({ path, to })])
  );
}

describe('canonical route redirects', () => {
  it('preserves signup alias intent on the single canonical auth route', () => {
    expect(appSource).toContain('AUTH_SIGNUP_PATH_ALIASES.includes(location.pathname)');
    expect(appSource).toContain("search.set('mode', 'signup')");
  });

  it('keeps command dashboard canonical and legacy chat paths as redirects', () => {
    expectRoute('/dashboard', 'CommandDashboard');
    expectGeneratedRedirect('/home', '/dashboard');
    expectGeneratedRedirect('/chat', '/assistant');
    expect(appSource).toContain('PROTECTED_ROUTE_ALIAS_REDIRECTS.map');
    expectRoute('/discover', 'CapabilityDiscovery');
    expectRoute('/automation', 'WorkflowAutomationBuilder');
    expect(routeConfigSource).toContain(
      "export const ASSISTANT_ROUTE_ALIASES = Object.freeze(['/chat', '/ai', '/copilot'])"
    );
    expectRoute('/operations', 'Operations');
    expectRoute('/operations-center', 'DigitalOperationsCenter');
    expect(appSource).not.toContain('OPERATIONS_ROUTE_ALIASES.map');
    expect(routeConfigSource).toContain(
      'export const OPERATIONS_ROUTE_ALIASES = Object.freeze([])'
    );
    expect(appSource).not.toContain(
      'path: \'/dashboard\', element: <LegacyProtectedRouteRedirect to="/home" />'
    );
    expect(appSource).not.toContain(
      "path: '/chat', element: <AppShellPage><Dashboard /></AppShellPage>"
    );
  });

  it('gives the fleet area an explicit canonical live-map redirect', () => {
    expectGeneratedRedirect('/fleet', '/fleet/map');
    expect(routeConfigSource).toMatch(
      /export const FLEET_MAP_ROUTE_ALIASES = Object\.freeze\(\[[\s\S]*'\/fleet'[\s\S]*'\/fleet\/live-map'[\s\S]*'\/fleet\/tracking'/
    );
    expectRoute('/fleet/command', 'FleetDashboard');
  });

  it('keeps Medical IoT as a first-class authenticated dashboard route', () => {
    expectRoute('/medical-iot', 'MedicalIotDashboard');
    expect(appSource).not.toContain('to="/fleet/medical-iot"');
    expect(appSource).not.toContain('to="/tools/catalog?tool=medical-iot-dashboard"');
  });

  it('keeps Hospital Map as a first-class authenticated operations route', () => {
    expectRoute('/hospital-map', 'HospitalMapDashboard');
    expect(appSource).not.toContain('to="/tools/catalog?tool=hospital-map"');
  });

  it('keeps developer/source audit catalog separate from the user-facing tools browser', () => {
    expectRoute('/tools', 'ToolsOverview');
    expectGeneratedRedirect('/catalog', '/tools');
    expect(routeConfigSource).toContain(
      "export const TOOLS_ROUTE_ALIASES = Object.freeze(['/all-tools', '/clinical-tools', '/catalog'])"
    );
    expect(appSource).toContain("path: '/tools/catalog'");
    expect(appSource).toContain('permission: Permission.CONFIGURE_SYSTEM');
  });

  it('keeps /privacy as the public privacy policy while governance privacy remains protected', () => {
    expect(appSource).toMatch(
      /path:\s*'\/privacy'[\s\S]*?<PublicShell>[\s\S]*?<PrivacyPolicy\s*\/>[\s\S]*?<\/PublicShell>/
    );
    expect(appSource).toMatch(
      /path:\s*'\/governance\/privacy'[\s\S]*?<PlatformGovernanceWorkspace\s*\/>[\s\S]*?requiresAuth:\s*true[\s\S]*?permission:\s*Permission\.VIEW_PRIVACY_CENTER/
    );
  });

  it('redirects legacy audit-log entry points to the canonical audit route', () => {
    expectGeneratedRedirect('/audit-logs', '/audit');
    expect(routeConfigSource).toContain(
      "export const AUDIT_ROUTE_ALIASES = Object.freeze(['/audit-logs'])"
    );
  });

  it('registers profile tool preferences without redirecting canonical tool routes', () => {
    expectRoute('/profile/tool-preferences', 'ProfileToolPreferences');
    expectRoute('/analytics', 'AnalyticsDashboard');
    expectRoute('/billing', 'BillingPage');
    expectRoute('/usage', 'UsagePage');
    expectRoute('/feature-flags', 'FeatureFlagCenter');
    expectRoute('/plugins', 'PluginMarketplace');
    expectRoute('/dependency-map', 'DependencyMap');
    expectRoute('/data-lineage', 'DataLineageExplorer');
    expectRoute('/self-diagnostics', 'PlatformSelfDiagnostics');
    expect(appSource).toContain("path: '/tools'");
    expect(appSource).toContain("path: '/tools/calculators/:slug'");
    expect(appSource).not.toContain('to="/profile/preferences?tool-preferences"');
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

  it('keeps products, asset packs, and configuration studio as first-class builder routes', () => {
    expectRoute('/products', 'ProductsIndexPage');
    expectRoute('/asset-packs', 'AssetPacksBuilderPage');
    expectRoute('/configuration-studio', 'ConfigurationStudioPage');
    expect(PROTECTED_ROUTE_ALIAS_REDIRECTS).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ path: '/asset-packs' })])
    );
  });

  it('wires simulation, laboratory, and 3D viewer canonical routes with aliases', () => {
    expectRoute('/clinical-decision-support', 'ClinicalDecisionSupport');
    expectRoute('/protocols', 'Protocols');
    expectRoute('/research', 'ResearchEvidenceHub');
    expectRoute('/documentation', 'ClinicalDocumentationAssistant');
    expectRoute('/knowledge-graph', 'ClinicalKnowledgeGraph');
    expectRoute('/predictive-analytics', 'PredictiveAnalyticsDashboard');
    expectRoute('/competencies', 'Competencies');
    expectRoute('/credentials', 'Credentials');
    expectRoute('/simulation', 'MedicalSimulationSuite');
    expectRoute('/simulation/outcomes', 'SimulationOutcomes');
    expectRoute('/simulation/:scenarioId', 'SimulationScenarioPlayer');
    expectRoute('/laboratory', 'LaboratoryDashboard');
    expectRoute('/3d-viewer', 'Medical3DViewer');
    expectGeneratedRedirect('/medical-simulation', '/simulation');
    expectGeneratedRedirect('/lab', '/laboratory');
    expectGeneratedRedirect('/anatomy-viewer', '/3d-viewer');
    expect(routeConfigSource).toContain("export const SIMULATION_ROUTE_ALIASES = Object.freeze(['/medical-simulation'])");
    expect(routeConfigSource).toContain("export const LABORATORY_ROUTE_ALIASES = Object.freeze(['/lab'])");
    expect(routeConfigSource).toContain("export const MEDICAL_3D_VIEWER_ROUTE_ALIASES = Object.freeze(['/anatomy-viewer'])");
  });

  it('normalizes auth aliases to a single /auth route and preserves signup intent', () => {
    expect(appSource).toMatch(
      /path:\s*'\/auth'[\s\S]*?<AuthShell>[\s\S]*?<AuthPage\s*\/>[\s\S]*?<\/AuthShell>[\s\S]*?publicOnly:\s*true/
    );
    expect(appSource).toContain('AUTH_PATH_ALIASES.map((path) => ({');
    expect(appSource).toContain("pathname: '/auth'");
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
