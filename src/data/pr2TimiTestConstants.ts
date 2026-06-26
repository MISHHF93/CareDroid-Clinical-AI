/**
 * Shared TIMI UA/NSTEMI audit constants (Tier-A PR2).
 */

import { PR2_TIMI_CALCULATOR_REGISTRY_IDS } from './clinicalToolIdContract';

export const TIMI_TOOL_IDS = Object.freeze([...PR2_TIMI_CALCULATOR_REGISTRY_IDS]);

export const TIMI_REGISTRY_ID = 'timi-ua-nstemi';

export const TIMI_HUB_PATH = '/tools/calculators';

export const TIMI_ROUTE = `${TIMI_HUB_PATH}/${TIMI_REGISTRY_ID}`;

export const TIMI_CALC_QUERY = `${TIMI_HUB_PATH}?calc=${TIMI_REGISTRY_ID}`;

/** Non-canonical NLU / catalog phrases → registry id */
export const TIMI_REQUIRED_NLU_ALIAS_PAIRS = Object.freeze([
  ['timi', TIMI_REGISTRY_ID],
  ['timi score', TIMI_REGISTRY_ID],
  ['timi acs', TIMI_REGISTRY_ID],
  ['timi nstemi', TIMI_REGISTRY_ID],
  ['timi unstable angina', TIMI_REGISTRY_ID],
]);

/** Hyphenated discovery / slug aliases → canonical registry id */
export const TIMI_DISCOVERY_ALIAS_PAIRS = Object.freeze([
  ['timi-score', TIMI_REGISTRY_ID],
  ['timi-acs', TIMI_REGISTRY_ID],
  ['timi-nstemi', TIMI_REGISTRY_ID],
  ['timi-unstable-angina', TIMI_REGISTRY_ID],
]);

export const TIMI_CATALOG_SEARCH_QUERIES = Object.freeze([
  [TIMI_REGISTRY_ID, 'timi score'],
  [TIMI_REGISTRY_ID, 'timi acs'],
  [TIMI_REGISTRY_ID, 'timi nstemi'],
  [TIMI_REGISTRY_ID, 'unstable angina'],
]);

export const TIMI_ALL_ALIAS_PAIRS = Object.freeze([
  ...TIMI_REQUIRED_NLU_ALIAS_PAIRS,
  ...TIMI_DISCOVERY_ALIAS_PAIRS,
]);
