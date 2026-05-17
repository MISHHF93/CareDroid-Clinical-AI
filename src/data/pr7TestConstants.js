/**
 * Shared PR7 audit constants (Rome IV IBS Tier-B chat-assisted).
 */

import { PR7_CALCULATOR_REGISTRY_IDS } from './clinicalCatalogWiring';
import { romeIvIbsChatConfig } from './chatAssistedCalculators/romeIvIbs';

export const PR7_HUB_PATH = '/tools/calculators';

export const PR7_TOOL_IDS = Object.freeze([...PR7_CALCULATOR_REGISTRY_IDS]);

export const PR7_CHAT_ASSISTED_CONFIGS = Object.freeze([romeIvIbsChatConfig]);

export const PR7_REQUIRED_NLU_ALIAS_PAIRS = Object.freeze([
  ['ibs criteria', 'rome-iv-ibs'],
  ['rome iv', 'rome-iv-ibs'],
  ['irritable bowel syndrome criteria', 'rome-iv-ibs'],
]);

export const PR7_DISCOVERY_ALIAS_PAIRS = Object.freeze([
  ['rome-iv-ibs', 'rome-iv-ibs'],
  ['rome-iv', 'rome-iv-ibs'],
  ['ibs-criteria', 'rome-iv-ibs'],
  ['irritable-bowel-syndrome-criteria', 'rome-iv-ibs'],
]);

export const PR7_CATALOG_SEARCH_QUERIES = Object.freeze([['rome-iv-ibs', 'rome iv']]);

export const PR7_BACKEND_DISAMBIGUATION_HELPERS = Object.freeze(['preferRomeIvIbs']);

export const PR7_ALL_ALIAS_PAIRS = Object.freeze([
  ...PR7_REQUIRED_NLU_ALIAS_PAIRS,
  ...PR7_DISCOVERY_ALIAS_PAIRS,
]);

export function catalogRowsMatchingQuery(rows, query) {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((row) => {
    const blob = `${row.name} ${row.primaryId} ${row.id} ${row.category} ${row.description}`.toLowerCase();
    return blob.includes(q);
  });
}
