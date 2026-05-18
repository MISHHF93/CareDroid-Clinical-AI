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
import { PR_FLEET_ALL_REGISTRY_IDS } from '../data/clinicalToolIdContract';
import {
  CALCULATOR_ROUTE_DEFS,
  KNOWN_TOOL_AREA_PATHS,
  REGISTRY_TOOL_PATHS,
  TOOLS_OVERVIEW_PATHS,
  expectedLaunchPath,
  isKnownToolAreaPath,
  matchCalculatorRoute,
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
];

const REQUIRED_OVERVIEW_PATHS = ['/tools', '/tools/catalog'];

const FLEET_PATHS = ['/fleet/command', '/fleet/predictive-maintenance', '/fleet/route-optimizer'];

describe('clinicalToolRoutes — registry ↔ routes', () => {
  it('includes tools overview paths', () => {
    for (const path of REQUIRED_OVERVIEW_PATHS) {
      expect(TOOLS_OVERVIEW_PATHS).toContain(path);
      expect(KNOWN_TOOL_AREA_PATHS).toContain(path);
      expect(appSource).toContain(`path: '${path}'`);
    }
  });

  it('registers every registry tool path in App.jsx', () => {
    for (const path of REGISTRY_TOOL_PATHS) {
      expect(appSource).toContain(`path: '${path}'`);
    }
  });

  it('registers fleet logistics routes', () => {
    for (const path of FLEET_PATHS) {
      expect(appSource).toContain(`path: '${path}'`);
      expect(isKnownToolAreaPath(path)).toBe(true);
    }
    expect(PR_FLEET_ALL_REGISTRY_IDS).toHaveLength(4);
  });

  it('derives calculator routes from builtinUiCalculators', () => {
    const builtinPaths = builtinUiCalculators.map((c) => c.path).filter(Boolean);
    const defPaths = CALCULATOR_ROUTE_DEFS.map((d) => d.path);
    expect(defPaths.sort()).toEqual([...new Set(builtinPaths)].sort());
  });

  it.each(REQUIRED_CALCULATOR_PATHS)('App.jsx declares calculator route %s', (path) => {
    expect(appSource).toContain(`path: '${path}'`);
    expect(appSource).toContain(`initialCalculatorId="${path.split('/').pop()}"`);
  });

  it('matches calculator slugs for deep links', () => {
    for (const path of REQUIRED_CALCULATOR_PATHS) {
      const match = matchCalculatorRoute(path);
      expect(match?.path).toBe(path);
      expect(match?.calculatorSlug).toBe(path.split('/').pop());
    }
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

  it('registers tools and fleet catch-all fallbacks', () => {
    expect(appSource).toContain("path: '/tools/*'");
    expect(appSource).toContain("path: '/fleet/*'");
  });

  it('unknown tool paths are not marked known', () => {
    expect(isKnownToolAreaPath('/tools/not-a-real-tool-xyz')).toBe(false);
    expect(isKnownToolAreaPath('/fleet/unknown-fleet-page')).toBe(false);
  });

  it('toolRegistry paths are subset of known tool area paths', () => {
    for (const reg of toolRegistry) {
      if (reg.path?.startsWith('/tools') || reg.path?.startsWith('/fleet')) {
        expect(KNOWN_TOOL_AREA_PATHS).toContain(reg.path);
      }
    }
  });
});
