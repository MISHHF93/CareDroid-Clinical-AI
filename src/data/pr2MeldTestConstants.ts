/**
 * Shared MELD / MELD-Na audit constants (Tier-A PR2).
 */

import { PR2_MELD_CALCULATOR_REGISTRY_IDS } from './clinicalToolIdContract';

export const MELD_TOOL_IDS = Object.freeze([...PR2_MELD_CALCULATOR_REGISTRY_IDS]);

export const MELD_HUB_PATH = '/tools/calculators';

export const MELD_ROUTE_BY_REGISTRY_ID = Object.freeze(
  Object.fromEntries(MELD_TOOL_IDS.map((id) => [id, `${MELD_HUB_PATH}/${id}`])),
);

export const MELD_CALC_QUERY_BY_REGISTRY_ID = Object.freeze(
  Object.fromEntries(MELD_TOOL_IDS.map((id) => [id, `${MELD_HUB_PATH}?calc=${id}`])),
);

/** Product-required NLU / catalog aliases (space-separated) → registry id */
/** Non-canonical NLU / catalog phrases → registry id */
export const MELD_REQUIRED_NLU_ALIAS_PAIRS = Object.freeze([
  ['meld score', 'meld'],
  ['meld na', 'meld-na'],
  ['liver transplant score', 'meld-na'],
  ['end stage liver disease score', 'meld'],
]);

/** Hyphenated discovery / slug aliases → canonical registry id */
export const MELD_DISCOVERY_ALIAS_PAIRS = Object.freeze([
  ['meld-score', 'meld'],
  ['liver-transplant-score', 'meld-na'],
  ['end-stage-liver-disease-score', 'meld'],
  ['meld-sodium', 'meld-na'],
]);

export const MELD_CATALOG_SEARCH_QUERIES = Object.freeze([
  ['meld', 'end stage liver'],
  ['meld', 'meld score'],
  ['meld-na', 'liver transplant'],
  ['meld-na', 'meld-na'],
]);

export const MELD_ALL_ALIAS_PAIRS = Object.freeze([
  ...MELD_REQUIRED_NLU_ALIAS_PAIRS,
  ...MELD_DISCOVERY_ALIAS_PAIRS,
]);
