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
import {
  getCalculatorRouteBySlug,
  isKnownToolAreaPath,
  isRegisteredCalculatorSlug,
  matchCalculatorRoute,
} from '../routes/clinicalToolRoutes';
import { TOOL_LAUNCH_PATHS } from '../data/clinicalToolIdContract';
import {
  getPlatformEntitlementContext,
} from '../data/assetEntitlements';
import { trackRoleAssetUsage, trackRoleWorkflowLaunch } from '../services/roleIntelligenceTelemetry';

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
    return {
      mode: 'calculator-route',
      pathname: calcMatch.path,
      search: '',
      registryId: launch.registryId || registryId,
      launch,
      shouldSeedChat: false,
    };
  }

  const calculatorSlug = inventoryRecord?.calculatorSlug || reg?.initialCalc;
  if (calculatorSlug && isRegisteredCalculatorSlug(calculatorSlug)) {
    const def = getCalculatorRouteBySlug(calculatorSlug);
    if (def) {
      return {
        mode: 'calculator-route',
        pathname: def.path,
        search: '',
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
      pathname: '/assistant',
      search: '',
      registryId: launch.registryId || registryId,
      launch,
      shouldSeedChat: true,
    };
  }

  if (navPath && isKnownToolAreaPath(navPath)) {
    return {
      mode: 'tool-page',
      pathname: navPath,
      search: '',
      registryId,
      launch,
      shouldSeedChat: false,
    };
  }

  if (calculatorSlug && isCalculatorsHubPath(launchPath)) {
    return {
      mode: 'calculator-hub',
      pathname: TOOL_LAUNCH_PATHS.calculatorsHub,
      search: `?calc=${encodeURIComponent(calculatorSlug)}`,
      registryId,
      launch,
      shouldSeedChat: false,
    };
  }

  if (inventoryRecord?.fallbackRoute || reg?.path) {
    return {
      mode: 'fallback',
      pathname: inventoryRecord?.fallbackRoute || reg.path,
      search: '',
      registryId,
      launch,
      shouldSeedChat: false,
    };
  }

  return {
    mode: 'fallback',
    pathname: TOOL_LAUNCH_PATHS.toolsCatalog,
    search: '',
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
    context?.user?.role || context?.account?.role || context?.membership?.role || context?.role || 'student';
  const access = resolveAssetAccessState(
    { ...tool, id: registryId, canonicalInventoryId: tool.canonicalInventoryId || registryId },
    context,
    userRole
  );
  return {
    ...access,
    registryId,
    allowed: [
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
        pathname: TOOL_LAUNCH_PATHS.toolsOverview,
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

  navigate(
    { pathname: plan.pathname, search: plan.search || '' },
    { replace, state }
  );

  return plan;
}
