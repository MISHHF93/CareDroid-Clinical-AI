/**
 * PERC Tier-B chat-assisted audit constants (PR2).
 */

export const PERC_REGISTRY_ID = 'perc';

export const PERC_HUB_PATH = '/tools/calculators';

/** Product-required NLU / catalog phrases → registry id */
export const PERC_REQUIRED_NLU_ALIAS_PAIRS = Object.freeze([
  ['perc', PERC_REGISTRY_ID],
  ['pulmonary embolism rule out', PERC_REGISTRY_ID],
  ['pe rule out', PERC_REGISTRY_ID],
  ['perc rule', PERC_REGISTRY_ID],
]);

/** Hyphenated discovery / slug aliases → canonical registry id */
export const PERC_DISCOVERY_ALIAS_PAIRS = Object.freeze([
  ['perc-rule', PERC_REGISTRY_ID],
  ['pe-rule-out', PERC_REGISTRY_ID],
  ['pulmonary-embolism-rule-out', PERC_REGISTRY_ID],
]);

export const PERC_CATALOG_SEARCH_QUERIES = Object.freeze([
  [PERC_REGISTRY_ID, 'perc rule'],
  [PERC_REGISTRY_ID, 'pe rule out'],
  [PERC_REGISTRY_ID, 'pulmonary embolism rule out'],
  [PERC_REGISTRY_ID, 'perc'],
]);

export const PERC_ALL_ALIAS_PAIRS = Object.freeze([
  ...PERC_REQUIRED_NLU_ALIAS_PAIRS,
  ...PERC_DISCOVERY_ALIAS_PAIRS,
]);
