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
import {
  LEGACY_EMERGENCY_ROUTE_REDIRECTS,
  PROTECTED_ROUTE_ALIAS_REDIRECTS,
} from '../config/routes.config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(__dirname, '..');
const read = (relativePath) => readFileSync(join(srcRoot, relativePath), 'utf8');

const visibleLinkInventory = [
  ...APP_SHELL_NAV_ITEMS.map((item) => [
    `Primary ${item.label} nav`,
    'config/navigation.config.ts',
    item.path,
  ]),
];

const canonicalRoutes = new Set([
  '/',
  '/start',
  '/dashboard',
  '/assistant',
  '/app',
  ...APP_SHELL_NAV_ITEMS.map((item) => item.path),
]);

const userFacingLinkFiles = [
  'components/AppShell.tsx',
  'pages/PlatformEntryHub.jsx',
  'pages/Profile.tsx',
  'pages/ProfileSettings.tsx',
  'pages/Settings.tsx',
  'pages/tools/ToolsOverview.tsx',
  'pages/tools/ToolNotFound.tsx',
  'pages/tools/ToolsAreaFallback.tsx',
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
    if (file === 'config/navigation.config.ts') {
      expect(navigationConfigPaths, route).toContain(route);
    } else {
      expect(read(file), file).toContain(route);
    }
  });

  it('keeps developer catalog aliases away from normal clinician links', () => {
    expect(PROTECTED_ROUTE_ALIAS_REDIRECTS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: '/catalog', to: '/emergency/tools' }),
      ]),
    );
    expect(read('pages/tools/ToolsOverview.tsx')).not.toContain("navigate('/tools/catalog')");
    expect(read('components/AppShell.tsx')).not.toContain("navigate('/tools/catalog')");
  });

  it('keeps user-facing calculator registry paths on plural canonical routes', () => {
    const registry = read('data/toolRegistry.ts');
    expect(registry).toContain("path: '/tools/calculators/sofa'");
    expect(registry).toContain("path: '/tools/calculators/gfr'");
    expect(registry).toContain("path: '/tools/calculators/bmi'");
    expect(registry).toContain("path: '/tools/calculators/chads2vasc'");
    expect(registry).not.toContain("path: '/tools/calculator/");
  });

  it('preserves legacy route aliases as redirects, not duplicate user-facing pages', () => {
    const app = read('app/router.tsx');
    expect(app).not.toContain('const DUPLICATE_ROUTE_REDIRECTS = Object.freeze([');
    expect(LEGACY_EMERGENCY_ROUTE_REDIRECTS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: '/emergency/smart-intake', to: '/emergency/intake' }),
        expect.objectContaining({ path: '/patients/*', to: '/emergency/patients' }),
        expect.objectContaining({ path: '/workspace/emergency/tools', to: '/emergency/tools' }),
      ]),
    );
    expect(app).toContain('LEGACY_EMERGENCY_ROUTE_REDIRECTS.map(({ path, to }) => (');
    expect(app).toContain('path="/tools/*"');
    expect(app).toContain('<ToolsRedirect />');
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
