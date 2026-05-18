/**
 * Single source for linking catalog entries → UI routes, sidebar tools, and chat API params.
 */

import { toolRegistryById } from './toolRegistry';
import {
  clinicalIntentTools,
  clinicalIntentToolsById,
  builtinUiCalculators,
  nluCalculatorHubOnly,
  ORCHESTRATOR_TO_REGISTRY_ID,
} from './clinicalIntentToolCatalog';
import {
  BUILTIN_CALC_ID_TO_REGISTRY_ID,
  NLU_TO_REGISTRY_ID,
  REGISTRY_ID_TO_ORCHESTRATOR_TOOL,
  ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS,
  REGISTRY,
} from './clinicalToolIdContract';

export * from './clinicalToolIdContract';
export {
  buildClinicalToolAliasSyncReport,
  buildSynchronizedAliasMap,
  formatAliasSyncReport,
  ALL_REQUIRED_CATALOG_ALIAS_PAIRS,
  PHANTOM_BLOCKED_CATALOG_ALIASES,
} from './clinicalToolAliasSync';

const CALCULATORS_HUB_PATH = '/tools/calculators';

export function isCalculatorsHubPath(path) {
  if (!path) return false;
  const normalized = String(path).replace(/\/+$/, '');
  return normalized === CALCULATORS_HUB_PATH;
}

/**
 * Where to navigate after a catalog launch so chat seeds are visible.
 * Tier-B hub tools (PR3, Wells/PERC, etc.) open /dashboard; Tier-A keeps dedicated routes.
 * @param {{ path: string|null, chatSeed: string|null }} launch
 * @returns {string|null}
 */
export function resolveNavigationPathForLaunch(launch) {
  if (!launch) return null;
  if (launch.chatSeed && isCalculatorsHubPath(launch.path)) {
    return '/dashboard';
  }
  if (launch.path) return launch.path;
  if (launch.chatSeed) return '/dashboard';
  return null;
}

const EMPTY_LAUNCH = Object.freeze({
  path: null,
  registryId: null,
  chatSeed: null,
  orchestratorTool: null,
  openLabel: 'Try in chat',
});

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
 * Resolve orchestrator API tool param only when backend executor is actually registered.
 * @param {string} nluToolId
 * @param {string|null} registryId
 * @param {boolean} [backendExecutable]
 */
export function resolveOrchestratorToolForLaunch(nluToolId, registryId, backendExecutable = false) {
  const fromRegistry = registryIdToOrchestratorTool(registryId);
  if (fromRegistry && ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS.includes(fromRegistry)) {
    return fromRegistry;
  }
  if (backendExecutable && ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS.includes(nluToolId)) {
    return nluToolId;
  }
  return null;
}

/**
 * @param {{ toolId?: string, registryId?: string|null }} ids
 */
export function findClinicalIntentProfile({ toolId, registryId }) {
  if (toolId && clinicalIntentToolsById[toolId]) {
    return clinicalIntentToolsById[toolId];
  }
  if (registryId) {
    const byRegistry = clinicalIntentTools.find(
      (t) => t.toolId === registryId || t.sidebarToolId === registryId
    );
    if (byRegistry) return byRegistry;
  }
  if (toolId && ORCHESTRATOR_TO_REGISTRY_ID[toolId]) {
    const mappedRegistry = ORCHESTRATOR_TO_REGISTRY_ID[toolId];
    return (
      clinicalIntentToolsById[toolId] ||
      clinicalIntentTools.find((t) => t.sidebarToolId === mappedRegistry) ||
      null
    );
  }
  return null;
}

function launchFromNlu(nlu) {
  const registryId =
    nlu.sidebarToolId || ORCHESTRATOR_TO_REGISTRY_ID[nlu.toolId] || NLU_TO_REGISTRY_ID[nlu.toolId];
  const registryEntry = registryId ? toolRegistryById[registryId] : null;
  const path =
    nlu.path ||
    registryEntry?.path ||
    (registryId === REGISTRY.calculatorsHub ? CALCULATORS_HUB_PATH : null);

  const chatSeed =
    nlu.chatSeed ||
    `Help me use the ${nlu.toolName}. ${nlu.description || ''}`.trim();

  return {
    path,
    registryId: registryId || null,
    chatSeed,
    orchestratorTool: resolveOrchestratorToolForLaunch(
      nlu.toolId,
      registryId,
      Boolean(nlu.backendExecutable)
    ),
    openLabel: isCalculatorsHubPath(path)
      ? 'Start guided chat'
      : path
        ? 'Open'
        : 'Try in chat',
  };
}

function launchFromBuiltinCalc(calc) {
  const registryId = BUILTIN_CALC_ID_TO_REGISTRY_ID[calc.id] ?? REGISTRY.calculatorsHub;
  return {
    path: calc.path || calc.calcQuery?.split('?')[0] || CALCULATORS_HUB_PATH,
    registryId,
    chatSeed: `Open the ${calc.name} calculator and help me interpret the results.`,
    orchestratorTool: resolveOrchestratorToolForLaunch(
      calc.orchestratorId,
      registryId,
      Boolean(calc.orchestratorId)
    ),
    openLabel: 'Open calculator',
  };
}

function launchFromRegistry(registryEntry, registryId) {
  const nlu = findClinicalIntentProfile({ registryId });
  if (nlu) {
    return launchFromNlu(nlu);
  }
  return {
    path: registryEntry.path,
    registryId,
    chatSeed: `Help me with ${registryEntry.name}: ${registryEntry.description}`,
    orchestratorTool: resolveOrchestratorToolForLaunch(null, registryId, false),
    openLabel: 'Open',
  };
}

/**
 * @param {string} id - catalog row id (registry, NLU toolId, calculator slug, alias)
 * @returns {{ path: string|null, registryId: string|null, chatSeed: string|null, orchestratorTool: string|null, openLabel: string }}
 */
export function resolveCatalogLaunch(id) {
  if (!id) return { ...EMPTY_LAUNCH };

  const registryId = resolveRegistryId(id);
  const nlu = findClinicalIntentProfile({ toolId: id, registryId });
  if (nlu) {
    return launchFromNlu(nlu);
  }

  const builtin = builtinUiCalculators.find((c) => c.id === id);
  if (builtin) {
    return launchFromBuiltinCalc(builtin);
  }

  const registryEntry = registryId ? toolRegistryById[registryId] : null;
  if (registryEntry) {
    return launchFromRegistry(registryEntry, registryId);
  }

  if (registryId && registryId !== id) {
    return resolveCatalogLaunch(registryId);
  }

  return { ...EMPTY_LAUNCH };
}

/** NLU hub-only tools (no dedicated Calculators.jsx form). */
export const NLU_HUB_ONLY_TOOL_IDS = Object.freeze(
  nluCalculatorHubOnly.map((row) => row.toolId)
);

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

export { EMPTY_LAUNCH as CATALOG_EMPTY_LAUNCH };
