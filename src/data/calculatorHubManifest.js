/**
 * Single source for calculator hub cards, switch slugs, and chat-assisted hub visibility.
 * Keeps Calculators.jsx, routes, and tests aligned — no calculator only "under the skin."
 */

import { builtinUiCalculators, clinicalIntentTools, nluCalculatorHubOnly } from './clinicalIntentToolCatalog';
import { NLU_HUB_ONLY_PROFILE_TOOL_IDS } from './clinicalToolIdContract';
import { CHAT_ASSISTED_HUB_GROUPS } from './chatAssistedHubGroups';
import { getCalculatorRouteBySlug } from '../routes/clinicalToolRoutes';
import { getCalculatorToolInventory, TOOL_SURFACES } from './toolInventory';

/** Every built-in form slug implemented in CalculatorInterface. */
export const BUILTIN_CALCULATOR_SWITCH_SLUGS = Object.freeze(
  builtinUiCalculators.map((c) => c.id)
);
const BUILTIN_CALCULATOR_SWITCH_SLUG_SET = new Set(BUILTIN_CALCULATOR_SWITCH_SLUGS);

/**
 * CSS hook for form smoke / hub tests. Slugs without a BEM modifier use `.calculator-interface`.
 * @type {Readonly<Record<string, string>>}
 */
export const CALCULATOR_INTERFACE_CLASS_BY_SLUG = Object.freeze({
  sofa: 'calculator-interface',
  qsofa: 'calculator-interface--qsofa',
  news2: 'calculator-interface--news2',
  'apache-ii': 'calculator-interface--apache-ii',
  'curb-65': 'calculator-interface--curb-65',
  gcs: 'calculator-interface--gcs',
  mews: 'calculator-interface--mews',
  'revised-trauma-score': 'calculator-interface--revised-trauma-score',
  pews: 'calculator-interface--pews',
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
  'bode-index': 'calculator-interface--bode-index',
  'copd-gold-assessment': 'calculator-interface--copd-gold-assessment',
  'aa-gradient': 'calculator-interface--aa-gradient',
  'pao2-fio2-ratio': 'calculator-interface--pao2-fio2-ratio',
  'rox-index': 'calculator-interface--rox-index',
  'pneumonia-severity-index': 'calculator-interface--pneumonia-severity-index',
  'asthma-severity-score': 'calculator-interface--asthma-severity-score',
  'audit-c': 'calculator-interface--audit-c',
  'heart-score': 'calculator-interface--heart-score',
  'centor-mcisaac': 'calculator-interface--centor-mcisaac',
  'bishop-score': 'calculator-interface--bishop-score',
  'apgar-score': 'calculator-interface--apgar-score',
  'braden-scale': 'calculator-interface--braden-scale',
  'morse-fall-scale': 'calculator-interface--morse-fall-scale',
  'ranson-criteria': 'calculator-interface--ranson-criteria',
  'bisap-score': 'calculator-interface--bisap-score',
  fib4: 'calculator-interface--fib4',
  'framingham-risk': 'calculator-interface--framingham-risk',
  abcd2: 'calculator-interface--abcd2',
  'shock-index': 'calculator-interface--shock-index',
  'anion-gap': 'calculator-interface--anion-gap',
  rass: 'calculator-interface--rass',
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
  const calculatorRecords = getCalculatorToolInventory().filter(
    (record) => record.surface === TOOL_SURFACES.CHAT_ASSISTED
  );
  const hubRowsById = new Map(nluCalculatorHubOnly.map((tool) => [tool.toolId, tool]));
  return calculatorRecords
    .map((record) => {
      const toolId = record.nluToolId || record.id;
      const tool = hubRowsById.get(toolId);
      return {
        ...tool,
        toolId,
        name: record?.label || tool?.name || toolId,
        description: record?.description,
        registryId: record?.id,
        hubPath: tool?.hubPath || record?.route,
        path: record?.route || tool?.hubPath,
      };
    })
    .filter((tool) => idSet.has(tool.toolId));
}

/**
 * Hub selection cards for built-in calculator forms.
 * @returns {Array<{ id: string, name: string, description: string, category: string, route: string, calcQuery: string }>}
 */
export function buildBuiltinHubCalculatorCards() {
  const dedicatedCalculatorRecords = getCalculatorToolInventory().filter((record) => record.hasDedicatedForm);
  const recordBySlug = Object.fromEntries(
    dedicatedCalculatorRecords.map((record) => [record.calculatorSlug, record])
  );
  return builtinUiCalculators.map((calc) => {
    const record = recordBySlug[calc.id];
    return {
      id: calc.id,
      name: record?.label || calc.name,
      description: record?.description || calc.description || '',
      category: record?.presentationCategory || 'Calculator',
      route: record?.route || calc.path,
      calcQuery: calc.calcQuery,
      registryId: record?.id,
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
  return BUILTIN_CALCULATOR_SWITCH_SLUG_SET.has(slug);
}

/**
 * @param {string} slug
 * @returns {{ path: string, calculatorSlug: string } | undefined}
 */
export function getBuiltinCalculatorRouteDef(slug) {
  return getCalculatorRouteBySlug(slug);
}

/**
 * Chat-assisted tool metadata for hub cards (description from clinical intent catalog).
 * @param {string} toolId
 */
export function getHubChatToolMeta(toolId) {
  const inventoryRecord = getCalculatorToolInventory().find(
    (record) => record.id === toolId || record.nluToolId === toolId || record.nluProfileIds?.includes(toolId)
  );
  const hubRow = nluCalculatorHubOnly.find((t) => t.toolId === toolId);
  const intent = clinicalIntentTools.find((t) => t.toolId === toolId);
  return {
    toolId,
    name: inventoryRecord?.label || hubRow?.name || intent?.toolName || toolId,
    description:
      inventoryRecord?.description || intent?.description || 'Chat-assisted decision support',
  };
}
