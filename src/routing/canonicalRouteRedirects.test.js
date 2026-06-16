import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  CANONICAL_APP_ROUTE_TREE,
  CANONICAL_ROUTES,
  LEGACY_EMERGENCY_ROUTE_REDIRECTS,
  NON_ED_WORKSPACE_REDIRECT_ROUTES,
  PROTECTED_ROUTE_ALIAS_REDIRECTS,
} from '../config/routes.config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(__dirname, '../App.jsx'), 'utf8');

function expectRoutePath(path) {
  const routeNames = Object.entries(CANONICAL_ROUTES)
    .filter(([, routePath]) => routePath === path)
    .map(([name]) => name);
  if (routeNames.length) {
    expect(
      routeNames.some((routeName) => appSource.includes(`path={CANONICAL_ROUTES.${routeName}}`)),
    ).toBe(true);
    return;
  }
  expect(appSource).toContain(`path="${path}"`);
}

describe('canonical route tree', () => {
  it('exports the clean Emergency OS route tree', () => {
    expect(CANONICAL_APP_ROUTE_TREE).toEqual([
      { path: '/', type: 'redirect', to: '/emergency/whiteboard' },
      { path: '/auth-callback', type: 'page', componentKey: 'AuthCallback' },
      { path: '/shared/tools/:shareId', type: 'page', componentKey: 'SharedToolSession' },
      { path: '/emergency', type: 'redirect', to: '/emergency/whiteboard' },
      { path: '/emergency/whiteboard', type: 'page', componentKey: 'EmergencyWhiteboard' },
      { path: '/emergency/patients', type: 'page', componentKey: 'EmergencyPatientsRoute' },
      { path: '/emergency/ems', type: 'page', componentKey: 'EMSPipeline' },
      { path: '/emergency/intake', type: 'page', componentKey: 'SmartIntake' },
      { path: '/emergency/queues', type: 'page', componentKey: 'EmergencyQueueRoute' },
      { path: '/emergency/reassessment', type: 'page', componentKey: 'EmergencyReassessmentRoute' },
      { path: '/emergency/capacity', type: 'page', componentKey: 'CapacityDetail' },
      { path: '/emergency/boarding', type: 'page', componentKey: 'EmergencyBoardingRoute' },
      { path: '/emergency/referrals', type: 'page', componentKey: 'ReferralPanel' },
      { path: '/emergency/copilot', type: 'page', componentKey: 'EmergencyCopilotRoute' },
      { path: '/emergency/tools', type: 'page', componentKey: 'ToolsOverview' },
      { path: '/emergency/pulse', type: 'page', componentKey: 'EmergencyDepartmentPulse' },
      { path: '/emergency/shift', type: 'page', componentKey: 'EmergencyShiftSummary' },
      { path: '/emergency/analytics', type: 'page', componentKey: 'EmergencyAnalytics' },
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
    expect(appSource).toContain('<CopilotRoute />');
    expect(appSource).toContain('<ToolsOverview />');
    expect(appSource).toContain('<EmergencyDepartmentPulse />');
    expect(appSource).toContain('<EmergencyShiftSummary />');
    expect(appSource).toContain('<EmergencyAnalytics />');
    expect(appSource).toContain('<EmergencySettings />');
    expect(appSource).toContain('path={CANONICAL_ROUTES.emergencyCopilot}');
    expect(appSource).toContain('path={CANONICAL_ROUTES.emergencyTools}');
    expect(appSource).toContain('path={CANONICAL_ROUTES.emergencyPulse}');
    expect(appSource).toContain('path={CANONICAL_ROUTES.emergencyShift}');
    expect(appSource).not.toContain('path={CANONICAL_ROUTES.emergencyJourney}');
    expect(appSource).not.toContain('path={CANONICAL_ROUTES.emergencySimulation}');
    expect(appSource).not.toContain('path={CANONICAL_ROUTES.emergencyAiGovernance}');
    expect(appSource).not.toContain('ComingSoonPage');
    expect(appSource).toContain('<PlatformNavigationPage />');
    expect(appSource).toContain('path={CANONICAL_ROUTES.workspace}');
  });

  it('redirects duplicates and legacy aliases to canonical routes', () => {
    expect(appSource).not.toContain('const DUPLICATE_ROUTE_REDIRECTS = Object.freeze([');
    expect(LEGACY_EMERGENCY_ROUTE_REDIRECTS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: '/emergency/queue', to: '/emergency/queues' }),
        expect.objectContaining({ path: '/workspace/emergency', to: '/emergency/whiteboard' }),
        expect.objectContaining({ path: '/settings/general', to: '/emergency/settings' }),
      ]),
    );
    expect(PROTECTED_ROUTE_ALIAS_REDIRECTS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: '/assistant', to: '/emergency/copilot' }),
      ]),
    );
    expect(PROTECTED_ROUTE_ALIAS_REDIRECTS).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ path: '/dashboard' })]),
    );
    expect(appSource).toContain('path="/dashboard"');
    expect(appSource).toContain('to={CANONICAL_ROUTES.emergencyWhiteboard}');
    expect(appSource).toContain('path="/tools/*"');
    expect(appSource).toContain('path="/scores/*"');
    expect(appSource).toContain('<Route path="/tools/*" element={<ToolsRedirect />} />');
    expect(appSource).toContain('<Route path="/calculators/*" element={<ToolsRedirect />} />');
    expect(appSource).toContain('to={CANONICAL_ROUTES.emergencyCopilot}');
    expect(appSource).toContain('LEGACY_EMERGENCY_ROUTE_REDIRECTS.map(({ path, to }) => (');
    expect(LEGACY_EMERGENCY_ROUTE_REDIRECTS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: '/pulse', to: '/emergency/pulse' }),
        expect.objectContaining({ path: '/shift', to: '/emergency/shift' }),
        expect.objectContaining({ path: '/emergency/simulation', to: '/emergency/whiteboard' }),
        expect.objectContaining({ path: '/emergency/calculators', to: '/emergency/tools' }),
      ]),
    );
    expect(LEGACY_EMERGENCY_ROUTE_REDIRECTS).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: '/emergency/pulse', to: '/emergency/whiteboard' }),
        expect.objectContaining({ path: '/emergency/shift', to: '/emergency/whiteboard' }),
      ]),
    );
  });

  it('redirects non-ED workspace routes while preserving Emergency OS fallbacks', () => {
    expect(appSource).toContain('path="/app"');
    expect(appSource).toContain('path={CANONICAL_ROUTES.workspace}');
    expect(appSource).toContain('path="/mobile"');
    expect(appSource).toContain('path="/emergency/*"');
    expect(appSource).toContain('NON_ED_WORKSPACE_REDIRECT_ROUTES.map(({ path, moduleName }) => (');
    expect(appSource).toContain(
      'element={<Navigate to={CANONICAL_ROUTES.emergencyWhiteboard} replace />}',
    );
    expect(NON_ED_WORKSPACE_REDIRECT_ROUTES).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: '/analytics', moduleName: 'Analytics' }),
        expect.objectContaining({ path: '/fleet/*', moduleName: 'Fleet' }),
        expect.objectContaining({ path: '/lab', moduleName: 'Laboratory' }),
        expect.objectContaining({ path: '/governance/*', moduleName: 'Governance' }),
      ]),
    );
    expect(NON_ED_WORKSPACE_REDIRECT_ROUTES).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: CANONICAL_ROUTES.platformAdmin }),
        expect.objectContaining({ path: CANONICAL_ROUTES.tenantAdmin }),
      ]),
    );
  });

  it('keeps auth callbacks deep-linkable and catches all unknown routes', () => {
    expect(appSource).toContain(
      '<Route path="*" element={<Navigate to={CANONICAL_ROUTES.emergencyWhiteboard} replace />} />',
    );
    expect(appSource).not.toContain('Page not found');
    expect(appSource).not.toContain('<ToolNotFound');
  });
});
