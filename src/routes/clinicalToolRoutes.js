/**
 * Single source for clinical tool SPA paths (App.jsx + deep-link audits).
 * Does not replace react-router — supplies path definitions and validation helpers.
 */

import {
  CATALOG_UNKNOWN_TOOL_LAUNCH,
  resolveCatalogLaunch,
  resolveNavigationPathForLaunch,
  resolveRegistryId,
} from '../data/clinicalCatalogWiring';
import { getRegistryToolNavigation } from '../navigation/registryToolLaunch';
import { TOOL_LAUNCH_PATHS } from '../data/clinicalToolIdContract';
import { getCanonicalToolInventory, getFrontendVisibleToolInventory } from '../data/toolInventory';

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
  getCanonicalToolInventory()
    .filter((tool) => tool.calculatorSlug && tool.route)
    .map((tool) => ({
      path: tool.route,
      calculatorSlug: tool.calculatorSlug,
      name: tool.label,
    }))
    .sort((a, b) => b.path.length - a.path.length)
);

export const LEGACY_CALCULATOR_ROUTE_ALIASES = Object.freeze([
  { path: '/tools/calculator/sofa', to: '/tools/calculators/sofa' },
  { path: '/tools/calculator/gfr', to: '/tools/calculators/gfr' },
  { path: '/tools/calculator/bmi', to: '/tools/calculators/bmi' },
  { path: '/tools/calculator/chads2vasc', to: '/tools/calculators/chads2vasc' },
]);

/** Registry tool paths under /tools and /fleet (includes hub + fleet pages). */
export const REGISTRY_TOOL_PATHS = Object.freeze(
  [...new Set(getFrontendVisibleToolInventory().map((t) => t.route).filter(Boolean))].sort()
);

/** All tool-area paths that should resolve to a real screen (not dashboard fallback). */
export const KNOWN_TOOL_AREA_PATHS = Object.freeze([
  ...TOOLS_OVERVIEW_PATHS,
  ...REGISTRY_TOOL_PATHS,
]);

const calculatorPathSet = new Set(CALCULATOR_ROUTE_DEFS.map((d) => d.path));
const calculatorSlugSet = new Set(CALCULATOR_ROUTE_DEFS.map((d) => d.calculatorSlug));
const calculatorRouteByPath = new Map(CALCULATOR_ROUTE_DEFS.map((d) => [d.path, d]));
const calculatorRouteBySlug = new Map(CALCULATOR_ROUTE_DEFS.map((d) => [d.calculatorSlug, d]));
const knownPathSet = new Set(KNOWN_TOOL_AREA_PATHS);

/** Production paths required for release validation (audits, smoke checks). */
export const REQUIRED_PRODUCTION_TOOL_PATHS = Object.freeze([
  TOOL_LAUNCH_PATHS.toolsCatalog,
  TOOL_LAUNCH_PATHS.calculatorsHub,
  TOOL_LAUNCH_PATHS.liveTrackingMap,
  TOOL_LAUNCH_PATHS.hospitalMap,
  TOOL_LAUNCH_PATHS.medicalIot,
  '/tools/calculators/qsofa',
  '/tools/calculators/news2',
  '/tools/calculators/apache-ii',
  '/tools/calculators/curb-65',
  '/tools/calculators/gcs',
  '/tools/calculators/mews',
  '/tools/calculators/revised-trauma-score',
  '/tools/calculators/pews',
  '/tools/calculators/child-pugh',
  '/tools/calculators/has-bled',
  '/tools/calculators/meld',
  '/tools/calculators/meld-na',
  '/tools/calculators/timi-ua-nstemi',
  TOOL_LAUNCH_PATHS.fleetMap,
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
  return calculatorRouteByPath.get(normalized) ?? null;
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
 * @param {string} slug
 * @returns {{ path: string, calculatorSlug: string } | null}
 */
export function getCalculatorRouteBySlug(slug) {
  return calculatorRouteBySlug.get(slug) ?? null;
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

  // Unknown tool-shaped slugs: show ToolNotFound on the hub, do not bounce to dashboard.
  if (
    !registryId &&
    launch.path === CATALOG_UNKNOWN_TOOL_LAUNCH.path &&
    !launch.registryId
  ) {
    return null;
  }

  const plan = getRegistryToolNavigation(subpathSlug);
  if (plan.mode === 'calculator-route' && normalizeToolPathname(plan.pathname) !== normalized) {
    return { pathname: plan.pathname, search: plan.search || undefined };
  }
  if (plan.mode === 'chat-assisted') {
    return {
      pathname: '/assistant',
      search: `?tool=${encodeURIComponent(plan.registryId || subpathSlug)}`,
    };
  }
  if (plan.mode === 'tool-page' && normalizeToolPathname(plan.pathname) !== normalized) {
    return { pathname: plan.pathname, search: plan.search || undefined };
  }

  const canonicalPath = launch.path ? normalizeToolPathname(launch.path) : null;
  if (canonicalPath && canonicalPath !== normalized) {
    if (matchCalculatorRoute(canonicalPath)) {
      return { pathname: canonicalPath };
    }
    const navPath = resolveNavigationPathForLaunch(launch);
    if (navPath && normalizeToolPathname(navPath) !== normalized) {
      if (['/home', '/assistant', '/dashboard', '/chat'].includes(navPath) && launch.chatSeed) {
        return {
          pathname: '/assistant',
          search: `?tool=${encodeURIComponent(registryId || subpathSlug)}`,
        };
      }
      return { pathname: navPath };
    }
    if (canonicalPath === TOOL_LAUNCH_PATHS.calculatorsHub) {
      if (isRegisteredCalculatorSlug(subpathSlug)) {
        return { pathname: canonicalPath, search: `?calc=${encodeURIComponent(subpathSlug)}` };
      }
      if (plan.mode === 'calculator-hub') {
        return { pathname: plan.pathname, search: plan.search || undefined };
      }
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
