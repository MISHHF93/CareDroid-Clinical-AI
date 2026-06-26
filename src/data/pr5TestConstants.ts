/**
 * Shared PR5 audit constants for coverage and consistency tests.
 */

import { PR5_CALCULATOR_REGISTRY_IDS } from './clinicalCatalogWiring';

export const PR5_HUB_PATH = '/tools/calculators';

export const PR5_TOOL_IDS = Object.freeze([...PR5_CALCULATOR_REGISTRY_IDS]);

export const PR5_EMPTY_LAUNCH = Object.freeze({
  path: null,
  registryId: null,
  chatSeed: null,
  orchestratorTool: null,
  openLabel: 'Try in chat',
});

/** Product-required NLU aliases (space-separated) → registry id */
export const PR5_REQUIRED_NLU_ALIAS_PAIRS = Object.freeze([
  ['phq9', 'phq9'],
  ['depression screen', 'phq9'],
  ['depression questionnaire', 'phq9'],
  ['mood screen', 'phq9'],
  ['gad7', 'gad7'],
  ['anxiety screen', 'gad7'],
  ['anxiety questionnaire', 'gad7'],
  ['generalized anxiety screen', 'gad7'],
]);

/** Hyphenated discovery / slug aliases → canonical registry id */
export const PR5_DISCOVERY_ALIAS_PAIRS = Object.freeze([
  ['phq9', 'phq9'],
  ['phq-9', 'phq9'],
  ['depression-screen', 'phq9'],
  ['depression-questionnaire', 'phq9'],
  ['mood-screen', 'phq9'],
  ['gad7', 'gad7'],
  ['gad-7', 'gad7'],
  ['anxiety-screen', 'gad7'],
  ['anxiety-questionnaire', 'gad7'],
  ['generalized-anxiety-screen', 'gad7'],
]);

/** [canonicalId, catalog search query] */
export const PR5_CATALOG_SEARCH_QUERIES = Object.freeze([
  ['phq9', 'phq9'],
  ['phq9', 'depression screen'],
  ['gad7', 'gad7'],
  ['gad7', 'anxiety screen'],
]);

export const PR5_BACKEND_DISAMBIGUATION_HELPERS = Object.freeze(['preferPhq9', 'preferGad7']);

/** All NLU + discovery alias pairs (coverage / consistency) */
export const PR5_ALL_ALIAS_PAIRS = Object.freeze([
  ...PR5_REQUIRED_NLU_ALIAS_PAIRS,
  ...PR5_DISCOVERY_ALIAS_PAIRS,
]);

export { catalogRowsMatchingQuery } from '../utils/catalogSearch';
