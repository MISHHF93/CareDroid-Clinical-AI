/**
 * Shared PR6 audit constants (COPD GOLD Tier-B chat-assisted).
 */

import { PR6_CALCULATOR_REGISTRY_IDS } from './clinicalCatalogWiring';
import { copdGoldChatConfig } from './chatAssistedCalculators/copdGold';

export const PR6_HUB_PATH = '/tools/calculators';

export const PR6_TOOL_IDS = Object.freeze([...PR6_CALCULATOR_REGISTRY_IDS]);

export const PR6_CHAT_ASSISTED_CONFIGS = Object.freeze([copdGoldChatConfig]);

/** Product-required NLU aliases (space-separated) → registry id */
export const PR6_REQUIRED_NLU_ALIAS_PAIRS = Object.freeze([
  ['gold copd', 'copd-gold'],
  ['copd assessment', 'copd-gold'],
  ['copd risk', 'copd-gold'],
  ['gold classification', 'copd-gold'],
]);

/** Hyphenated discovery / slug aliases → canonical registry id */
export const PR6_DISCOVERY_ALIAS_PAIRS = Object.freeze([
  ['copd-gold', 'copd-gold'],
  ['gold-copd', 'copd-gold'],
  ['copd-assessment', 'copd-gold'],
  ['copd-risk', 'copd-gold'],
  ['gold-classification', 'copd-gold'],
]);

/** [canonicalId, catalog search query] */
export const PR6_CATALOG_SEARCH_QUERIES = Object.freeze([['copd-gold', 'copd gold']]);

export const PR6_BACKEND_DISAMBIGUATION_HELPERS = Object.freeze(['preferCopdGold']);

export const PR6_ALL_ALIAS_PAIRS = Object.freeze([
  ...PR6_REQUIRED_NLU_ALIAS_PAIRS,
  ...PR6_DISCOVERY_ALIAS_PAIRS,
]);

export { catalogRowsMatchingQuery } from '../utils/catalogSearch';
