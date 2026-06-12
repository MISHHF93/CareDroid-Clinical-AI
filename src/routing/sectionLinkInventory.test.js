import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  APP_SHELL_NAV_ITEMS,
  ADVANCED_SIDEBAR_NAV_ITEMS,
  OPERATIONS_SIDEBAR_NAV_ITEMS,
  PRIMARY_SIDEBAR_NAV_ITEMS,
} from '../config/navigation.config';
import { PROTECTED_ROUTE_ALIAS_REDIRECTS } from '../config/routes.config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(__dirname, '..');
const read = (relativePath) => readFileSync(join(srcRoot, relativePath), 'utf8');

const visibleLinkInventory = [
  ['Home welcome CTA', 'App.jsx', '/auth'],
  ['Home dev bypass', 'App.jsx', '/emergency/whiteboard'],
  ['Auth back link', 'pages/Auth.jsx', '/'],
  ['Primary Whiteboard nav', 'config/navigation.config.js', '/emergency/whiteboard'],
  ['Primary Patients nav', 'config/navigation.config.js', '/emergency/patients'],
  ['Primary EMS nav', 'config/navigation.config.js', '/emergency/ems'],
  ['Primary Intake nav', 'config/navigation.config.js', '/emergency/intake'],
  ['Primary Queues nav', 'config/navigation.config.js', '/emergency/queues'],
  ['Primary Reassessment nav', 'config/navigation.config.js', '/emergency/reassessment'],
  ['Primary Capacity nav', 'config/navigation.config.js', '/emergency/capacity'],
  ['Primary Boarding nav', 'config/navigation.config.js', '/emergency/boarding'],
  ['Primary Referrals nav', 'config/navigation.config.js', '/emergency/referrals'],
  ['Primary Copilot nav', 'config/navigation.config.js', '/emergency/copilot'],
  ['Primary Analytics nav', 'config/navigation.config.js', '/emergency/analytics'],
  ['Primary Settings nav', 'config/navigation.config.js', '/emergency/settings'],
];

const canonicalRoutes = new Set([
  '/',
  '/auth',
  '/dashboard',
  '/assistant',
  '/app',
  '/emergency/whiteboard',
  '/emergency/patients',
  '/emergency/ems',
  '/emergency/intake',
  '/emergency/queues',
  '/emergency/reassessment',
  '/emergency/capacity',
  '/emergency/boarding',
  '/emergency/referrals',
  '/emergency/copilot',
  '/emergency/analytics',
  '/emergency/settings',
]);

const userFacingLinkFiles = [
  'layout/AppShell.jsx',
  'pages/Auth.jsx',
  'pages/AuthCallback.jsx',
  'pages/Profile.jsx',
  'pages/ProfileSettings.jsx',
  'pages/Settings.jsx',
  'pages/tools/ToolsOverview.jsx',
  'pages/tools/ToolNotFound.jsx',
  'pages/tools/ToolsAreaFallback.jsx',
];

const navigationConfigPaths = [
  ...APP_SHELL_NAV_ITEMS,
  ...PRIMARY_SIDEBAR_NAV_ITEMS,
  ...OPERATIONS_SIDEBAR_NAV_ITEMS,
  ...ADVANCED_SIDEBAR_NAV_ITEMS,
].map((item) => item.path);

describe('section link inventory and route flattening', () => {
  it.each(visibleLinkInventory)('%s uses canonical route %s', (_label, file, route) => {
    expect(canonicalRoutes.has(route), `${file} -> ${route}`).toBe(true);
    if (file === 'config/navigation.config.js') {
      expect(navigationConfigPaths, route).toContain(route);
    } else {
      expect(read(file), file).toContain(route);
    }
  });

  it('keeps developer catalog aliases away from normal clinician links', () => {
    expect(PROTECTED_ROUTE_ALIAS_REDIRECTS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: '/catalog', to: '/emergency/copilot' }),
      ])
    );
    expect(read('pages/tools/ToolsOverview.jsx')).not.toContain("navigate('/tools/catalog')");
    expect(read('layout/AppShell.jsx')).not.toContain("navigate('/tools/catalog')");
  });

  it('keeps user-facing calculator registry paths on plural canonical routes', () => {
    const registry = read('data/toolRegistry.js');
    expect(registry).toContain("path: '/tools/calculators/sofa'");
    expect(registry).toContain("path: '/tools/calculators/gfr'");
    expect(registry).toContain("path: '/tools/calculators/bmi'");
    expect(registry).toContain("path: '/tools/calculators/chads2vasc'");
    expect(registry).not.toContain("path: '/tools/calculator/");
  });

  it('preserves legacy route aliases as redirects, not duplicate user-facing pages', () => {
    const app = read('App.jsx');
    expect(app).toContain('const DUPLICATE_ROUTE_REDIRECTS = Object.freeze([');
    expect(PROTECTED_ROUTE_ALIAS_REDIRECTS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: '/home', to: '/emergency/whiteboard' }),
        expect.objectContaining({ path: '/chat', to: '/emergency/copilot' }),
      ])
    );
    expect(app).toContain("path: '/tools/calculators/:slug'");
    expect(app).toContain('<LegacyCalculatorRouteRedirect />');
    expect(app).toContain('...DUPLICATE_ROUTE_REDIRECTS.map(([path, to]) => ({');
    expect(app).toContain('...PROTECTED_ROUTE_ALIAS_REDIRECTS.map(({ path, to }) => ({');
    expect(app).not.toContain('LEGACY_CALCULATOR_ROUTE_ALIASES.map');
    expect(app).not.toContain("path: '/home', element: <AppShellPage>");
    expect(app).not.toContain("path: '/chat', element: <AppShellPage>");
  });

  it('keeps visible links off deprecated route aliases', () => {
    const deprecatedVisibleRoutes = [
      'to="/home"',
      'to="/chat"',
      'to="/catalog"',
      'to="/all-tools"',
      'to="/clinical-tools"',
      "navigate('/home')",
      "navigate('/chat')",
      "navigate('/catalog')",
      "navigate('/all-tools')",
      "navigate('/clinical-tools')",
    ];

    for (const file of userFacingLinkFiles) {
      const source = read(file);
      for (const legacyRoute of deprecatedVisibleRoutes) {
        expect(source, `${file} should not link to ${legacyRoute}`).not.toContain(legacyRoute);
      }
    }
  });
});
