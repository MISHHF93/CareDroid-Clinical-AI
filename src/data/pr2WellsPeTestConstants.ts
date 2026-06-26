/**
 * Wells PE Tier-B chat-assisted audit constants (PR2).
 */

import { PR2_TIER_B_CHAT_CALCULATOR_IDS } from './clinicalToolIdContract';

export const WELLS_PE_REGISTRY_ID = 'wells-pe';

export const WELLS_PE_HUB_PATH = '/tools/calculators';

/** Product-required NLU / catalog phrases → registry id */
export const WELLS_PE_REQUIRED_NLU_ALIAS_PAIRS = Object.freeze([
  ['wells pe', WELLS_PE_REGISTRY_ID],
  ['pulmonary embolism wells', WELLS_PE_REGISTRY_ID],
  ['pe score', WELLS_PE_REGISTRY_ID],
  ['wells pulmonary embolism', WELLS_PE_REGISTRY_ID],
]);

/** Hyphenated discovery / slug aliases → canonical registry id */
export const WELLS_PE_DISCOVERY_ALIAS_PAIRS = Object.freeze([
  ['wells-pe-score', WELLS_PE_REGISTRY_ID],
  ['pulmonary-embolism-wells', WELLS_PE_REGISTRY_ID],
  ['wells-pulmonary-embolism', WELLS_PE_REGISTRY_ID],
  ['pe-score', WELLS_PE_REGISTRY_ID],
]);

export const WELLS_PE_CATALOG_SEARCH_QUERIES = Object.freeze([
  [WELLS_PE_REGISTRY_ID, 'wells pe'],
  [WELLS_PE_REGISTRY_ID, 'pulmonary embolism wells'],
  [WELLS_PE_REGISTRY_ID, 'pe score'],
  [WELLS_PE_REGISTRY_ID, 'wells pulmonary'],
]);

export const WELLS_PE_ALL_ALIAS_PAIRS = Object.freeze([
  ...WELLS_PE_REQUIRED_NLU_ALIAS_PAIRS,
  ...WELLS_PE_DISCOVERY_ALIAS_PAIRS,
]);

export const WELLS_PE_TIER_B_IDS = Object.freeze(
  PR2_TIER_B_CHAT_CALCULATOR_IDS.filter((id) => id === WELLS_PE_REGISTRY_ID)
);
