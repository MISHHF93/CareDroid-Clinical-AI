/**
 * Shared PR-FLEET audit constants (fleet operations tools).
 * PR6 in this repo refers to COPD GOLD; fleet uses PR_FLEET_* to avoid collision.
 */

import {
  PR_FLEET_ALL_REGISTRY_IDS,
  PR_FLEET_TIER_A_REGISTRY_IDS,
  PR_FLEET_TIER_B_CHAT_REGISTRY_IDS,
} from './clinicalCatalogWiring';
import { dispatchAiChatConfig } from './chatAssistedFleet/dispatchAi';

export const PR_FLEET_HUB_PATH = '/tools/calculators';

export const PR_FLEET_TIER_A_IDS = Object.freeze([...PR_FLEET_TIER_A_REGISTRY_IDS]);

export const PR_FLEET_TIER_B_IDS = Object.freeze([...PR_FLEET_TIER_B_CHAT_REGISTRY_IDS]);

export const PR_FLEET_TOOL_IDS = Object.freeze([...PR_FLEET_ALL_REGISTRY_IDS]);

export const PR_FLEET_CHAT_ASSISTED_CONFIGS = Object.freeze([dispatchAiChatConfig]);

/** Product-required NLU aliases (space-separated) → registry id */
export const PR_FLEET_REQUIRED_NLU_ALIAS_PAIRS = Object.freeze([
  ['fleet command', 'fleet-command'],
  ['fleet dashboard', 'fleet-command'],
  ['predictive maintenance', 'predictive-maintenance'],
  ['maintenance assistant', 'predictive-maintenance'],
  ['route optimizer', 'route-optimizer'],
  ['route optimization', 'route-optimizer'],
  ['dispatch assistant', 'dispatch-ai'],
  ['vehicle dispatch', 'dispatch-ai'],
  ['fleet dispatch', 'dispatch-ai'],
]);

/** Hyphenated discovery / slug aliases → canonical registry id */
export const PR_FLEET_DISCOVERY_ALIAS_PAIRS = Object.freeze([
  ['fleet-command', 'fleet-command'],
  ['fleet-dashboard', 'fleet-command'],
  ['fleet-overview', 'fleet-command'],
  ['predictive-maintenance', 'predictive-maintenance'],
  ['maintenance-assistant', 'predictive-maintenance'],
  ['fleet-maintenance-risk', 'predictive-maintenance'],
  ['route-optimizer', 'route-optimizer'],
  ['route-optimization', 'route-optimizer'],
  ['fleet-route-planner', 'route-optimizer'],
  ['dispatch-ai', 'dispatch-ai'],
  ['dispatch', 'dispatch-ai'],
  ['dispatch-assistant', 'dispatch-ai'],
  ['vehicle-dispatch', 'dispatch-ai'],
  ['fleet-dispatch', 'dispatch-ai'],
  ['dispatch-intelligence', 'dispatch-ai'],
]);

/** [canonicalId, catalog search query] */
export const PR_FLEET_CATALOG_SEARCH_QUERIES = Object.freeze([
  ['fleet-command', 'fleet command'],
  ['predictive-maintenance', 'predictive maintenance'],
  ['route-optimizer', 'route optimization'],
  ['dispatch-ai', 'dispatch intelligence'],
]);

export const PR_FLEET_BACKEND_DISAMBIGUATION_HELPERS = Object.freeze([
  'preferFleetCommand',
  'preferPredictiveMaintenance',
  'preferRouteOptimizer',
  'preferDispatchAi',
]);

export const PR_FLEET_ALL_ALIAS_PAIRS = Object.freeze([
  ...PR_FLEET_REQUIRED_NLU_ALIAS_PAIRS,
  ...PR_FLEET_DISCOVERY_ALIAS_PAIRS,
]);

/**
 * @type {Record<string, {
 *   tier: 'A' | 'B',
 *   routePath: string,
 *   appComponent: string | null,
 *   chatOnlyForm: boolean,
 *   hubOnly: boolean,
 *   hubGroupId: string | null,
 *   backendHelper: string,
 *   catalogSearchQueries: readonly (readonly [string, string])[],
 *   chatSeedPattern: RegExp,
 *   panelTool: string | null,
 *   backendExecutable: boolean,
 * }>}
 */
export const PR_FLEET_TOOL_SPECS = Object.freeze({
  'fleet-command': {
    tier: 'A',
    routePath: '/fleet/command',
    appComponent: 'FleetDashboard',
    chatOnlyForm: false,
    hubOnly: false,
    hubGroupId: null,
    backendHelper: 'preferFleetCommand',
    catalogSearchQueries: PR_FLEET_CATALOG_SEARCH_QUERIES.filter(([id]) => id === 'fleet-command'),
    chatSeedPattern: /Do not auto-dispatch/i,
    panelTool: null,
    backendExecutable: false,
  },
  'predictive-maintenance': {
    tier: 'A',
    routePath: '/fleet/predictive-maintenance',
    appComponent: 'PredictiveMaintenance',
    chatOnlyForm: false,
    hubOnly: false,
    hubGroupId: null,
    backendHelper: 'preferPredictiveMaintenance',
    catalogSearchQueries: PR_FLEET_CATALOG_SEARCH_QUERIES.filter(
      ([id]) => id === 'predictive-maintenance'
    ),
    chatSeedPattern: /Do not auto-schedule/i,
    panelTool: null,
    backendExecutable: false,
  },
  'route-optimizer': {
    tier: 'A',
    routePath: '/fleet/route-optimizer',
    appComponent: 'RouteOptimizer',
    chatOnlyForm: false,
    hubOnly: false,
    hubGroupId: null,
    backendHelper: 'preferRouteOptimizer',
    catalogSearchQueries: PR_FLEET_CATALOG_SEARCH_QUERIES.filter(([id]) => id === 'route-optimizer'),
    chatSeedPattern: /Do not auto-dispatch/i,
    panelTool: null,
    backendExecutable: false,
  },
  'dispatch-ai': {
    tier: 'B',
    routePath: PR_FLEET_HUB_PATH,
    appComponent: null,
    chatOnlyForm: true,
    hubOnly: true,
    hubGroupId: 'fleet-dispatch',
    backendHelper: 'preferDispatchAi',
    catalogSearchQueries: PR_FLEET_CATALOG_SEARCH_QUERIES.filter(([id]) => id === 'dispatch-ai'),
    chatSeedPattern: /human dispatcher must approve/i,
    panelTool: 'calculators',
    backendExecutable: true,
  },
});

export { catalogRowsMatchingQuery } from '../utils/catalogSearch';
