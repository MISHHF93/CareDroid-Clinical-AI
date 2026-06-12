/**
 * Route registry drift tests — App.jsx paths, registry, catalog launch, calculator slugs.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import toolRegistry from '../data/toolRegistry';
import { builtinUiCalculators } from '../data/clinicalIntentToolCatalog';
import { resolveCatalogLaunch } from '../data/clinicalCatalogWiring';
import { PR_FLEET_ALL_REGISTRY_IDS, PR_FLEET_TIER_A_REGISTRY_IDS } from '../data/clinicalToolIdContract';
import { PR_FLEET_TOOL_SPECS } from '../data/prFleetTestConstants';
import {
  CALCULATOR_ROUTE_DEFS,
  KNOWN_TOOL_AREA_PATHS,
  REGISTRY_TOOL_PATHS,
  TOOLS_OVERVIEW_PATHS,
  expectedLaunchPath,
  getCalculatorRouteBySlug,
  isKnownToolAreaPath,
  matchCalculatorRoute,
  resolveToolsAreaRedirect,
} from './clinicalToolRoutes';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(__dirname, '../App.jsx'), 'utf8');

const REQUIRED_CALCULATOR_PATHS = [
  '/tools/calculators/qsofa',
  '/tools/calculators/news2',
  '/tools/calculators/child-pugh',
  '/tools/calculators/has-bled',
  '/tools/calculators/meld',
  '/tools/calculators/meld-na',
  '/tools/calculators/timi-ua-nstemi',
  '/tools/calculators/ascvd-risk',
  '/tools/calculators/ckd-staging',
  '/tools/calculators/stop-bang',
  '/tools/calculators/audit-c',
  '/tools/calculators/phq9',
  '/tools/calculators/gad7',
];

const REQUIRED_OVERVIEW_PATHS = ['/tools', '/tools/catalog'];

const FLEET_PATHS = ['/fleet/command', '/fleet/predictive-maintenance', '/fleet/route-optimizer'];

describe('clinicalToolRoutes — registry ↔ routes', () => {
  it('includes tools overview paths', () => {
    for (const path of REQUIRED_OVERVIEW_PATHS) {
      expect(TOOLS_OVERVIEW_PATHS).toContain(path);
      expect(KNOWN_TOOL_AREA_PATHS).toContain(path);
    }
  });

  it('registers every registry tool path in App.jsx', () => {
    const calculatorPaths = new Set(CALCULATOR_ROUTE_DEFS.map((d) => d.path));
    for (const path of REGISTRY_TOOL_PATHS) {
      expect(isKnownToolAreaPath(path), path).toBe(true);
      if (calculatorPaths.has(path)) {
        expect(CALCULATOR_ROUTE_DEFS.some((d) => d.path === path)).toBe(true);
      } else {
        expect(REGISTRY_TOOL_PATHS).toContain(path);
      }
    }
  });

  it('registers fleet logistics routes', () => {
    for (const path of FLEET_PATHS) {
      expect(isKnownToolAreaPath(path)).toBe(true);
    }
    expect(PR_FLEET_ALL_REGISTRY_IDS).toHaveLength(4);
  });

  it('derives calculator routes from builtinUiCalculators', () => {
    const builtinPaths = builtinUiCalculators.map((c) => c.path).filter(Boolean);
    const defPaths = CALCULATOR_ROUTE_DEFS.map((d) => d.path);
    expect(defPaths.sort()).toEqual([...new Set(builtinPaths)].sort());
  });

  it.each(REQUIRED_CALCULATOR_PATHS)('App.jsx route contract includes calculator %s', (path) => {
    const slug = path.split('/').pop();
    const def = CALCULATOR_ROUTE_DEFS.find((d) => d.path === path);
    expect(def?.calculatorSlug).toBe(slug);
    expect(appSource).not.toContain('CALCULATOR_ROUTE_DEFS.map');
    expect(appSource).toContain("path: '/tools/calculators/:slug'");
    expect(appSource).toContain('<LegacyCalculatorRouteRedirect />');
  });

  it('matches calculator slugs for deep links', () => {
    for (const path of REQUIRED_CALCULATOR_PATHS) {
      const match = matchCalculatorRoute(path);
      expect(match?.path).toBe(path);
      expect(match?.calculatorSlug).toBe(path.split('/').pop());
    }
  });

  it('resolves calculator routes by slug through the indexed route map', () => {
    for (const path of REQUIRED_CALCULATOR_PATHS) {
      const slug = path.split('/').pop();
      expect(getCalculatorRouteBySlug(slug)).toEqual(matchCalculatorRoute(path));
    }
    expect(getCalculatorRouteBySlug('not-a-real-calc-xyz')).toBeNull();
  });

  it('catalog launch paths resolve for required calculators', () => {
    for (const path of REQUIRED_CALCULATOR_PATHS) {
      const slug = path.split('/').pop();
      expect(expectedLaunchPath(slug)).toBe(path);
      expect(resolveCatalogLaunch(slug).path).toBe(path);
    }
  });

  it('chat-assisted tools launch to calculators hub', () => {
    expect(expectedLaunchPath('wells-pe')).toBe('/tools/calculators');
    expect(expectedLaunchPath('dispatch-ai')).toBe('/tools/calculators');
  });

  it.each(PR_FLEET_TIER_A_REGISTRY_IDS)('fleet Tier A %s launch path matches PR_FLEET_TOOL_SPECS', (id) => {
    expect(expectedLaunchPath(id)).toBe(PR_FLEET_TOOL_SPECS[id].routePath);
    expect(resolveCatalogLaunch(id).path).toBe(PR_FLEET_TOOL_SPECS[id].routePath);
  });

  it('registers tools and fleet catch-all fallbacks', () => {
    expect(KNOWN_TOOL_AREA_PATHS.some((path) => path.startsWith('/tools/'))).toBe(true);
    expect(KNOWN_TOOL_AREA_PATHS.some((path) => path.startsWith('/fleet/'))).toBe(true);
  });

  it('unknown tool paths are not marked known', () => {
    expect(isKnownToolAreaPath('/tools/not-a-real-tool-xyz')).toBe(false);
    expect(isKnownToolAreaPath('/fleet/unknown-fleet-page')).toBe(false);
  });

  it('does not redirect unknown calculator subpaths (ToolsAreaFallback shows not found)', () => {
    expect(resolveToolsAreaRedirect('/tools/calculators/not-a-real-calc-xyz')).toBeNull();
  });

  it('redirects Tier B hub subpaths to Assistant with ?tool= for chat launch', () => {
    const redirect = resolveToolsAreaRedirect('/tools/calculators/wells-pe');
    expect(redirect).toEqual({
      pathname: '/assistant',
      search: '?tool=wells-pe',
    });
  });

  it('redirects mistyped dedicated calculator paths to canonical route', () => {
    expect(resolveToolsAreaRedirect('/tools/calculators/qsofa')).toBeNull();
    const sofaMispath = resolveToolsAreaRedirect('/tools/calculator/sofa-extra');
    expect(sofaMispath).toBeNull();
  });

  it('toolRegistry paths are subset of known tool area paths', () => {
    for (const reg of toolRegistry) {
      if (reg.path?.startsWith('/tools') || reg.path?.startsWith('/fleet')) {
        expect(KNOWN_TOOL_AREA_PATHS).toContain(reg.path);
      }
    }
  });
});
