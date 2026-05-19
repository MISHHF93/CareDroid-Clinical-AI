/**
 * Single source for calculator hub cards, switch slugs, and chat-assisted hub visibility.
 * Keeps Calculators.jsx, routes, and tests aligned — no calculator only "under the skin."
 */

import { builtinUiCalculators, clinicalIntentTools, nluCalculatorHubOnly } from './clinicalIntentToolCatalog';
import { BUILTIN_CALC_ID_TO_REGISTRY_ID } from './clinicalCatalogWiring';
import { NLU_HUB_ONLY_PROFILE_TOOL_IDS } from './clinicalToolIdContract';
import { toolRegistryById } from './toolRegistry';
import { CHAT_ASSISTED_HUB_GROUPS } from './chatAssistedHubGroups';
import { CALCULATOR_ROUTE_DEFS } from '../routes/clinicalToolRoutes';

/** Every built-in form slug implemented in CalculatorInterface. */
export const BUILTIN_CALCULATOR_SWITCH_SLUGS = Object.freeze(
  builtinUiCalculators.map((c) => c.id)
);

/**
 * CSS hook for form smoke / hub tests. Slugs without a BEM modifier use `.calculator-interface`.
 * @type {Readonly<Record<string, string>>}
 */
export const CALCULATOR_INTERFACE_CLASS_BY_SLUG = Object.freeze({
  sofa: 'calculator-interface',
  qsofa: 'calculator-interface--qsofa',
  news2: 'calculator-interface--news2',
  'child-pugh': 'calculator-interface--child-pugh',
  'has-bled': 'calculator-interface--has-bled',
  meld: 'calculator-interface--meld',
  'meld-na': 'calculator-interface--meld-na',
  'timi-ua-nstemi': 'calculator-interface--timi',
  gfr: 'calculator-interface--gfr',
  bmi: 'calculator-interface--bmi',
  chads2vasc: 'calculator-interface--chads2vasc',
  phq9: 'calculator-interface--phq9',
  gad7: 'calculator-interface--gad7',
  'ascvd-risk': 'calculator-interface--ascvd-risk',
  'ckd-staging': 'calculator-interface--ckd-staging',
  'stop-bang': 'calculator-interface--stop-bang',
  'audit-c': 'calculator-interface--audit-c',
});

/** Registry tool ids shown in the calculators hub chat-assisted section. */
export const HUB_CHAT_ASSISTED_TOOL_IDS = Object.freeze([
  ...new Set([
    ...CHAT_ASSISTED_HUB_GROUPS.flatMap((g) => g.toolIds),
    ...NLU_HUB_ONLY_PROFILE_TOOL_IDS,
  ]),
]);

/**
 * @returns {import('./clinicalIntentToolCatalog').typeof nluCalculatorHubOnly}
 */
export function getHubChatAssistedTools() {
  const idSet = new Set(HUB_CHAT_ASSISTED_TOOL_IDS);
  return nluCalculatorHubOnly.filter((t) => idSet.has(t.toolId));
}

/**
 * Hub selection cards for built-in calculator forms.
 * @returns {Array<{ id: string, name: string, description: string, category: string, route: string, calcQuery: string }>}
 */
export function buildBuiltinHubCalculatorCards() {
  return builtinUiCalculators.map((calc) => {
    const registryId = BUILTIN_CALC_ID_TO_REGISTRY_ID[calc.id] ?? calc.id;
    const reg = toolRegistryById[registryId];
    return {
      id: calc.id,
      name: calc.name,
      description: calc.description || reg?.description || '',
      category: reg?.category || 'Calculator',
      route: calc.path,
      calcQuery: calc.calcQuery,
    };
  });
}

/**
 * @param {string} slug
 * @returns {string} CSS class (may be bare `calculator-interface`)
 */
export function resolveCalculatorInterfaceClass(slug) {
  return CALCULATOR_INTERFACE_CLASS_BY_SLUG[slug] || 'calculator-interface';
}

/**
 * Smoke-test rows: one entry per built-in form slug.
 */
export const BUILTIN_CALCULATOR_FORM_SMOKE_ROWS = Object.freeze(
  BUILTIN_CALCULATOR_SWITCH_SLUGS.map((slug) => ({
    slug,
    route: builtinUiCalculators.find((c) => c.id === slug)?.path,
    interfaceClass: resolveCalculatorInterfaceClass(slug),
  }))
);

/**
 * @param {string} slug
 * @returns {boolean}
 */
export function isBuiltinCalculatorSlug(slug) {
  return BUILTIN_CALCULATOR_SWITCH_SLUGS.includes(slug);
}

/**
 * @param {string} slug
 * @returns {{ path: string, calculatorSlug: string } | undefined}
 */
export function getBuiltinCalculatorRouteDef(slug) {
  return CALCULATOR_ROUTE_DEFS.find((d) => d.calculatorSlug === slug);
}

/**
 * Chat-assisted tool metadata for hub cards (description from clinical intent catalog).
 * @param {string} toolId
 */
export function getHubChatToolMeta(toolId) {
  const hubRow = nluCalculatorHubOnly.find((t) => t.toolId === toolId);
  const intent = clinicalIntentTools.find((t) => t.toolId === toolId);
  return {
    toolId,
    name: hubRow?.name || intent?.name || toolId,
    description: intent?.description || 'Chat-assisted decision support',
  };
}
