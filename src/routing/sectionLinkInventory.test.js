import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(__dirname, '..');
const read = (relativePath) => readFileSync(join(srcRoot, relativePath), 'utf8');

function expectRedirectRoute(app, path, to) {
  expect(app).toMatch(
    new RegExp(`path:\\s*'${path.replace(/\//g, '\\/')}'[\\s\\S]*?<LegacyProtectedRouteRedirect\\s+to="${to.replace(/\//g, '\\/')}"\\s*\\/>`)
  );
}

const visibleLinkInventory = [
  ['Home welcome CTA', 'App.jsx', '/auth'],
  ['Home dev bypass', 'App.jsx', '/dashboard'],
  ['Auth back link', 'pages/Auth.jsx', '/'],
  ['Primary Dashboard nav', 'navigation/primaryNavigation.js', '/dashboard'],
  ['Primary Assistant nav', 'navigation/primaryNavigation.js', '/assistant'],
  ['Primary Tools nav', 'navigation/primaryNavigation.js', '/tools'],
  ['Primary Calculators nav', 'navigation/primaryNavigation.js', '/tools/calculators'],
  ['Primary Hospital Map nav', 'navigation/primaryNavigation.js', '/hospital-map'],
  ['Primary Medical IoT nav', 'navigation/primaryNavigation.js', '/medical-iot'],
  ['Primary Fleet Map nav', 'navigation/primaryNavigation.js', '/fleet/map'],
  ['Primary Developer Audit nav', 'navigation/primaryNavigation.js', '/tools/catalog'],
  ['Profile settings assistant link', 'pages/ProfileSettings.jsx', '/assistant'],
  ['Settings back link', 'pages/Settings.jsx', '/assistant'],
  ['OAuth callback success', 'pages/AuthCallback.jsx', '/dashboard'],
];

const canonicalRoutes = new Set([
  '/',
  '/auth',
  '/dashboard',
  '/assistant',
  '/tools',
  '/live-map',
  '/hospital-map',
  '/medical-iot',
  '/fleet/map',
  '/devices',
  '/tools/catalog',
  '/tools/calculators',
  '/settings',
  '/system-health',
]);

const userFacingLinkFiles = [
  'components/Sidebar.jsx',
  'pages/Auth.jsx',
  'pages/AuthCallback.jsx',
  'pages/Onboarding.jsx',
  'pages/Profile.jsx',
  'pages/ProfileSettings.jsx',
  'pages/Settings.jsx',
  'pages/tools/ToolsOverview.jsx',
  'pages/tools/ToolNotFound.jsx',
  'pages/tools/ToolsAreaFallback.jsx',
];

describe('section link inventory and route flattening', () => {
  it.each(visibleLinkInventory)('%s uses canonical route %s', (_label, file, route) => {
    expect(canonicalRoutes.has(route), `${file} -> ${route}`).toBe(true);
    expect(read(file), file).toContain(route);
  });

  it('keeps Developer Catalog / Source Audit gated away from normal clinician links', () => {
    expect(read('navigation/primaryNavigation.js')).toContain("permission: 'CONFIGURE_SYSTEM'");
    expect(read('navigation/primaryNavigation.js')).toContain("showInMobile: false");
    expect(read('App.jsx')).toContain('permission: Permission.CONFIGURE_SYSTEM');
    expect(read('pages/tools/ToolsOverview.jsx')).not.toContain("navigate('/tools/catalog')");
    expect(read('components/Sidebar.jsx')).not.toContain("navigate('/tools/catalog')");
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
    expectRedirectRoute(app, '/home', '/dashboard');
    expectRedirectRoute(app, '/chat', '/assistant');
    expectRedirectRoute(app, '/fleet', '/fleet/map');
    expectRedirectRoute(app, '/operations', '/dashboard');
    expectRedirectRoute(app, '/catalog', '/tools');
    expect(app).toContain('ASSISTANT_ROUTE_ALIASES.map');
    expect(app).toContain('TOOLS_ROUTE_ALIASES.map');
    expect(app).toContain('LEGACY_CALCULATOR_ROUTE_ALIASES.map');
    expect(app).not.toContain("path: '/home', element: <AppShellPage>");
    expect(app).not.toContain("path: '/chat', element: <AppShellPage>");
  });

  it('keeps visible links off deprecated route aliases', () => {
    const deprecatedVisibleRoutes = [
      "to=\"/home\"",
      "to=\"/chat\"",
      "to=\"/catalog\"",
      "to=\"/all-tools\"",
      "to=\"/clinical-tools\"",
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
