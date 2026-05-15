/**
 * Single source for linking catalog entries → UI routes, sidebar tools, and chat API params.
 */

import toolRegistry, { toolRegistryById } from './toolRegistry';
import {
  clinicalIntentTools,
  clinicalIntentToolsById,
  builtinUiCalculators,
  ORCHESTRATOR_TO_REGISTRY_ID,
} from './clinicalIntentToolCatalog';

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
  qsofa: 'sofa-score',
  gfr: 'calc-gfr',
  egfr: 'calc-gfr',
  bmi: 'calc-bmi',
  chads: 'calc-chads2vasc',
  chads2vasc: 'calc-chads2vasc',
  'abc-assessment': 'calculators',
  'trauma-score': 'calculators',
  'vitals-monitor': 'calculators',
  'antibiotic-scripts': 'drug-check',
  'bleeding-risk': 'calculators',
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
    const registryId =
      id === 'sofa' ? 'sofa-score' : id === 'chads2vasc' ? 'calc-chads2vasc' : 'calculators';
    return {
      path: calc.path || calc.calcQuery?.split('?')[0] || '/tools/calculators',
      registryId,
      chatSeed: `Open the ${calc.name} calculator and help me interpret the results.`,
      orchestratorTool: calc.orchestratorId || registryIdToOrchestratorTool(registryId),
      openLabel: 'Open calculator',
    };
  }

  const registryId = resolveRegistryId(id);
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
