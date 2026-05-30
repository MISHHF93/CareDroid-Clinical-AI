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
  NLU_HUB_ONLY_PROFILE_TOOL_IDS,
  NLU_PROFILE_TOOL_IDS,
  NLU_TO_REGISTRY_ID,
  REGISTRY_ID_TO_ORCHESTRATOR_TOOL,
  REGISTRY,
  TOOL_LAUNCH_PATHS,
  registryToPrimaryNluToolId,
} from './clinicalToolIdContract';
import { ensureChatSeedGuardrails } from './clinicalSafetyGuardrails';
import { isOrchestratorPostExecutable } from './unsupportedOrchestratorTools';
import { resolveToolInventoryRecord, TOOL_LAUNCH_TYPES } from './toolInventory';

export * from './clinicalToolIdContract';

const CALCULATORS_HUB_PATH = TOOL_LAUNCH_PATHS.calculatorsHub;

export function isCalculatorsHubPath(path) {
  if (!path) return false;
  const normalized = String(path).replace(/\/+$/, '');
  return normalized === CALCULATORS_HUB_PATH;
}

/**
 * Where to navigate after a catalog launch so chat seeds are visible.
 * Tier-B hub tools (PR3, Wells/PERC, etc.) open /assistant; Tier-A keeps dedicated routes.
 * @param {{ path: string|null, chatSeed: string|null }} launch
 * @returns {string|null}
 */
export function resolveNavigationPathForLaunch(launch) {
  if (!launch) return null;
  if (launch.chatSeed && isCalculatorsHubPath(launch.path)) {
    return '/assistant';
  }
  if (launch.path) return launch.path;
  if (launch.chatSeed) return '/assistant';
  return null;
}

const EMPTY_LAUNCH = Object.freeze({
  path: null,
  registryId: null,
  chatSeed: null,
  orchestratorTool: null,
  openLabel: 'Try in chat',
});

/** Safe generic chat when an id cannot be mapped to a shipped tool (no fake routes). */
export const CATALOG_UNKNOWN_TOOL_LAUNCH = Object.freeze({
  path: '/assistant',
  registryId: null,
  chatSeed: ensureChatSeedGuardrails({
    toolId: 'unknown-clinical-tool',
    category: 'calculator',
    chatSeed:
      'Help me find the right CareDroid clinical tool for my question. Ask which calculator, risk score, checker, or protocol applies. Clinical decision support only — does not establish a diagnosis or replace clinician judgment.',
  }),
  orchestratorTool: null,
  openLabel: 'Try in chat',
});

function buildGuardedChatSeed({ toolId, sidebarToolId, category, chatSeed }) {
  if (!chatSeed) return null;
  return ensureChatSeedGuardrails({
    toolId,
    sidebarToolId,
    category,
    chatSeed,
  });
}

function isHubOnlyNluToolId(toolId) {
  return NLU_HUB_ONLY_PROFILE_TOOL_IDS.includes(toolId);
}

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
  if (fromRegistry && isOrchestratorPostExecutable(fromRegistry)) {
    return fromRegistry;
  }
  if (backendExecutable && nluToolId && isOrchestratorPostExecutable(nluToolId)) {
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

/**
 * Prefer a dedicated registry row keyed by NLU id, then canonical maps, then sidebar fallback.
 * @param {{ toolId: string, sidebarToolId?: string }} nlu
 */
export function resolveNluRegistryId(nlu) {
  if (nlu.toolId && toolRegistryById[nlu.toolId]) {
    return nlu.toolId;
  }
  return (
    ORCHESTRATOR_TO_REGISTRY_ID[nlu.toolId] ||
    NLU_TO_REGISTRY_ID[nlu.toolId] ||
    nlu.sidebarToolId ||
    null
  );
}

function launchFromNlu(nlu) {
  const registryId = resolveNluRegistryId(nlu);
  const registryEntry = registryId ? toolRegistryById[registryId] : null;
  const hubOnly = isHubOnlyNluToolId(nlu.toolId) || isCalculatorsHubPath(nlu.path);
  const path =
    nlu.path ||
    registryEntry?.path ||
    (hubOnly || registryId === REGISTRY.calculatorsHub ? CALCULATORS_HUB_PATH : null);

  const rawSeed =
    nlu.chatSeed ||
    `Help me use the ${nlu.toolName}. ${nlu.description || ''}`.trim();
  const chatSeed = buildGuardedChatSeed({
    toolId: nlu.toolId,
    sidebarToolId: registryId,
    category: nlu.category,
    chatSeed: rawSeed,
  });

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
  const chatSeed = buildGuardedChatSeed({
    toolId: calc.orchestratorId || calc.id,
    sidebarToolId: registryId,
    category: 'calculator',
    chatSeed: `Open the ${calc.name} calculator and help me interpret the results as clinical decision support only.`,
  });
  return {
    path: calc.path || calc.calcQuery?.split('?')[0] || CALCULATORS_HUB_PATH,
    registryId,
    chatSeed,
    orchestratorTool: resolveOrchestratorToolForLaunch(
      calc.orchestratorId,
      registryId,
      calc.orchestratorId ? isOrchestratorPostExecutable(calc.orchestratorId) : false
    ),
    openLabel: 'Open calculator',
  };
}

function launchFromInventoryRecord(record) {
  const chatSeed =
    record.chatSeed ||
    buildGuardedChatSeed({
      toolId: record.nluToolId || record.id,
      sidebarToolId: record.id,
      category: record.category || 'tool',
      chatSeed: `Open the ${record.label || record.id} tool and help me interpret it as clinical decision support only.`,
    });
  const openLabel =
    record.launchType === TOOL_LAUNCH_TYPES.LOCAL_ONLY
      ? 'Open'
      : record.launchType === TOOL_LAUNCH_TYPES.CHAT_ASSISTED
        ? 'Start guided chat'
        : record.route
          ? 'Open'
          : 'Try in chat';

  return {
    path:
      record.launchType === TOOL_LAUNCH_TYPES.CHAT_ASSISTED &&
      (!record.route || String(record.route).startsWith(`${CALCULATORS_HUB_PATH}/`) || isCalculatorsHubPath(record.route))
        ? CALCULATORS_HUB_PATH
        : record.route,
    registryId: record.sidebarVisible ? record.id : record.id || null,
    chatSeed,
    orchestratorTool: record.orchestratorToolId || null,
    openLabel,
  };
}

function launchFromRegistry(registryEntry, registryId) {
  const nlu =
    findClinicalIntentProfile({ registryId }) ||
    (() => {
      const primaryNlu = registryToPrimaryNluToolId(registryId);
      return primaryNlu
        ? findClinicalIntentProfile({ toolId: primaryNlu, registryId })
        : null;
    })();
  if (nlu) {
    return launchFromNlu(nlu);
  }
  const chatSeed = buildGuardedChatSeed({
    toolId: registryToPrimaryNluToolId(registryId) || registryId,
    sidebarToolId: registryId,
    category: registryEntry.category?.toLowerCase() || 'tool',
    chatSeed: `Help me with ${registryEntry.name}: ${registryEntry.description}. Clinical decision support only.`,
  });
  return {
    path: registryEntry.path,
    registryId,
    chatSeed,
    orchestratorTool: resolveOrchestratorToolForLaunch(null, registryId, false),
    openLabel: registryEntry.path ? 'Open' : 'Try in chat',
  };
}

/**
 * Last-resort launch when id is not in catalog rows but is tool-shaped (no invented routes).
 * @param {string} id
 */
export function resolveCatalogLaunchFallback(id) {
  if (!id) return { ...EMPTY_LAUNCH };

  const registryId = resolveRegistryId(id);
  if (registryId) {
    const registryEntry = toolRegistryById[registryId];
    if (registryEntry) {
      return launchFromRegistry(registryEntry, registryId);
    }
  }

  if (NLU_PROFILE_TOOL_IDS.includes(id) && clinicalIntentToolsById[id]) {
    return launchFromNlu(clinicalIntentToolsById[id]);
  }

  const primaryNlu = registryId ? registryToPrimaryNluToolId(registryId) : null;
  if (primaryNlu && clinicalIntentToolsById[primaryNlu]) {
    return launchFromNlu(clinicalIntentToolsById[primaryNlu]);
  }

  if (!/^[a-z][a-z0-9-]*$/i.test(String(id))) {
    return { ...EMPTY_LAUNCH };
  }

  return {
    ...CATALOG_UNKNOWN_TOOL_LAUNCH,
    registryId: registryId || null,
    chatSeed: buildGuardedChatSeed({
      toolId: primaryNlu || id,
      sidebarToolId: registryId || undefined,
      category: 'calculator',
      chatSeed: `The tool "${id}" is not recognized in CareDroid. Help me open the clinical tools catalog and pick the right calculator, score, checker, or protocol. Clinical decision support only — does not establish a diagnosis or replace clinician judgment.`,
    }),
  };
}

/**
 * @param {string} id - catalog row id (registry, NLU toolId, calculator slug, alias)
 * @returns {{ path: string|null, registryId: string|null, chatSeed: string|null, orchestratorTool: string|null, openLabel: string }}
 */
export function resolveCatalogLaunch(id) {
  if (!id) return { ...EMPTY_LAUNCH };

  const inventoryRecord = resolveToolInventoryRecord(id);
  if (inventoryRecord && inventoryRecord.sourceKind !== 'platform') {
    return launchFromInventoryRecord(inventoryRecord);
  }

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
    const viaRegistry = resolveCatalogLaunch(registryId);
    if (viaRegistry.path || viaRegistry.chatSeed) {
      return viaRegistry;
    }
  }

  return resolveCatalogLaunchFallback(id);
}

/** NLU hub-only tools (no dedicated Calculators.jsx form). */
export const NLU_HUB_ONLY_TOOL_IDS = Object.freeze(
  nluCalculatorHubOnly
    .map((row) => row.toolId)
    .filter((toolId) => !BUILTIN_CALC_ID_TO_REGISTRY_ID[toolId])
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
