/**
 * Cross-layer audit — newly shipped clinical calculators (PR8 hardened, PR9 trauma chat, PR10 ABCD²).
 */

import { REGISTRY, PR9_TIER_B_CHAT_CALCULATOR_IDS, PR10_TIER_A_CALCULATOR_REGISTRY_IDS } from './clinicalToolIdContract';
import {
  PR9_ALL_ALIAS_PAIRS,
  PR9_CHAT_CONFIGS,
  PR9_DISCOVERY_ALIAS_PAIRS,
  PR9_HUB_PATH,
} from './pr9TestConstants';
import { pecarnHeadChatConfig } from './chatAssistedCalculators/pecarnHead';
import { nexusCSpineChatConfig } from './chatAssistedCalculators/nexusCSpine';
import { catalogRowsMatchingQuery } from '../utils/catalogSearch';

/** Tier-A tools implemented/hardened in the recent clinical calculator batch. */
export const NEW_CLINICAL_TOOLS_TIER_A_IDS = Object.freeze([
  REGISTRY.heartScore,
  REGISTRY.abcd2,
  REGISTRY.bradenScale,
  REGISTRY.morseFallScale,
  REGISTRY.fib4,
  REGISTRY.bisapScore,
  REGISTRY.apgarScore,
  REGISTRY.bishopScore,
]);

export const NEW_CLINICAL_TOOLS_TIER_B_IDS = Object.freeze([...PR9_TIER_B_CHAT_CALCULATOR_IDS]);

export const NEW_CLINICAL_TOOLS_ALL_IDS = Object.freeze([
  ...NEW_CLINICAL_TOOLS_TIER_A_IDS,
  ...NEW_CLINICAL_TOOLS_TIER_B_IDS,
]);

export const NEW_CLINICAL_TOOLS_TIER_A_ALIAS_PAIRS = Object.freeze([
  ['heart score', REGISTRY.heartScore],
  ['morse-fall', REGISTRY.morseFallScale],
  ['morse fall', REGISTRY.morseFallScale],
  ['bisap', REGISTRY.bisapScore],
  ['apgar', REGISTRY.apgarScore],
  ['fib-4', REGISTRY.fib4],
  ['abcd2-score', REGISTRY.abcd2],
  ['tia-stroke-risk', REGISTRY.abcd2],
  ['pressure-injury-risk', REGISTRY.bradenScale],
  ['fall-risk-score', REGISTRY.morseFallScale],
]);

export const NEW_CLINICAL_TOOLS_DISCOVERY_ALIAS_PAIRS = Object.freeze([
  ['morse-fall', REGISTRY.morseFallScale],
  ['bisap', REGISTRY.bisapScore],
  ['apgar', REGISTRY.apgarScore],
  ['abcd2-score', REGISTRY.abcd2],
  ['tia-stroke-risk', REGISTRY.abcd2],
  ...PR9_DISCOVERY_ALIAS_PAIRS,
]);

export const NEW_CLINICAL_TOOLS_ALL_ALIAS_PAIRS = Object.freeze([
  ...NEW_CLINICAL_TOOLS_TIER_A_ALIAS_PAIRS,
  ...PR9_ALL_ALIAS_PAIRS,
]);

export const NEW_CLINICAL_TOOLS_CHAT_CONFIGS = Object.freeze([...PR9_CHAT_CONFIGS]);

/**
 * @type {Record<string, {
 *   tier: 'A' | 'B',
 *   routePath: string,
 *   uiCalculatorSlug: string | null,
 *   chatOnlyForm: boolean,
 *   hubOnly: boolean,
 *   hubGroupId: string | null,
 *   openLabel: string,
 *   navigationPath: string,
 *   chatSeedPattern: RegExp,
 *   catalogSearchQueries: readonly (readonly [string, string])[],
 * }>}
 */
export const NEW_CLINICAL_TOOLS_SPECS = Object.freeze({
  [REGISTRY.heartScore]: {
    tier: 'A',
    routePath: '/tools/calculators/heart-score',
    uiCalculatorSlug: 'heart-score',
    chatOnlyForm: false,
    hubOnly: false,
    hubGroupId: null,
    openLabel: 'Open',
    navigationPath: '/tools/calculators/heart-score',
    chatSeedPattern: /STEP 0|chest pain|MACE/i,
    catalogSearchQueries: [['heart-score', 'heart score']],
  },
  [REGISTRY.abcd2]: {
    tier: 'A',
    routePath: '/tools/calculators/abcd2',
    uiCalculatorSlug: 'abcd2',
    chatOnlyForm: false,
    hubOnly: false,
    hubGroupId: null,
    openLabel: 'Open',
    navigationPath: '/tools/calculators/abcd2',
    chatSeedPattern: /STEP 0|do not delay urgent|stroke pathways/i,
    catalogSearchQueries: [['abcd2', 'abcd2'], ['abcd2', 'tia']],
  },
  [REGISTRY.bradenScale]: {
    tier: 'A',
    routePath: '/tools/calculators/braden-scale',
    uiCalculatorSlug: 'braden-scale',
    chatOnlyForm: false,
    hubOnly: false,
    hubGroupId: null,
    openLabel: 'Open',
    navigationPath: '/tools/calculators/braden-scale',
    chatSeedPattern: /STEP 0|nursing|pressure-injury/i,
    catalogSearchQueries: [['braden-scale', 'braden']],
  },
  [REGISTRY.morseFallScale]: {
    tier: 'A',
    routePath: '/tools/calculators/morse-fall-scale',
    uiCalculatorSlug: 'morse-fall-scale',
    chatOnlyForm: false,
    hubOnly: false,
    hubGroupId: null,
    openLabel: 'Open',
    navigationPath: '/tools/calculators/morse-fall-scale',
    chatSeedPattern: /STEP 0|fall-prevention|nursing/i,
    catalogSearchQueries: [['morse-fall-scale', 'morse fall']],
  },
  [REGISTRY.fib4]: {
    tier: 'A',
    routePath: '/tools/calculators/fib4',
    uiCalculatorSlug: 'fib4',
    chatOnlyForm: false,
    hubOnly: false,
    hubGroupId: null,
    openLabel: 'Open',
    navigationPath: '/tools/calculators/fib4',
    chatSeedPattern: /STEP 0|fibrosis|AST|platelets/i,
    catalogSearchQueries: [['fib4', 'fib-4']],
  },
  [REGISTRY.bisapScore]: {
    tier: 'A',
    routePath: '/tools/calculators/bisap-score',
    uiCalculatorSlug: 'bisap-score',
    chatOnlyForm: false,
    hubOnly: false,
    hubGroupId: null,
    openLabel: 'Open',
    navigationPath: '/tools/calculators/bisap-score',
    chatSeedPattern: /STEP 0|pancreatitis|BUN/i,
    catalogSearchQueries: [['bisap-score', 'bisap']],
  },
  [REGISTRY.apgarScore]: {
    tier: 'A',
    routePath: '/tools/calculators/apgar-score',
    uiCalculatorSlug: 'apgar-score',
    chatOnlyForm: false,
    hubOnly: false,
    hubGroupId: null,
    openLabel: 'Open',
    navigationPath: '/tools/calculators/apgar-score',
    chatSeedPattern: /STEP 0|newborn|1 and 5 minutes/i,
    catalogSearchQueries: [['apgar-score', 'apgar']],
  },
  [REGISTRY.bishopScore]: {
    tier: 'A',
    routePath: '/tools/calculators/bishop-score',
    uiCalculatorSlug: 'bishop-score',
    chatOnlyForm: false,
    hubOnly: false,
    hubGroupId: null,
    openLabel: 'Open',
    navigationPath: '/tools/calculators/bishop-score',
    chatSeedPattern: /STEP 0|cervical|induction/i,
    catalogSearchQueries: [['bishop-score', 'bishop']],
  },
  'pecarn-head': {
    tier: 'B',
    routePath: PR9_HUB_PATH,
    uiCalculatorSlug: null,
    chatOnlyForm: true,
    hubOnly: true,
    hubGroupId: 'trauma',
    openLabel: 'Start guided chat',
    navigationPath: '/assistant',
    chatSeedPattern: /PECARN|pediatric head/i,
    catalogSearchQueries: [['pecarn-head', 'pecarn']],
  },
  'nexus-cspine': {
    tier: 'B',
    routePath: PR9_HUB_PATH,
    uiCalculatorSlug: null,
    chatOnlyForm: true,
    hubOnly: true,
    hubGroupId: 'trauma',
    openLabel: 'Start guided chat',
    navigationPath: '/assistant',
    chatSeedPattern: /NEXUS|c-spine|primary survey/i,
    catalogSearchQueries: [['nexus-cspine', 'nexus']],
  },
});

export { catalogRowsMatchingQuery, pecarnHeadChatConfig, nexusCSpineChatConfig, PR10_TIER_A_CALCULATOR_REGISTRY_IDS };
