/**
 * Shared PR1 audit constants (qSOFA, NEWS2, Child-Pugh, HAS-BLED).
 */

import { PR1_CALCULATOR_REGISTRY_IDS } from './clinicalToolIdContract';

export const PR1_HUB_PATH = '/tools/calculators';

export const PR1_TOOL_IDS = Object.freeze([...PR1_CALCULATOR_REGISTRY_IDS]);

/** Canonical Tier-A route for each PR1 registry id */
export const PR1_ROUTE_BY_REGISTRY_ID = Object.freeze(
  Object.fromEntries(PR1_TOOL_IDS.map((id) => [id, `/tools/calculators/${id}`])),
);

export const PR1_CALC_QUERY_BY_REGISTRY_ID = Object.freeze(
  Object.fromEntries(PR1_TOOL_IDS.map((id) => [id, `/tools/calculators?calc=${id}`])),
);

/** Product-required NLU / catalog aliases (space-separated) → registry id */
export const PR1_REQUIRED_NLU_ALIAS_PAIRS = Object.freeze([
  ['qsofa', 'qsofa'],
  ['quick sofa', 'qsofa'],
  ['quick sepsis score', 'qsofa'],
  ['sepsis bedside score', 'qsofa'],
  ['news2', 'news2'],
  ['news 2', 'news2'],
  ['national early warning score', 'news2'],
  ['early warning score', 'news2'],
  ['deterioration score', 'news2'],
  ['child-pugh', 'child-pugh'],
  ['child pugh', 'child-pugh'],
  ['ctp score', 'child-pugh'],
  ['cirrhosis score', 'child-pugh'],
  ['liver severity score', 'child-pugh'],
  ['has-bled', 'has-bled'],
  ['has bled', 'has-bled'],
  ['bleeding risk', 'has-bled'],
  ['af bleeding risk', 'has-bled'],
  ['anticoagulation bleeding risk', 'has-bled'],
]);

/** Hyphenated discovery / slug aliases → canonical registry id */
export const PR1_DISCOVERY_ALIAS_PAIRS = Object.freeze([
  ['q-sofa', 'qsofa'],
  ['quick-sofa', 'qsofa'],
  ['quick-sepsis-score', 'qsofa'],
  ['sepsis-bedside-score', 'qsofa'],
  ['news-2', 'news2'],
  ['national-early-warning-score', 'news2'],
  ['early-warning-score', 'news2'],
  ['deterioration-score', 'news2'],
  ['ctp-score', 'child-pugh'],
  ['cirrhosis-score', 'child-pugh'],
  ['liver-severity-score', 'child-pugh'],
  ['hasbled', 'has-bled'],
  ['bleeding-risk', 'has-bled'],
  ['af-bleeding-risk', 'has-bled'],
  ['anticoagulation-bleeding-risk', 'has-bled'],
]);

/** [canonicalId, catalog search query] */
export const PR1_CATALOG_SEARCH_QUERIES = Object.freeze([
  ['qsofa', 'quick sepsis'],
  ['news2', 'early warning'],
  ['news2', 'deterioration score'],
  ['child-pugh', 'ctp score'],
  ['child-pugh', 'cirrhosis'],
  ['has-bled', 'anticoagulation bleeding'],
  ['has-bled', 'af bleeding'],
]);

export const PR1_ALL_ALIAS_PAIRS = Object.freeze([
  ...PR1_REQUIRED_NLU_ALIAS_PAIRS,
  ...PR1_DISCOVERY_ALIAS_PAIRS,
]);
