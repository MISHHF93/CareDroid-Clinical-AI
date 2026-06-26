/**
 * Shared PR3 audit constants for coverage and consistency tests.
 */

import { graceAcsChatConfig, GRACE_ACS_REQUIRED_NLU_ALIASES } from './chatAssistedCalculators/graceAcs';
import { nihssChatConfig, NIHSS_REQUIRED_NLU_ALIASES } from './chatAssistedCalculators/nihss';
import {
  canadianCSpineChatConfig,
  CANADIAN_C_SPINE_REQUIRED_NLU_ALIASES,
} from './chatAssistedCalculators/canadianCSpine';
import { ottawaAnkleChatConfig, OTTAWA_ANKLE_REQUIRED_NLU_ALIASES } from './chatAssistedCalculators/ottawaAnkle';
import { PR3_CALCULATOR_REGISTRY_IDS } from './clinicalCatalogWiring';

function aliasPairsForTool(aliases, registryId) {
  return aliases.map((alias) => [alias, registryId]);
}

export const PR3_HUB_PATH = '/tools/calculators';

export const PR3_TOOL_IDS = Object.freeze([...PR3_CALCULATOR_REGISTRY_IDS]);

export const PR3_EMPTY_LAUNCH = Object.freeze({
  path: null,
  registryId: null,
  chatSeed: null,
  orchestratorTool: null,
  openLabel: 'Try in chat',
});

export const PR3_CHAT_CONFIGS = Object.freeze([
  graceAcsChatConfig,
  nihssChatConfig,
  canadianCSpineChatConfig,
  ottawaAnkleChatConfig,
]);

export const PR3_CHAT_CONFIG_BY_ID = Object.freeze(
  Object.fromEntries(PR3_CHAT_CONFIGS.map((cfg) => [cfg.toolId, cfg]))
);

/** Product-required NLU / catalog phrases → registry id (derived from chat config modules). */
export const PR3_REQUIRED_NLU_ALIAS_PAIRS = Object.freeze([
  ...aliasPairsForTool(GRACE_ACS_REQUIRED_NLU_ALIASES, 'grace-acs'),
  ...aliasPairsForTool(NIHSS_REQUIRED_NLU_ALIASES, 'nihss'),
  ...aliasPairsForTool(CANADIAN_C_SPINE_REQUIRED_NLU_ALIASES, 'canadian-c-spine'),
  ...aliasPairsForTool(OTTAWA_ANKLE_REQUIRED_NLU_ALIASES, 'ottawa-ankle'),
]);

/** Space-separated NLU alias → canonical registry id */
export const PR3_NLU_ALIAS_PAIRS = Object.freeze([
  ['grace', 'grace-acs'],
  ['grace score', 'grace-acs'],
  ['grace acs', 'grace-acs'],
  ['grace acs risk', 'grace-acs'],
  ['acs mortality risk', 'grace-acs'],
  ['acute coronary syndrome risk', 'grace-acs'],
  ['global registry acute coronary events', 'grace-acs'],
  ['nihss', 'nihss'],
  ['nih stroke scale', 'nihss'],
  ['national institutes of health stroke scale', 'nihss'],
  ['stroke scale', 'nihss'],
  ['stroke severity score', 'nihss'],
  ['canadian c spine', 'canadian-c-spine'],
  ['canadian c-spine rule', 'canadian-c-spine'],
  ['c spine rule', 'canadian-c-spine'],
  ['cervical spine rule', 'canadian-c-spine'],
  ['neck trauma imaging rule', 'canadian-c-spine'],
  ['ottawa ankle', 'ottawa-ankle'],
  ['ottawa ankle rule', 'ottawa-ankle'],
  ['ankle xray rule', 'ottawa-ankle'],
  ['ankle injury imaging', 'ottawa-ankle'],
  ['foot xray rule', 'ottawa-ankle'],
]);

/** Hyphenated discovery / slug alias → canonical registry id */
export const PR3_DISCOVERY_ALIAS_PAIRS = Object.freeze([
  ['grace-score', 'grace-acs'],
  ['grace-acs-risk', 'grace-acs'],
  ['acs-mortality-risk', 'grace-acs'],
  ['acute-coronary-syndrome-risk', 'grace-acs'],
  ['nih-stroke-scale', 'nihss'],
  ['national-institutes-of-health-stroke-scale', 'nihss'],
  ['stroke-scale', 'nihss'],
  ['stroke-severity-score', 'nihss'],
  ['canadian-c-spine-rule', 'canadian-c-spine'],
  ['c-spine-rule', 'canadian-c-spine'],
  ['cervical-spine-rule', 'canadian-c-spine'],
  ['neck-trauma-imaging-rule', 'canadian-c-spine'],
  ['ottawa-ankle-rule', 'ottawa-ankle'],
  ['ankle-xray-rule', 'ottawa-ankle'],
  ['ankle-injury-imaging', 'ottawa-ankle'],
  ['foot-xray-rule', 'ottawa-ankle'],
]);

export const PR3_ALL_ALIAS_PAIRS = Object.freeze([
  ...PR3_NLU_ALIAS_PAIRS,
  ...PR3_DISCOVERY_ALIAS_PAIRS,
]);

/** Tier-B hub path for every PR3 registry id */
export const PR3_HUB_ROUTE_BY_REGISTRY_ID = Object.freeze(
  Object.fromEntries(PR3_TOOL_IDS.map((id) => [id, PR3_HUB_PATH]))
);

/** [canonicalId, catalog search query] */
export const PR3_CATALOG_SEARCH_QUERIES = Object.freeze([
  ['grace-acs', 'grace acs'],
  ['nihss', 'nih stroke'],
  ['canadian-c-spine', 'c-spine'],
  ['ottawa-ankle', 'ottawa ankle'],
]);

export { catalogRowsMatchingQuery } from '../utils/catalogSearch';
