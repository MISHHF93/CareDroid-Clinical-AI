/**
 * Cross-tool wiring audit — phq9, gad7, copd-gold, rome-iv-ibs.
 */

import {
  PR5_ALL_ALIAS_PAIRS,
  PR5_CATALOG_SEARCH_QUERIES,
  PR5_DISCOVERY_ALIAS_PAIRS,
} from './pr5TestConstants';
import {
  PR6_ALL_ALIAS_PAIRS,
  PR6_CATALOG_SEARCH_QUERIES,
  PR6_DISCOVERY_ALIAS_PAIRS,
} from './pr6TestConstants';
import {
  PR7_ALL_ALIAS_PAIRS,
  PR7_CATALOG_SEARCH_QUERIES,
  PR7_DISCOVERY_ALIAS_PAIRS,
} from './pr7TestConstants';
import { copdGoldChatConfig } from './chatAssistedCalculators/copdGold';
import { romeIvIbsChatConfig } from './chatAssistedCalculators/romeIvIbs';

export const WIRING_AUDIT_HUB_PATH = '/tools/calculators';

export const WIRING_AUDIT_TIER_A_IDS = Object.freeze(['phq9', 'gad7']);

export const WIRING_AUDIT_TIER_B_IDS = Object.freeze(['copd-gold', 'rome-iv-ibs']);

export const WIRING_AUDIT_ALL_IDS = Object.freeze([
  ...WIRING_AUDIT_TIER_A_IDS,
  ...WIRING_AUDIT_TIER_B_IDS,
]);

/** @typedef {'A' | 'B'} WiringAuditTier */

/**
 * @type {Record<string, {
 *   tier: WiringAuditTier,
 *   routePath: string,
 *   uiCalculatorSlug: string | null,
 *   chatOnlyForm: boolean,
 *   hubOnly: boolean,
 *   hubGroupId: string | null,
 *   backendHelper: string,
 *   aliasPairs: readonly (readonly [string, string])[],
 *   catalogSearchQueries: readonly (readonly [string, string])[],
 *   chatSeedPattern: RegExp,
 *   calcSwitchCase: string | null,
 * }>}
 */
export const WIRING_AUDIT_TOOL_SPECS = Object.freeze({
  phq9: {
    tier: 'A',
    routePath: '/tools/calculators/phq9',
    uiCalculatorSlug: 'phq9',
    chatOnlyForm: false,
    hubOnly: false,
    hubGroupId: null,
    backendHelper: 'preferPhq9',
    aliasPairs: PR5_ALL_ALIAS_PAIRS.filter(([, canonical]) => canonical === 'phq9'),
    catalogSearchQueries: PR5_CATALOG_SEARCH_QUERIES.filter(([id]) => id === 'phq9'),
    chatSeedPattern: /PHQ-9|question 9/i,
    calcSwitchCase: 'phq9',
  },
  gad7: {
    tier: 'A',
    routePath: '/tools/calculators/gad7',
    uiCalculatorSlug: 'gad7',
    chatOnlyForm: false,
    hubOnly: false,
    hubGroupId: null,
    backendHelper: 'preferGad7',
    aliasPairs: PR5_ALL_ALIAS_PAIRS.filter(([, canonical]) => canonical === 'gad7'),
    catalogSearchQueries: PR5_CATALOG_SEARCH_QUERIES.filter(([id]) => id === 'gad7'),
    chatSeedPattern: /GAD-7|anxiety screen/i,
    calcSwitchCase: 'gad7',
  },
  'copd-gold': {
    tier: 'B',
    routePath: WIRING_AUDIT_HUB_PATH,
    uiCalculatorSlug: null,
    chatOnlyForm: true,
    hubOnly: true,
    hubGroupId: 'pulmonary-copd',
    backendHelper: 'preferCopdGold',
    aliasPairs: PR6_ALL_ALIAS_PAIRS,
    catalogSearchQueries: PR6_CATALOG_SEARCH_QUERIES,
    chatSeedPattern: /COPD GOLD/i,
    calcSwitchCase: null,
  },
  'rome-iv-ibs': {
    tier: 'B',
    routePath: WIRING_AUDIT_HUB_PATH,
    uiCalculatorSlug: null,
    chatOnlyForm: true,
    hubOnly: true,
    hubGroupId: 'gastrointestinal',
    backendHelper: 'preferRomeIvIbs',
    aliasPairs: PR7_ALL_ALIAS_PAIRS,
    catalogSearchQueries: PR7_CATALOG_SEARCH_QUERIES,
    chatSeedPattern: /Rome IV/i,
    calcSwitchCase: null,
  },
});

export const WIRING_AUDIT_ALL_ALIAS_PAIRS = Object.freeze([
  ...PR5_ALL_ALIAS_PAIRS,
  ...PR6_ALL_ALIAS_PAIRS,
  ...PR7_ALL_ALIAS_PAIRS,
]);

/** Hyphenated ids in sourceCodeToolDiscovery.toolIdAliases (not space-separated NLU keys). */
export const WIRING_AUDIT_DISCOVERY_ALIAS_PAIRS = Object.freeze([
  ...PR5_DISCOVERY_ALIAS_PAIRS,
  ...PR6_DISCOVERY_ALIAS_PAIRS,
  ...PR7_DISCOVERY_ALIAS_PAIRS,
]);

export const WIRING_AUDIT_CHAT_CONFIGS = Object.freeze([copdGoldChatConfig, romeIvIbsChatConfig]);

export function catalogRowsMatchingQuery(rows, query) {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((row) => {
    const blob = `${row.name} ${row.primaryId} ${row.id} ${row.category} ${row.description}`.toLowerCase();
    return blob.includes(q);
  });
}
