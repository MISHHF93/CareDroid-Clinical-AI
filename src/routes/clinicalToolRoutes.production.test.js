/**
 * Production route reliability — registry paths, calculator slugs, catalog launch, fallbacks.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import toolRegistry from '../data/toolRegistry';
import { builtinUiCalculators } from '../data/clinicalIntentToolCatalog';
import {
  resolveCatalogLaunch,
  resolveNavigationPathForLaunch,
} from '../data/clinicalCatalogWiring';
import {
  CLINICAL_TIER_A_CALCULATOR_REGISTRY_IDS,
  CLINICAL_TIER_B_CHAT_REGISTRY_IDS,
  PR_FLEET_ALL_REGISTRY_IDS,
  TOOL_LAUNCH_PATHS,
} from '../data/clinicalToolIdContract';
import {
  CALCULATOR_ROUTE_DEFS,
  REQUIRED_PRODUCTION_TOOL_PATHS,
  REGISTRY_TOOL_PATHS,
  expectedLaunchPath,
  isKnownToolAreaPath,
  isRegisteredCalculatorSlug,
  matchCalculatorRoute,
  normalizeToolPathname,
  parseCalculatorSubpath,
  resolveToolsAreaRedirect,
} from './clinicalToolRoutes';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(__dirname, '../App.jsx'), 'utf8');

const PRODUCTION_CALCULATOR_PATHS = REQUIRED_PRODUCTION_TOOL_PATHS.filter((p) =>
  p.startsWith('/tools/calculators')
);

const FLEET_PRODUCTION_PATHS = REQUIRED_PRODUCTION_TOOL_PATHS.filter((p) =>
  p.startsWith('/fleet/')
);

describe('Production routes — App.jsx derives calculator routes from contract', () => {
  it('uses CALCULATOR_ROUTE_DEFS.map for calculator pages (no drifted duplicates)', () => {
    expect(appSource).toContain('CALCULATOR_ROUTE_DEFS.map');
    expect(appSource).toContain('initialCalculatorId={calculatorSlug}');
    const requiredCalculatorPaths = REQUIRED_PRODUCTION_TOOL_PATHS.filter((p) =>
      p.startsWith('/tools/calculators/') && p !== TOOL_LAUNCH_PATHS.calculatorsHub
    );
    expect(CALCULATOR_ROUTE_DEFS.length).toBeGreaterThanOrEqual(requiredCalculatorPaths.length);
    for (const path of requiredCalculatorPaths) {
      expect(CALCULATOR_ROUTE_DEFS.some((d) => d.path === path)).toBe(true);
    }
  });

  it('declares calculators hub after slug-specific routes', () => {
    const hubIdx = appSource.indexOf("path: '/tools/calculators', element:");
    expect(hubIdx).toBeGreaterThan(-1);
    const lastSlugRoute = appSource.lastIndexOf('initialCalculatorId={calculatorSlug}');
    expect(lastSlugRoute).toBeLessThan(hubIdx);
  });

  it.each(REQUIRED_PRODUCTION_TOOL_PATHS)('registers required production path %s', (path) => {
    const fromCalculatorDefs = CALCULATOR_ROUTE_DEFS.some((d) => d.path === path);
    if (fromCalculatorDefs) {
      expect(CALCULATOR_ROUTE_DEFS.find((d) => d.path === path)).toBeTruthy();
    } else {
      expect(appSource).toContain(`path: '${path}'`);
    }
    expect(isKnownToolAreaPath(path)).toBe(true);
  });
});

describe('Production routes — registry tool paths', () => {
  it('every toolRegistry path is known and declared in App.jsx', () => {
    const calculatorPaths = new Set(CALCULATOR_ROUTE_DEFS.map((d) => d.path));
    for (const tool of toolRegistry) {
      if (!tool.path?.startsWith('/tools') && !tool.path?.startsWith('/fleet')) continue;
      expect(REGISTRY_TOOL_PATHS).toContain(tool.path);
      if (calculatorPaths.has(tool.path)) {
        expect(CALCULATOR_ROUTE_DEFS.some((d) => d.path === tool.path)).toBe(true);
      } else {
        expect(appSource).toContain(`path: '${tool.path}'`);
      }
    }
  });
});

describe('Production routes — calculator slugs', () => {
  it.each(
    PRODUCTION_CALCULATOR_PATHS.filter((p) => p !== TOOL_LAUNCH_PATHS.calculatorsHub)
  )('slug route %s matches builtin calculator', (path) => {
    const slug = path.split('/').pop();
    expect(isRegisteredCalculatorSlug(slug)).toBe(true);
    expect(matchCalculatorRoute(path)?.calculatorSlug).toBe(slug);
  });

  it('every builtinUiCalculators path has an App route via CALCULATOR_ROUTE_DEFS', () => {
    for (const calc of builtinUiCalculators) {
      if (!calc.path) continue;
      const def = CALCULATOR_ROUTE_DEFS.find((d) => d.path === calc.path);
      expect(def?.calculatorSlug, calc.id).toBe(calc.id);
    }
  });

  it('hub path resolves without a dedicated slug', () => {
    expect(matchCalculatorRoute(TOOL_LAUNCH_PATHS.calculatorsHub)).toBeNull();
    expect(parseCalculatorSubpath(TOOL_LAUNCH_PATHS.calculatorsHub)).toBeNull();
  });
});

describe('Production routes — catalog launch targets', () => {
  it.each(CLINICAL_TIER_A_CALCULATOR_REGISTRY_IDS)(
    'Tier A %s launch path is a registered calculator route',
    (registryId) => {
      const launch = resolveCatalogLaunch(registryId);
      expect(launch.path).toBeTruthy();
      expect(matchCalculatorRoute(launch.path)).toBeTruthy();
      expect(launch.path).not.toBe(TOOL_LAUNCH_PATHS.calculatorsHub);
    }
  );

  it.each(CLINICAL_TIER_B_CHAT_REGISTRY_IDS)(
    'Tier B chat %s launches to calculators hub with dashboard navigation',
    (registryId) => {
      const launch = resolveCatalogLaunch(registryId);
      expect(launch.path).toBe(TOOL_LAUNCH_PATHS.calculatorsHub);
      expect(launch.chatSeed?.length).toBeGreaterThan(20);
      expect(resolveNavigationPathForLaunch(launch)).toBe('/dashboard');
    }
  );

  it.each(PR_FLEET_ALL_REGISTRY_IDS)('fleet %s launch path matches dedicated route', (registryId) => {
    const launch = resolveCatalogLaunch(registryId);
    expect(launch.path).toBeTruthy();
    expect(isKnownToolAreaPath(launch.path)).toBe(true);
    if (registryId === 'dispatch-ai') {
      expect(launch.path).toBe(TOOL_LAUNCH_PATHS.calculatorsHub);
    } else {
      expect(launch.path).toMatch(/^\/fleet\//);
    }
  });

  it.each(PRODUCTION_CALCULATOR_PATHS)('catalog resolves slug %s to same path', (path) => {
    const slug = path.split('/').pop();
    expect(expectedLaunchPath(slug)).toBe(path);
    expect(resolveCatalogLaunch(slug).path).toBe(path);
  });
});

describe('Production routes — tools area fallback redirects', () => {
  it('redirects legacy /tools/calculator/sofa mistyped under calculators subpath', () => {
    const redirect = resolveToolsAreaRedirect('/tools/calculators/sofa');
    expect(redirect?.pathname).toBe('/tools/calculator/sofa');
  });

  it('redirects chat-assisted mistyped subpath to dashboard', () => {
    const redirect = resolveToolsAreaRedirect('/tools/calculators/wells-pe');
    expect(redirect?.pathname).toBe('/dashboard');
  });

  it('returns null redirect for unknown calculator subpath', () => {
    expect(resolveToolsAreaRedirect('/tools/calculators/not-a-real-calc-xyz')).toBeNull();
  });

  it('returns null when path already matches a dedicated route', () => {
    expect(resolveToolsAreaRedirect('/tools/calculators/qsofa')).toBeNull();
  });

  it('normalizes trailing slashes', () => {
    expect(normalizeToolPathname('/tools/catalog/')).toBe('/tools/catalog');
    expect(isKnownToolAreaPath('/tools/catalog/')).toBe(true);
  });
});

describe('Production routes — fleet logistics', () => {
  it.each(FLEET_PRODUCTION_PATHS)('fleet path %s is registered', (path) => {
    expect(appSource).toContain(`path: '${path}'`);
    expect(isKnownToolAreaPath(path)).toBe(true);
  });
});
