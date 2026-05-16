/**
 * Single source for linking catalog entries → UI routes, sidebar tools, and chat API params.
 */

import { toolRegistryById } from './toolRegistry';
import {
  clinicalIntentTools,
  clinicalIntentToolsById,
  builtinUiCalculators,
  ORCHESTRATOR_TO_REGISTRY_ID,
} from './clinicalIntentToolCatalog';

/**
 * Built-in calculator slug (`builtinUiCalculators.id`, `?calc=` param) → sidebar registry id.
 * Used by resolveCatalogLaunch for catalog rows keyed by calculator id.
 */
export const BUILTIN_CALC_ID_TO_REGISTRY_ID = {
  sofa: 'sofa-score',
  chads2vasc: 'calc-chads2vasc',
  qsofa: 'qsofa',
  news2: 'news2',
  'child-pugh': 'child-pugh',
  'has-bled': 'has-bled',
  meld: 'meld',
  'meld-na': 'meld-na',
  'timi-ua-nstemi': 'timi-ua-nstemi',
};

/** Tier-A calculators: dedicated NLU profile + registry row + shipped form (audit list). */
export const PR1_CALCULATOR_REGISTRY_IDS = Object.freeze([
  'qsofa',
  'news2',
  'child-pugh',
  'has-bled',
]);

/** Tier-A MELD calculators (PR2). */
export const PR2_MELD_CALCULATOR_REGISTRY_IDS = Object.freeze(['meld', 'meld-na']);

/** Tier-A TIMI UA/NSTEMI (PR2). */
export const PR2_TIMI_CALCULATOR_REGISTRY_IDS = Object.freeze(['timi-ua-nstemi']);

/** Tier-A PR2 calculators with dedicated forms (MELD + TIMI). */
export const PR2_TIER_A_CALCULATOR_REGISTRY_IDS = Object.freeze([
  ...PR2_MELD_CALCULATOR_REGISTRY_IDS,
  ...PR2_TIMI_CALCULATOR_REGISTRY_IDS,
]);

/** Tier-B chat-assisted calculators (hub + NLU; no dedicated form). */
export const PR2_TIER_B_CHAT_CALCULATOR_IDS = Object.freeze(['wells-pe', 'perc']);

/** Tier-B chat-assisted calculators (PR3). */
export const PR3_TIER_B_CHAT_CALCULATOR_IDS = Object.freeze([
  'grace-acs',
  'nihss',
  'canadian-c-spine',
  'ottawa-ankle',
]);

/** All Tier-B chat-assisted calculator registry ids (hub section + audits). */
export const TIER_B_CHAT_CALCULATOR_REGISTRY_IDS = Object.freeze([
  ...PR2_TIER_B_CHAT_CALCULATOR_IDS,
  ...PR3_TIER_B_CHAT_CALCULATOR_IDS,
]);

/** All PR2 calculator registry ids (audit / consistency tests). */
export const PR2_CALCULATOR_REGISTRY_IDS = Object.freeze([
  ...PR2_TIER_A_CALCULATOR_REGISTRY_IDS,
  ...PR2_TIER_B_CHAT_CALCULATOR_IDS,
]);

/** All PR3 calculator registry ids (audit / consistency tests). */
export const PR3_CALCULATOR_REGISTRY_IDS = Object.freeze([...PR3_TIER_B_CHAT_CALCULATOR_IDS]);

/** NLU / legacy / phantom ids → sidebar registry id (used by recommendations + catalog) */
export const NLU_TO_REGISTRY_ID = {
  'drug-checker': 'drug-check',
  'drug-interactions': 'drug-check',
  'drug-interaction-checker': 'drug-interactions',
  'lab-interpreter': 'lab-interp',
  'lab-interp': 'lab-interp',
  'sofa-calculator': 'sofa-score',
  'sofa_calculator': 'sofa-score',
  'apache2-calculator': 'calculators',
  'cha2ds2vasc-calculator': 'calc-chads2vasc',
  'curb65-calculator': 'calculators',
  'gcs-calculator': 'calculators',
  'wells-dvt-calculator': 'calculators',
  'dose-calculator': 'calculators',
  'abg-interpreter': 'lab-interp',
  'protocol-lookup': 'protocols',
  'acls-protocol': 'protocols',
  'atls-protocol': 'protocols',
  'differential-diagnosis': 'diagnosis',
  'antibiotic-guide': 'diagnosis',
  calculator: 'calculators',
  'diagnosis-assistant': 'diagnosis',
  'procedure-guide': 'procedures',
  sofa: 'sofa-score',
  qsofa: 'qsofa',
  news2: 'news2',
  'child-pugh': 'child-pugh',
  'ctp-score': 'child-pugh',
  'cirrhosis-score': 'child-pugh',
  'has-bled': 'has-bled',
  hasbled: 'has-bled',
  gfr: 'calc-gfr',
  egfr: 'calc-gfr',
  bmi: 'calc-bmi',
  chads: 'calc-chads2vasc',
  chads2vasc: 'calc-chads2vasc',
  'abc-assessment': 'calculators',
  'trauma-score': 'calculators',
  'vitals-monitor': 'calculators',
  'antibiotic-scripts': 'drug-check',
  'bleeding-risk': 'has-bled',
  'meld score': 'meld',
  'meld-score': 'meld',
  'liver transplant score': 'meld-na',
  'liver-transplant-score': 'meld-na',
  'end stage liver disease score': 'meld',
  'end-stage-liver-disease-score': 'meld',
  'meld na': 'meld-na',
  'meld-sodium': 'meld-na',
  timi: 'timi-ua-nstemi',
  'timi score': 'timi-ua-nstemi',
  'timi-score': 'timi-ua-nstemi',
  'timi acs': 'timi-ua-nstemi',
  'timi-acs': 'timi-ua-nstemi',
  'timi nstemi': 'timi-ua-nstemi',
  'timi-nstemi': 'timi-ua-nstemi',
  'timi unstable angina': 'timi-ua-nstemi',
  'timi-unstable-angina': 'timi-ua-nstemi',
  'wells pe': 'wells-pe',
  'wells-pe': 'wells-pe',
  'wells pe score': 'wells-pe',
  'wells-pe-score': 'wells-pe',
  'pulmonary embolism wells': 'wells-pe',
  'pulmonary-embolism-wells': 'wells-pe',
  'pe score': 'wells-pe',
  'pe-score': 'wells-pe',
  'wells pulmonary embolism': 'wells-pe',
  'wells-pulmonary-embolism': 'wells-pe',
  perc: 'perc',
  'perc rule': 'perc',
  'perc-rule': 'perc',
  'pulmonary embolism rule out': 'perc',
  'pulmonary-embolism-rule-out': 'perc',
  'pe rule out': 'perc',
  'pe-rule-out': 'perc',
  grace: 'grace-acs',
  'grace score': 'grace-acs',
  'grace-score': 'grace-acs',
  'grace acs': 'grace-acs',
  'grace-acs': 'grace-acs',
  'grace acs risk': 'grace-acs',
  'grace-acs-risk': 'grace-acs',
  'acs mortality risk': 'grace-acs',
  'acs-mortality-risk': 'grace-acs',
  'acute coronary syndrome risk': 'grace-acs',
  'acute-coronary-syndrome-risk': 'grace-acs',
  'global registry acute coronary events': 'grace-acs',
  nihss: 'nihss',
  'nih stroke scale': 'nihss',
  'nih-stroke-scale': 'nihss',
  'national institutes of health stroke scale': 'nihss',
  'national-institutes-of-health-stroke-scale': 'nihss',
  'stroke scale': 'nihss',
  'stroke-scale': 'nihss',
  'stroke severity score': 'nihss',
  'stroke-severity-score': 'nihss',
  'canadian c spine': 'canadian-c-spine',
  'canadian-c-spine': 'canadian-c-spine',
  'canadian c-spine rule': 'canadian-c-spine',
  'canadian-c-spine-rule': 'canadian-c-spine',
  'c spine rule': 'canadian-c-spine',
  'c-spine-rule': 'canadian-c-spine',
  'cervical spine rule': 'canadian-c-spine',
  'cervical-spine-rule': 'canadian-c-spine',
  'neck trauma imaging rule': 'canadian-c-spine',
  'neck-trauma-imaging-rule': 'canadian-c-spine',
  'ottawa ankle': 'ottawa-ankle',
  'ottawa-ankle': 'ottawa-ankle',
  'ottawa ankle rule': 'ottawa-ankle',
  'ottawa-ankle-rule': 'ottawa-ankle',
  'ankle xray rule': 'ottawa-ankle',
  'ankle-xray-rule': 'ottawa-ankle',
  'ankle injury imaging': 'ottawa-ankle',
  'ankle-injury-imaging': 'ottawa-ankle',
  'foot xray rule': 'ottawa-ankle',
  'foot-xray-rule': 'ottawa-ankle',
  'chemo-calculator': 'calculators',
  'cancer-calculator': 'calculators',
  'tumor-staging': 'diagnosis',
};

/** Registry id → backend POST /api/chat/message `tool` param (executors only) */
export const REGISTRY_ID_TO_ORCHESTRATOR_TOOL = {
  'drug-check': 'drug-interactions',
  'lab-interp': 'lab-interpreter',
  'sofa-score': 'sofa-calculator',
};

export function registryIdToOrchestratorTool(registryId) {
  if (!registryId) return undefined;
  return REGISTRY_ID_TO_ORCHESTRATOR_TOOL[registryId];
}

export function resolveRegistryId(id) {
  if (!id) return null;
  if (toolRegistryById[id]) return id;
  return NLU_TO_REGISTRY_ID[id] || ORCHESTRATOR_TO_REGISTRY_ID[id] || null;
}

/**
 * @param {string} id - catalog row id (registry, NLU toolId, calculator slug, alias)
 * @returns {{ path: string|null, registryId: string|null, chatSeed: string|null, orchestratorTool: string|null, openLabel: string }}
 */
export function resolveCatalogLaunch(id) {
  const empty = {
    path: null,
    registryId: null,
    chatSeed: null,
    orchestratorTool: null,
    openLabel: 'Try in chat',
  };

  if (!id) return empty;

  const nlu = clinicalIntentToolsById[id];
  if (nlu) {
    const registryId =
      nlu.sidebarToolId || ORCHESTRATOR_TO_REGISTRY_ID[nlu.toolId] || NLU_TO_REGISTRY_ID[nlu.toolId];
    const registryEntry = registryId ? toolRegistryById[registryId] : null;
    const path =
      nlu.path ||
      registryEntry?.path ||
      (registryId === 'calculators' ? '/tools/calculators' : null);
    return {
      path,
      registryId,
      chatSeed:
        nlu.chatSeed ||
        `Help me use the ${nlu.toolName}. ${nlu.description || ''}`.trim(),
      orchestratorTool: nlu.backendExecutable
        ? nlu.toolId
        : registryIdToOrchestratorTool(registryId),
      openLabel: path ? 'Open' : 'Try in chat',
    };
  }

  const calc = builtinUiCalculators.find((c) => c.id === id);
  if (calc) {
    const registryId = BUILTIN_CALC_ID_TO_REGISTRY_ID[id] ?? 'calculators';
    return {
      path: calc.path || calc.calcQuery?.split('?')[0] || '/tools/calculators',
      registryId,
      chatSeed: `Open the ${calc.name} calculator and help me interpret the results.`,
      orchestratorTool: calc.orchestratorId || registryIdToOrchestratorTool(registryId),
      openLabel: 'Open calculator',
    };
  }

  const registryId = resolveRegistryId(id);
  // Alias → registry id: prefer NLU guided chatSeed over generic registry fallback.
  if (registryId && registryId !== id && clinicalIntentToolsById[registryId]) {
    return resolveCatalogLaunch(registryId);
  }

  const registryEntry = registryId ? toolRegistryById[registryId] : null;
  if (registryEntry) {
    return {
      path: registryEntry.path,
      registryId,
      chatSeed: `Help me with ${registryEntry.name}: ${registryEntry.description}`,
      orchestratorTool: registryIdToOrchestratorTool(registryId),
      openLabel: 'Open',
    };
  }

  const mappedRegistry = NLU_TO_REGISTRY_ID[id];
  if (mappedRegistry && toolRegistryById[mappedRegistry]) {
    return resolveCatalogLaunch(mappedRegistry);
  }

  return empty;
}

/** Workspace presets from WorkspaceCreationModal.jsx */
export const workspaceTemplateCatalog = [
  {
    id: 'workspace-emergency',
    name: 'Emergency Medicine workspace',
    toolIds: ['drug-check', 'sofa-score', 'lab-interp', 'protocols', 'calc-gfr'],
    source: 'WorkspaceCreationModal.jsx',
  },
  {
    id: 'workspace-icu',
    name: 'ICU / Critical Care workspace',
    toolIds: ['sofa-score', 'lab-interp', 'drug-check', 'calc-gfr', 'protocols'],
    source: 'WorkspaceCreationModal.jsx',
  },
  {
    id: 'workspace-ambulatory',
    name: 'Ambulatory Care workspace',
    toolIds: ['diagnosis', 'drug-check', 'protocols', 'calc-bmi', 'calc-chads2vasc'],
    source: 'WorkspaceCreationModal.jsx',
  },
  {
    id: 'workspace-oncology',
    name: 'Oncology workspace',
    toolIds: ['drug-check', 'lab-interp', 'protocols', 'calculators'],
    source: 'WorkspaceCreationModal.jsx',
  },
];

/** Offline-affected features (OfflineProvider.jsx) */
export const offlineClinicalFeatures = [
  { id: 'offline-clinical-tools', name: 'Clinical tools (offline cache)', mapsTo: 'toolRegistry' },
  { id: 'offline-emergency-detection', name: 'Emergency detection', mapsTo: 'chat NLU' },
  { id: 'offline-medication-checker', name: 'Medication checker', mapsTo: 'drug-check' },
];

export function getWiredClinicalIntentTools() {
  return clinicalIntentTools;
}
