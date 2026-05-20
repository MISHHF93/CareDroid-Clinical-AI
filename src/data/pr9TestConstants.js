/**
 * Shared PR9 audit constants — trauma Tier-B chat tools (PECARN, NEXUS).
 */

import {
  pecarnHeadChatConfig,
  PECARN_HEAD_REQUIRED_NLU_ALIASES,
} from './chatAssistedCalculators/pecarnHead';
import {
  nexusCSpineChatConfig,
  NEXUS_CSPINE_REQUIRED_NLU_ALIASES,
} from './chatAssistedCalculators/nexusCSpine';
import { PR9_CALCULATOR_REGISTRY_IDS } from './clinicalCatalogWiring';

function aliasPairsForTool(aliases, registryId) {
  return aliases.map((alias) => [alias, registryId]);
}

export const PR9_HUB_PATH = '/tools/calculators';

export const PR9_TOOL_IDS = Object.freeze([...PR9_CALCULATOR_REGISTRY_IDS]);

export const PR9_CHAT_CONFIGS = Object.freeze([pecarnHeadChatConfig, nexusCSpineChatConfig]);

export const PR9_CHAT_CONFIG_BY_ID = Object.freeze(
  Object.fromEntries(PR9_CHAT_CONFIGS.map((cfg) => [cfg.toolId, cfg]))
);

export const PR9_REQUIRED_NLU_ALIAS_PAIRS = Object.freeze([
  ...aliasPairsForTool(PECARN_HEAD_REQUIRED_NLU_ALIASES, 'pecarn-head'),
  ...aliasPairsForTool(NEXUS_CSPINE_REQUIRED_NLU_ALIASES, 'nexus-cspine'),
]);

export const PR9_NLU_ALIAS_PAIRS = Object.freeze([
  ['pecarn head injury rule', 'pecarn-head'],
  ['pediatric head injury pecarn', 'pecarn-head'],
  ['child head trauma imaging rule', 'pecarn-head'],
  ['nexus c-spine rule', 'nexus-cspine'],
  ['cervical spine nexus', 'nexus-cspine'],
]);

export const PR9_DISCOVERY_ALIAS_PAIRS = Object.freeze([
  ['pecarn-head-injury', 'pecarn-head'],
  ['pediatric-head-ct-rule', 'pecarn-head'],
  ['child-head-trauma-ct', 'pecarn-head'],
  ['nexus-c-spine-rule', 'nexus-cspine'],
  ['cervical-spine-nexus', 'nexus-cspine'],
  ['nexus-criteria', 'nexus-cspine'],
]);

export const PR9_ALL_ALIAS_PAIRS = Object.freeze([
  ...PR9_NLU_ALIAS_PAIRS,
  ...PR9_DISCOVERY_ALIAS_PAIRS,
]);

export const PR9_HUB_ROUTE_BY_REGISTRY_ID = Object.freeze(
  Object.fromEntries(PR9_TOOL_IDS.map((rid) => [rid, PR9_HUB_PATH]))
);

export const PR9_CATALOG_SEARCH_QUERIES = Object.freeze([
  ['pecarn-head', 'pecarn head'],
  ['nexus-cspine', 'nexus c spine'],
]);
