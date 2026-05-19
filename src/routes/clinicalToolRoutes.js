/**
 * Single source for clinical tool SPA paths (App.jsx + deep-link audits).
 * Does not replace react-router — supplies path definitions and validation helpers.
 */

import toolRegistry from '../data/toolRegistry';
import { builtinUiCalculators } from '../data/clinicalIntentToolCatalog';
import {
  resolveCatalogLaunch,
  resolveNavigationPathForLaunch,
  resolveRegistryId,
} from '../data/clinicalCatalogWiring';
import { TOOL_LAUNCH_PATHS } from '../data/clinicalToolIdContract';

/** Overview pages (not in toolRegistry as navigable tools). */
export const TOOLS_OVERVIEW_PATHS = Object.freeze([
  TOOL_LAUNCH_PATHS.toolsOverview,
  TOOL_LAUNCH_PATHS.toolsCatalog,
]);

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
const calculatorSlugSet = new Set(CALCULATOR_ROUTE_DEFS.map((d) => d.calculatorSlug));
const knownPathSet = new Set(KNOWN_TOOL_AREA_PATHS);

/** Production paths required for release validation (audits, smoke checks). */
export const REQUIRED_PRODUCTION_TOOL_PATHS = Object.freeze([
  TOOL_LAUNCH_PATHS.toolsCatalog,
  TOOL_LAUNCH_PATHS.calculatorsHub,
  '/tools/calculators/qsofa',
  '/tools/calculators/news2',
  '/tools/calculators/child-pugh',
  '/tools/calculators/has-bled',
  '/tools/calculators/meld',
  '/tools/calculators/meld-na',
  '/tools/calculators/timi-ua-nstemi',
  TOOL_LAUNCH_PATHS.fleetCommand,
  TOOL_LAUNCH_PATHS.predictiveMaintenance,
  TOOL_LAUNCH_PATHS.routeOptimizer,
]);

/**
 * @param {string} pathname
 */
export function normalizeToolPathname(pathname) {
  if (!pathname) return '/';
  return String(pathname).replace(/\/+$/, '') || '/';
}

/**
 * @param {string} pathname
 * @returns {{ path: string, calculatorSlug: string } | null}
 */
export function matchCalculatorRoute(pathname) {
  const normalized = normalizeToolPathname(pathname);
  return CALCULATOR_ROUTE_DEFS.find((def) => def.path === normalized) ?? null;
}

/**
 * Slug segment after `/tools/calculators/` (invalid dedicated routes land on `ToolsAreaFallback`).
 * @param {string} pathname
 * @returns {string|null}
 */
export function parseCalculatorSubpath(pathname) {
  const normalized = normalizeToolPathname(pathname);
  const hub = TOOL_LAUNCH_PATHS.calculatorsHub;
  if (normalized === hub) return null;
  if (!normalized.startsWith(`${hub}/`)) return null;
  const slug = normalized.slice(hub.length + 1);
  if (!slug || slug.includes('/')) return null;
  return slug;
}

/**
 * @param {string} slug
 */
export function isRegisteredCalculatorSlug(slug) {
  return calculatorSlugSet.has(slug);
}

/**
 * Redirect mistyped `/tools/calculators/:slug` URLs to canonical calculator or chat launch paths.
 * @param {string} pathname
 * @returns {{ pathname: string, search?: string } | null}
 */
export function resolveToolsAreaRedirect(pathname) {
  const normalized = normalizeToolPathname(pathname);
  if (matchCalculatorRoute(normalized)) return null;

  const subpathSlug = parseCalculatorSubpath(normalized);
  if (!subpathSlug) return null;

  const registryId = resolveRegistryId(subpathSlug);
  const launch = resolveCatalogLaunch(subpathSlug);
  if (!launch?.path && !launch?.chatSeed && !registryId) return null;

  const canonicalPath = launch.path ? normalizeToolPathname(launch.path) : null;
  if (canonicalPath && canonicalPath !== normalized) {
    if (matchCalculatorRoute(canonicalPath)) {
      return { pathname: canonicalPath };
    }
    const navPath = resolveNavigationPathForLaunch(launch);
    if (navPath && normalizeToolPathname(navPath) !== normalized) {
      return { pathname: navPath };
    }
    if (canonicalPath === TOOL_LAUNCH_PATHS.calculatorsHub) {
      return { pathname: canonicalPath, search: `?calc=${encodeURIComponent(subpathSlug)}` };
    }
  }

  return null;
}

/**
 * @param {string} pathname
 */
export function isKnownToolAreaPath(pathname) {
  const normalized = normalizeToolPathname(pathname);
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
