/**
 * Central navigation for sidebar / deep links / legacy ?tool= params.
 * Every toolRegistry entry must resolve to a calculator route, tool page, or chat-assisted flow.
 */

import { toolRegistryById } from '../data/toolRegistry';
import {
  isCalculatorsHubPath,
  resolveCatalogLaunch,
  resolveNavigationPathForLaunch,
  resolveRegistryId,
} from '../data/clinicalCatalogWiring';
import { resolveToolInventoryRecord, TOOL_LAUNCH_TYPES } from '../data/toolInventory';
import {
  ASSET_ACCESS_STATES,
  resolveAssetAccessState,
} from '../data/assetAccess';
import { isToolAllowedForCompiledProfile } from '../config/userProfileCompiler';
import {
  getCalculatorRouteBySlug,
  isKnownToolAreaPath,
  isRegisteredCalculatorSlug,
  matchCalculatorRoute,
} from '../routes/clinicalToolRoutes';
import { TOOL_LAUNCH_PATHS } from '../data/clinicalToolIdContract';
import { CANONICAL_ROUTES } from '../config/routes.config';
import {
  getPlatformEntitlementContext,
} from '../data/assetEntitlements';
import { trackRoleAssetUsage, trackRoleWorkflowLaunch } from '../services/roleIntelligenceTelemetry';
import { navigateProfileAware } from './profileRouteLaunch';
import { remapRegistryNavigationForRole } from '../services/unifiedClinicalToolsBridge';
import {
  canAccessEmergencyRoute,
  normalizeEmergencyRole,
} from '../config/emergencyRolePermissions';

/**
 * @typedef {'calculator-route'|'chat-assisted'|'tool-page'|'calculator-hub'|'fallback'} RegistryToolLaunchMode
 */

/**
 * @typedef {object} RegistryToolNavigationPlan
 * @property {RegistryToolLaunchMode} mode
 * @property {string} pathname
 * @property {string} search
 * @property {string|null} registryId
 * @property {ReturnType<typeof resolveCatalogLaunch>} launch
 * @property {boolean} shouldSeedChat
 */

function buildSearch(params) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) searchParams.set(key, value);
  }
  const search = searchParams.toString();
  return search ? `?${search}` : '';
}

function slugFromPath(pathname, prefix) {
  if (!pathname?.startsWith(prefix)) return '';
  return pathname.slice(prefix.length).split('/').filter(Boolean)[0] || '';
}

function resolveEmergencyToolTarget(pathname, registryId, inventoryRecord) {
  if (!pathname) {
    return { pathname: CANONICAL_ROUTES.emergencyTools, search: buildSearch({ source: 'tools' }) };
  }

  if (pathname === TOOL_LAUNCH_PATHS.toolsCatalog) {
    return {
      pathname: CANONICAL_ROUTES.emergencyTools,
      search: buildSearch({ source: 'catalog', filter: 'all' }),
    };
  }

  if (pathname === TOOL_LAUNCH_PATHS.calculatorsHub) {
    return {
      pathname: CANONICAL_ROUTES.emergencyTools,
      search: buildSearch({ source: 'calculators', filter: 'calculator' }),
    };
  }

  if (pathname.startsWith(`${TOOL_LAUNCH_PATHS.calculatorsHub}/`)) {
    const slug = slugFromPath(pathname, `${TOOL_LAUNCH_PATHS.calculatorsHub}/`);
    return {
      pathname: CANONICAL_ROUTES.emergencyTools,
      search: buildSearch({ source: 'calculators', filter: 'calculator', q: slug, open: slug }),
    };
  }

  if (pathname.startsWith('/tools/')) {
    return {
      pathname: CANONICAL_ROUTES.emergencyTools,
      search: buildSearch({
        source: 'tools',
        filter: inventoryRecord?.category === 'Calculator' ? 'calculator' : 'clinical-tools',
        q: registryId || slugFromPath(pathname, '/tools/'),
      }),
    };
  }

  if (
    pathname.startsWith('/fleet/') ||
    ['/operations', '/live-map', '/hospital-map', '/medical-iot', '/devices'].includes(pathname)
  ) {
    return {
      pathname: CANONICAL_ROUTES.emergencyTools,
      search: buildSearch({ source: 'operations', filter: 'operations', q: registryId }),
    };
  }

  return {
    pathname: CANONICAL_ROUTES.emergencyTools,
    search: buildSearch({ source: 'tools', q: registryId }),
  };
}

/**
 * Resolve how to open a registry or NLU tool id in the SPA.
 * @param {string} toolId
 * @returns {RegistryToolNavigationPlan}
 */
export function getRegistryToolNavigation(toolId) {
  const launch = resolveCatalogLaunch(toolId);
  const inventoryRecord = resolveToolInventoryRecord(toolId);
  const registryId = launch.registryId || resolveRegistryId(toolId) || toolId;
  const reg = toolRegistryById[registryId];
  const navPath = inventoryRecord?.navigationPath || resolveNavigationPathForLaunch(launch);
  const launchPath = inventoryRecord?.route || launch.path;

  const calcMatch = launchPath ? matchCalculatorRoute(launchPath) : null;
  if (calcMatch) {
    const target = resolveEmergencyToolTarget(calcMatch.path, registryId, inventoryRecord);
    return {
      mode: 'calculator-route',
      pathname: target.pathname,
      search: target.search,
      registryId: launch.registryId || registryId,
      launch,
      shouldSeedChat: false,
    };
  }

  const calculatorSlug = inventoryRecord?.calculatorSlug || reg?.initialCalc;
  if (calculatorSlug && isRegisteredCalculatorSlug(calculatorSlug)) {
    const def = getCalculatorRouteBySlug(calculatorSlug);
    if (def) {
      const target = resolveEmergencyToolTarget(def.path, registryId, inventoryRecord);
      return {
        mode: 'calculator-route',
        pathname: target.pathname,
        search: target.search,
        registryId,
        launch,
        shouldSeedChat: false,
      };
    }
  }

  const pointsToAssistantSurface = ['/home', '/assistant', '/dashboard', '/chat'].includes(navPath);
  if (
    (pointsToAssistantSurface && launch.chatSeed) ||
    (inventoryRecord?.launchType === TOOL_LAUNCH_TYPES.CHAT_ASSISTED && inventoryRecord.chatSeed)
  ) {
    return {
      mode: 'chat-assisted',
      pathname: CANONICAL_ROUTES.emergencyCopilot,
      search: '',
      registryId: launch.registryId || registryId,
      launch,
      shouldSeedChat: true,
    };
  }

  if (navPath && isKnownToolAreaPath(navPath)) {
    const target = resolveEmergencyToolTarget(navPath, registryId, inventoryRecord);
    return {
      mode: 'tool-page',
      pathname: target.pathname,
      search: target.search,
      registryId,
      launch,
      shouldSeedChat: false,
    };
  }

  if (calculatorSlug && isCalculatorsHubPath(launchPath)) {
    return {
      mode: 'calculator-hub',
      pathname: CANONICAL_ROUTES.emergencyTools,
      search: buildSearch({
        source: 'calculators',
        filter: 'calculator',
        q: calculatorSlug,
        open: calculatorSlug,
      }),
      registryId,
      launch,
      shouldSeedChat: false,
    };
  }

  if (inventoryRecord?.fallbackRoute || reg?.path) {
    const fallbackPath = inventoryRecord?.fallbackRoute || reg.path;
    const target = resolveEmergencyToolTarget(fallbackPath, registryId, inventoryRecord);
    return {
      mode: 'fallback',
      pathname: target.pathname,
      search: target.search,
      registryId,
      launch,
      shouldSeedChat: false,
    };
  }

  return {
    mode: 'fallback',
    pathname: CANONICAL_ROUTES.emergencyTools,
    search: buildSearch({ source: 'catalog', filter: 'all' }),
    registryId: launch.registryId || registryId,
    launch,
    shouldSeedChat: Boolean(launch.chatSeed),
  };
}

/**
 * Navigate + optional chat seed for a registry tool (sidebar, App shell, dashboard legacy URLs).
 * @param {string} toolId
 * @param {{
 *   navigate: (to: import('react-router-dom').To, options?: { replace?: boolean; state?: unknown }) => void;
 *   addMessage?: (content: string, role: string) => void;
 *   selectTool?: (id: string) => void;
 *   setActiveTool?: (id: string | null) => void;
 *   recordToolAccess?: (id: string) => void;
 *   replace?: boolean;
 *   state?: unknown;
 *   roleIntelligenceProfile?: Record<string, unknown>;
 * }} handlers
 * @returns {RegistryToolNavigationPlan}
 */
export function isRegistryToolLaunchAllowed(toolId, context) {
  return resolveRegistryToolLaunchAccess(toolId, context).allowed;
}

export function resolveRegistryToolLaunchAccess(toolId, context = getPlatformEntitlementContext()) {
  const registryId = resolveRegistryId(toolId) || toolId;
  const inventoryRecord = resolveToolInventoryRecord(registryId) || resolveToolInventoryRecord(toolId);
  const tool = inventoryRecord || { id: registryId, canonicalInventoryId: registryId };
  const userRole =
    context?.roleProfile?.id ||
    context?.membership?.roleProfileId ||
    context?.saasRole ||
    context?.user?.role ||
    context?.account?.role ||
    context?.membership?.role ||
    context?.role ||
    'student';
  const access = resolveAssetAccessState(
    { ...tool, id: registryId, canonicalInventoryId: tool.canonicalInventoryId || registryId },
    context,
    userRole
  );
  const compilerAllowed = isToolAllowedForCompiledProfile(
    registryId,
    tool,
    userRole,
    context,
  );
  return {
    ...access,
    registryId,
    allowed:
      compilerAllowed &&
      [
        ASSET_ACCESS_STATES.ALLOWED,
        ASSET_ACCESS_STATES.BETA,
        ASSET_ACCESS_STATES.EXPERIMENTAL,
        ASSET_ACCESS_STATES.DEMO_ONLY,
      ].includes(access.accessState),
  };
}

export function applyRegistryToolLaunch(toolId, handlers) {
  const hasExplicitContext = Object.prototype.hasOwnProperty.call(handlers, 'context');
  const launchAccess = resolveRegistryToolLaunchAccess(
    toolId,
    hasExplicitContext ? handlers.context : handlers.entitlementContext
  );
  if (!launchAccess.allowed) {
    handlers.navigate?.(
      {
        pathname: CANONICAL_ROUTES.emergencyTools,
        search: `?entitlement=denied&reason=${encodeURIComponent(launchAccess.accessState)}`,
      },
      { replace: true },
    );
    return getRegistryToolNavigation(toolId);
  }
  const plan = getRegistryToolNavigation(toolId);
  const {
    navigate,
    addMessage,
    selectTool,
    setActiveTool,
    recordToolAccess,
    replace = true,
    state,
  } = handlers;

  if (plan.registryId) {
    recordToolAccess?.(plan.registryId);
    selectTool?.(plan.registryId);
    setActiveTool?.(plan.registryId);
    trackRoleAssetUsage(plan, {
      profile: handlers.roleIntelligenceProfile,
      source: 'registry-tool-launch',
    });
    if (/workflow/i.test(`${plan.mode} ${plan.pathname} ${plan.registryId}`)) {
      trackRoleWorkflowLaunch({
        profile: handlers.roleIntelligenceProfile,
        workflowId: plan.registryId,
        route: plan.pathname,
        source: 'registry-tool-launch',
      });
    }
  }

  if (plan.shouldSeedChat && plan.launch?.chatSeed) {
    addMessage?.(plan.launch.chatSeed, 'user');
  }

  const saasRole =
    handlers.context?.roleProfile?.id ||
    handlers.context?.membership?.roleProfileId ||
    handlers.context?.saasRole ||
    handlers.entitlementContext?.roleProfile?.id ||
    handlers.entitlementContext?.membership?.roleProfileId ||
    handlers.entitlementContext?.saasRole;

  const emergencyRoleId =
    handlers.context?.emergencyRoleId ||
    handlers.entitlementContext?.emergencyRoleId ||
    normalizeEmergencyRole(
      handlers.context?.user?.role ||
        handlers.entitlementContext?.user?.role ||
        saasRole,
    );
  const remapped = remapRegistryNavigationForRole(
    { pathname: plan.pathname, search: plan.search || '' },
    {
      emergencyRoleId,
      canAccessToolsRoute: canAccessEmergencyRoute(emergencyRoleId, CANONICAL_ROUTES.emergencyTools),
    },
  );

  navigateProfileAware(
    navigate,
    { pathname: remapped.pathname, search: remapped.search || '' },
    { replace, state, saasRole, context: handlers.context || handlers.entitlementContext },
  );

  return plan;
}
