import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  CANONICAL_APP_ROUTE_TREE,
  CANONICAL_ROUTES,
  LEGACY_EMERGENCY_ROUTE_REDIRECTS,
  NON_ED_WORKSPACE_STUB_ROUTES,
  PROTECTED_ROUTE_ALIAS_REDIRECTS,
} from '../config/routes.config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(__dirname, '../App.jsx'), 'utf8');

function expectRoutePath(path) {
  const routeNames = Object.entries(CANONICAL_ROUTES)
    .filter(([, routePath]) => routePath === path)
    .map(([name]) => name);
  if (routeNames.length) {
    expect(routeNames.some((routeName) => appSource.includes(`path={CANONICAL_ROUTES.${routeName}}`))).toBe(true);
    return;
  }
  expect(appSource).toContain(`path="${path}"`);
}

describe('canonical route tree', () => {
  it('exports the clean Emergency OS route tree', () => {
    expect(CANONICAL_APP_ROUTE_TREE).toEqual([
      { path: '/', type: 'redirect', to: '/emergency/whiteboard' },
      { path: '/emergency', type: 'redirect', to: '/emergency/whiteboard' },
      { path: '/emergency/whiteboard', type: 'page', componentKey: 'EmergencyWhiteboard' },
      { path: '/emergency/patients', type: 'page', componentKey: 'EmergencyPatientsRoute' },
      { path: '/emergency/journey', type: 'page', componentKey: 'PatientJourneyRoute' },
      { path: '/emergency/ems', type: 'page', componentKey: 'EMSPipeline' },
      { path: '/emergency/intake', type: 'page', componentKey: 'SmartIntake' },
      { path: '/emergency/queues', type: 'page', componentKey: 'EmergencyQueueRoute' },
      { path: '/emergency/reassessment', type: 'page', componentKey: 'EmergencyReassessmentRoute' },
      { path: '/emergency/capacity', type: 'page', componentKey: 'CapacityDetail' },
      { path: '/emergency/boarding', type: 'page', componentKey: 'EmergencyBoardingRoute' },
      { path: '/emergency/referrals', type: 'page', componentKey: 'ReferralPanel' },
      { path: '/emergency/provincial-health', type: 'page', componentKey: 'ProvincialHealthRoute' },
      { path: '/emergency/integrations', type: 'page', componentKey: 'IntegrationHubRoute' },
      { path: '/emergency/copilot', type: 'page', componentKey: 'EmergencyCopilotRoute' },
      { path: '/emergency/analytics', type: 'page', componentKey: 'EmergencyAnalytics' },
      { path: '/emergency/simulation', type: 'page', componentKey: 'RealTimeSimulationRoute' },
      { path: '/emergency/federated-learning', type: 'stub', componentKey: 'ComingSoonPage' },
      { path: '/emergency/digital-twin', type: 'stub', componentKey: 'ComingSoonPage' },
      { path: '/emergency/tools', type: 'page', componentKey: 'ClinicalCalculatorHub' },
      { path: '/emergency/shift', type: 'page', componentKey: 'EmergencyShiftRoute' },
      { path: '/ai-governance', type: 'stub', componentKey: 'ComingSoonPage' },
      { path: '/emergency/ai-governance', type: 'stub', componentKey: 'ComingSoonPage' },
      { path: '/emergency/settings', type: 'page', componentKey: 'EmergencySettingsRoute' },
      { path: '*', type: 'redirect', to: '/emergency/whiteboard' },
    ]);
  });

  it('mounts canonical ED routes inside the flattened AppShell', () => {
    for (const route of CANONICAL_APP_ROUTE_TREE.filter((item) => item.type !== 'redirect')) {
      expectRoutePath(route.path);
    }

    expect(appSource).toContain('<AppShell>');
    expect(appSource).toContain('<EMSPipeline />');
    expect(appSource).toContain('<SmartIntake />');
    expect(appSource).toContain('<QueueRoute />');
    expect(appSource).toContain('<ReferralPanel />');
    expect(appSource).toContain('<CapacityRoute />');
    expect(appSource).toContain('<ProvincialHealthRoute />');
    expect(appSource).toContain('<IntegrationsRoute />');
    expect(appSource).toContain('<CopilotRoute />');
    expect(appSource).toContain('<EmergencyAnalytics />');
    expect(appSource).toContain('<RealTimeSimulationRoute />');
    expect(appSource).toContain('<ComingSoonPage moduleName="Federated Learning" />');
    expect(appSource).toContain('<ComingSoonPage moduleName="Digital Twin" />');
    expect(appSource).toContain('<AIGovernanceRoute />');
    expect(appSource).toContain('<EmergencySettings />');
    expect(appSource).toContain('path={CANONICAL_ROUTES.emergencyCopilot}');
    expect(appSource).toContain('path={CANONICAL_ROUTES.emergencyTools}');
    expect(appSource).toContain('path={CANONICAL_ROUTES.emergencyAiGovernance}');
    expect(appSource).not.toContain('<AIGovernanceDashboard');
  });

  it('redirects duplicates and legacy aliases to canonical routes', () => {
    expect(appSource).not.toContain('const DUPLICATE_ROUTE_REDIRECTS = Object.freeze([');
    expect(LEGACY_EMERGENCY_ROUTE_REDIRECTS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: '/emergency/queue', to: '/emergency/queues' }),
        expect.objectContaining({ path: '/workspace/emergency', to: '/emergency/whiteboard' }),
        expect.objectContaining({ path: '/settings/general', to: '/emergency/settings' }),
      ])
    );
    expect(PROTECTED_ROUTE_ALIAS_REDIRECTS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: '/assistant', to: '/emergency/copilot' }),
      ])
    );
    expect(PROTECTED_ROUTE_ALIAS_REDIRECTS).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: '/dashboard' }),
      ])
    );
    expect(appSource).toContain('<Route path="/dashboard" element={<Navigate to={CANONICAL_ROUTES.emergencyWhiteboard} replace />} />');
    expect(appSource).toContain('<Route path="/tools/*" element={<ToolsRedirect />} />');
    expect(appSource).toContain('<Route path="/scores/*" element={<ToolsRedirect />} />');
    expect(appSource).toContain('LEGACY_EMERGENCY_ROUTE_REDIRECTS.map(({ path, to }) => (');
  });

  it('stubs non-ED workspace routes while preserving Emergency OS fallbacks', () => {
    expect(appSource).toContain('<Route path="/app" element={<Navigate to={CANONICAL_ROUTES.emergencyWhiteboard} replace />} />');
    expect(appSource).toContain('<Route path="/workspace" element={<Navigate to={CANONICAL_ROUTES.emergencyWhiteboard} replace />} />');
    expect(appSource).toContain('<Route path="/mobile" element={<Navigate to={CANONICAL_ROUTES.emergencyWhiteboard} replace />} />');
    expect(appSource).toContain('<Route path="/emergency/*" element={<Navigate to={CANONICAL_ROUTES.emergencyWhiteboard} replace />} />');
    expect(NON_ED_WORKSPACE_STUB_ROUTES).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: '/analytics', moduleName: 'Analytics' }),
        expect.objectContaining({ path: '/fleet/*', moduleName: 'Fleet' }),
        expect.objectContaining({ path: '/lab', moduleName: 'Laboratory' }),
        expect.objectContaining({ path: '/governance/*', moduleName: 'Governance' }),
        expect.objectContaining({ path: '/platform-admin', moduleName: 'Platform Admin' }),
      ])
    );
  });

  it('keeps auth callbacks deep-linkable and catches all unknown routes', () => {
    expect(appSource).toContain('<Route path="*" element={<Navigate to={CANONICAL_ROUTES.emergencyWhiteboard} replace />} />');
    expect(appSource).not.toContain('Page not found');
    expect(appSource).not.toContain('<ToolNotFound');
  });
});
