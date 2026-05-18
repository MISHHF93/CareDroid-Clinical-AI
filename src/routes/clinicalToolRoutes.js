/**
 * Single source for clinical tool SPA paths (App.jsx + deep-link audits).
 * Does not replace react-router — supplies path definitions and validation helpers.
 */

import toolRegistry from '../data/toolRegistry';
import { builtinUiCalculators } from '../data/clinicalIntentToolCatalog';
import { resolveCatalogLaunch } from '../data/clinicalCatalogWiring';

/** Overview pages (not in toolRegistry as navigable tools). */
export const TOOLS_OVERVIEW_PATHS = Object.freeze(['/tools', '/tools/catalog']);

/**
 * Calculator routes: path + slug for Calculators initialCalculatorId / ?calc=
 * Sorted longest-path-first for prefix matching.
 */
export const CALCULATOR_ROUTE_DEFS = Object.freeze(
  builtinUiCalculators
    .filter((c) => c.path)
    .map((c) => ({
      path: c.path,
      calculatorSlug: c.id,
      name: c.name,
    }))
    .sort((a, b) => b.path.length - a.path.length)
);

/** Registry tool paths under /tools and /fleet (includes hub + fleet pages). */
export const REGISTRY_TOOL_PATHS = Object.freeze(
  [...new Set(toolRegistry.map((t) => t.path).filter(Boolean))].sort()
);

/** All tool-area paths that should resolve to a real screen (not dashboard fallback). */
export const KNOWN_TOOL_AREA_PATHS = Object.freeze([
  ...TOOLS_OVERVIEW_PATHS,
  ...REGISTRY_TOOL_PATHS,
]);

const calculatorPathSet = new Set(CALCULATOR_ROUTE_DEFS.map((d) => d.path));
const knownPathSet = new Set(KNOWN_TOOL_AREA_PATHS);

/**
 * @param {string} pathname
 * @returns {{ path: string, calculatorSlug: string } | null}
 */
export function matchCalculatorRoute(pathname) {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  return CALCULATOR_ROUTE_DEFS.find((def) => def.path === normalized) ?? null;
}

/**
 * @param {string} pathname
 */
export function isKnownToolAreaPath(pathname) {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  if (knownPathSet.has(normalized)) return true;
  return calculatorPathSet.has(normalized);
}

/**
 * @param {string} pathname
 */
export function isToolsAreaPath(pathname) {
  return pathname === '/tools' || pathname.startsWith('/tools/');
}

/**
 * @param {string} pathname
 */
export function isFleetAreaPath(pathname) {
  return pathname === '/fleet' || pathname.startsWith('/fleet/');
}

/**
 * Catalog / NLU id → expected SPA path (for route tests).
 * @param {string} id
 */
export function expectedLaunchPath(id) {
  return resolveCatalogLaunch(id).path;
}
