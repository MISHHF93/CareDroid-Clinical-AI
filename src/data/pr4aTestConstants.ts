/**
 * Shared PR4A audit constants for coverage and consistency tests.
 */

import { PR4A_CALCULATOR_REGISTRY_IDS } from './clinicalCatalogWiring';

export const PR4A_HUB_PATH = '/tools/calculators';

export const PR4A_TOOL_IDS = Object.freeze([...PR4A_CALCULATOR_REGISTRY_IDS]);

/** Dedicated Tier-A route per registry id */
export const PR4A_ROUTE_BY_REGISTRY_ID = Object.freeze(
  Object.fromEntries(PR4A_TOOL_IDS.map((id) => [id, `${PR4A_HUB_PATH}/${id}`]))
);

/** ?calc= deep-link query per registry id */
export const PR4A_CALC_QUERY_BY_REGISTRY_ID = Object.freeze(
  Object.fromEntries(PR4A_TOOL_IDS.map((id) => [id, `${PR4A_HUB_PATH}?calc=${id}`]))
);

export const PR4A_EMPTY_LAUNCH = Object.freeze({
  path: null,
  registryId: null,
  chatSeed: null,
  orchestratorTool: null,
  openLabel: 'Try in chat',
});

/** Product-required NLU aliases (space-separated) → registry id */
export const PR4A_REQUIRED_NLU_ALIAS_PAIRS = Object.freeze([
  ['ascvd', 'ascvd-risk'],
  ['cardiovascular risk', 'ascvd-risk'],
  ['heart disease risk', 'ascvd-risk'],
  ['cv risk', 'ascvd-risk'],
  ['ascvd score', 'ascvd-risk'],
  ['ckd stage', 'ckd-staging'],
  ['kidney stage', 'ckd-staging'],
  ['kidney disease staging', 'ckd-staging'],
  ['gfr stage', 'ckd-staging'],
  ['albuminuria stage', 'ckd-staging'],
  ['stop bang', 'stop-bang'],
  ['sleep apnea score', 'stop-bang'],
  ['osa risk', 'stop-bang'],
  ['sleep risk score', 'stop-bang'],
  ['audit c', 'audit-c'],
  ['alcohol screen', 'audit-c'],
  ['alcohol use screen', 'audit-c'],
  ['drinking screen', 'audit-c'],
]);

/** Hyphenated discovery / slug aliases → canonical registry id */
export const PR4A_DISCOVERY_ALIAS_PAIRS = Object.freeze([
  ['ascvd-score', 'ascvd-risk'],
  ['cardiovascular-risk', 'ascvd-risk'],
  ['heart-disease-risk', 'ascvd-risk'],
  ['cv-risk', 'ascvd-risk'],
  ['ckd-stage', 'ckd-staging'],
  ['kidney-stage', 'ckd-staging'],
  ['kidney-disease-staging', 'ckd-staging'],
  ['gfr-stage', 'ckd-staging'],
  ['albuminuria-stage', 'ckd-staging'],
  ['stop-bang', 'stop-bang'],
  ['sleep-apnea-score', 'stop-bang'],
  ['osa-risk', 'stop-bang'],
  ['sleep-risk-score', 'stop-bang'],
  ['audit-c', 'audit-c'],
  ['alcohol-screen', 'audit-c'],
  ['alcohol-use-screen', 'audit-c'],
  ['drinking-screen', 'audit-c'],
]);

/** [canonicalId, catalog search query] */
export const PR4A_CATALOG_SEARCH_QUERIES = Object.freeze([
  ['ascvd-risk', 'ascvd'],
  ['ckd-staging', 'ckd stage'],
  ['stop-bang', 'stop bang'],
  ['audit-c', 'audit c'],
]);

export const PR4A_BACKEND_DISAMBIGUATION_HELPERS = Object.freeze([
  'preferAscvdRisk',
  'preferCkdStaging',
  'preferStopBang',
  'preferAuditC',
]);

/** All NLU + discovery alias pairs (coverage / consistency) */
export const PR4A_ALL_ALIAS_PAIRS = Object.freeze([
  ...PR4A_REQUIRED_NLU_ALIAS_PAIRS,
  ...PR4A_DISCOVERY_ALIAS_PAIRS,
]);

/** ClinicalToolCatalog.jsx row filter (mirrors pr2/pr3 consistency tests) */
export { catalogRowsMatchingQuery } from '../utils/catalogSearch';
