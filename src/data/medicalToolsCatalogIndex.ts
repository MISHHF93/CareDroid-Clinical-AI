/**
 * Authoritative index of medical tools & calculators for the clinical catalog.
 * Includes everything the NLU layer can route in chat (tool.patterns.ts) plus
 * all sidebar pages and calculator forms in the UI.
 */

import toolRegistry from './toolRegistry';
import {
  builtinUiCalculators,
  clinicalIntentTools,
  nluCalculatorHubOnly,
} from './clinicalIntentToolCatalog';
import { isCalculatorsHubPath, resolveCatalogLaunch } from './clinicalCatalogWiring';
import {
  BUILTIN_CALC,
  KEYWORD_ROUTED_REGISTRY_IDS,
  MEDICAL_EXPANSION_CATEGORY_PACKS,
  REGISTRY,
} from './clinicalToolIdContract';
import {
  resolveToolInventoryRecord,
  TOOL_EXECUTOR_STATUS,
  TOOL_LAUNCH_TYPES,
} from './toolInventory';
import { PLATFORM_SYSTEM_CAPABILITIES } from './platformSystems';
import { enrichMedicalCatalogRow, normalizeCatalogCategory } from '../utils/catalogSearch';

/** Keyword-routed in chat but not separate NLU tool profiles */
export const chatKeywordExtras = [] as any[];

function accessSummary(row) {
  const parts = [] as any[];
  if (row.pagePath) parts.push('Page');
  if (row.uiCalculatorSlug) parts.push('Form');
  if (row.chatOnRequest) parts.push('Chat');
  if (row.backendExecutor) parts.push('API');
  return parts.length ? parts.join(' · ') : 'Chat';
}

function buildFromNlu(nlu) {
  const inventoryRecord = resolveToolInventoryRecord(nlu.toolId);
  const launch = resolveCatalogLaunch(nlu.toolId);
  const uiCalc = builtinUiCalculators.find(
    (c) =>
      c.orchestratorId === nlu.toolId ||
      c.id === nlu.toolId ||
      (nlu.toolId === 'cha2ds2vasc-calculator' && c.id === 'chads2vasc')
  );
  const hasDedicatedForm = Boolean(inventoryRecord?.calculatorSlug || uiCalc);
  const hubOnly =
    (nluCalculatorHubOnly.some((h) => h.toolId === nlu.toolId) && !hasDedicatedForm) ||
    Boolean(!uiCalc && nlu.path && isCalculatorsHubPath(nlu.path) && !nlu.backendExecutable);

  return {
    primaryId: nlu.toolId,
    id: nlu.toolId,
    name: nlu.toolName || inventoryRecord?.label,
    category: nlu.category || inventoryRecord?.category,
    description: nlu.description || inventoryRecord?.safetyCopy,
    pagePath: inventoryRecord?.route || nlu.path || launch.path,
    sidebarToolId: nlu.sidebarToolId || launch.registryId || inventoryRecord?.id,
    chatOnRequest: true,
    chatSeed: inventoryRecord?.chatSeed || nlu.chatSeed || launch.chatSeed || '',
    backendExecutor: Boolean(
      nlu.backendExecutable || inventoryRecord?.executorStatus === TOOL_EXECUTOR_STATUS.REGISTERED
    ),
    uiCalculatorSlug: inventoryRecord?.calculatorSlug || uiCalc?.id || null,
    chatOnlyForm:
      hubOnly ||
      (inventoryRecord?.launchType === TOOL_LAUNCH_TYPES.CHAT_ASSISTED && !hasDedicatedForm),
    accessSummary: null as any,
    source: 'NLU (tool.patterns.ts)',
  };
}

function buildFromRegistry(reg) {
  const inventoryRecord = resolveToolInventoryRecord(reg.id);
  const launch = resolveCatalogLaunch(reg.id);
  const uiCalc = builtinUiCalculators.find(
    (c) =>
      c.id === reg.initialCalc ||
      (reg.id === REGISTRY.sofaScore && c.id === BUILTIN_CALC.sofa) ||
      (reg.id === REGISTRY.calcGfr && c.id === BUILTIN_CALC.gfr)
  );
  const matchedNlu = clinicalIntentTools.find(
    (n) => n.sidebarToolId === reg.id || n.path === reg.path
  );
  const keywordRouted = KEYWORD_ROUTED_REGISTRY_IDS.includes(reg.id);

  return {
    primaryId: matchedNlu?.toolId || reg.id,
    id: reg.id,
    name: inventoryRecord?.label || reg.name,
    category: normalizeCatalogCategory(inventoryRecord?.category || reg.category),
    description: inventoryRecord?.safetyCopy || reg.description,
    pagePath: inventoryRecord?.route || reg.path,
    sidebarToolId: reg.id,
    chatOnRequest: Boolean(matchedNlu) || keywordRouted,
    chatSeed: inventoryRecord?.chatSeed || matchedNlu?.chatSeed || launch.chatSeed || '',
    backendExecutor: Boolean(
      inventoryRecord?.executorStatus === TOOL_EXECUTOR_STATUS.REGISTERED ||
        (inventoryRecord?.endpoint && inventoryRecord?.launchType === TOOL_LAUNCH_TYPES.BACKEND_BACKED)
    ),
    uiCalculatorSlug: inventoryRecord?.calculatorSlug || uiCalc?.id || reg.initialCalc || null,
    chatOnlyForm: false,
    accessSummary: null as any,
    source: matchedNlu ? 'toolRegistry + NLU' : 'toolRegistry.js',
    registryOnly: !matchedNlu,
  };
}

function buildFromPlatformCapability(capability) {
  const inventoryRecord = resolveToolInventoryRecord(capability.id);
  return {
    primaryId: capability.id,
    id: capability.id,
    name: capability.name,
    category: normalizeCatalogCategory(capability.category),
    description: capability.summary,
    pagePath: capability.route,
    routeAliases: capability.routeAliases || [],
    sidebarToolId: capability.id,
    chatOnRequest: Boolean(capability.chatSeed),
    chatSeed: capability.chatSeed || '',
    backendExecutor: Boolean(inventoryRecord?.endpoint || capability.endpoint),
    uiCalculatorSlug: null,
    chatOnlyForm: false,
    accessSummary: inventoryRecord?.endpoint ? 'Platform API' : 'Page',
    source: 'platformSystems.js',
    platformSystem: true,
  };
}

/**
 * Complete medical tools + calculators list (one row per NLU tool, plus registry-only & keyword extras).
 */
export function getMedicalToolsCatalogRows() {
  const byId = new Map();

  for (const nlu of clinicalIntentTools) {
    const row = buildFromNlu(nlu);
    row.accessSummary = accessSummary(row);
    byId.set(row.primaryId, row);
  }

  for (const reg of toolRegistry) {
    const row = buildFromRegistry(reg);
    const existing = byId.get(row.primaryId);
    if (existing) {
      byId.set(row.primaryId, {
        ...existing,
        sidebarToolId: existing.sidebarToolId || row.sidebarToolId,
        uiCalculatorSlug: existing.uiCalculatorSlug || row.uiCalculatorSlug,
        pagePath: existing.pagePath || row.pagePath,
        source: 'NLU + toolRegistry',
      });
    } else if (row.registryOnly) {
      row.accessSummary = accessSummary(row);
      byId.set(reg.id, row);
    }

    // Sidebar shortcuts (e.g. calculators hub, procedures) must appear even when NLU rows share sidebarToolId.
    if (!byId.has(reg.id)) {
      const shortcut: any = buildFromRegistry(reg);
      shortcut.primaryId = reg.id;
      shortcut.id = reg.id;
      shortcut.sidebarToolId = reg.id;
      shortcut.name = reg.name;
      shortcut.description = reg.description || shortcut.description;
      shortcut.pagePath = reg.path;
      shortcut.registryShortcut = true;
      shortcut.chatOnRequest = shortcut.chatOnRequest || Boolean(shortcut.chatSeed);
      if (reg.initialCalc) {
        shortcut.uiCalculatorSlug = reg.initialCalc;
      }
      shortcut.accessSummary = accessSummary(shortcut);
      byId.set(reg.id, shortcut);
    }
  }

  for (const extra of chatKeywordExtras) {
    const row = { ...extra, accessSummary: accessSummary(extra) };
    if (!byId.has(row.primaryId)) {
      byId.set(row.primaryId, row);
    }
  }

  for (const capability of PLATFORM_SYSTEM_CAPABILITIES) {
    const row = buildFromPlatformCapability(capability);
    if (!byId.has(row.primaryId)) {
      byId.set(row.primaryId, row);
    }
  }

  return [...byId.values()].map(enrichMedicalCatalogRow);
}

export function getMedicalCatalogSummary() {
  const rows = getMedicalToolsCatalogRows();
  return {
    total: rows.length,
    nluProfiles: clinicalIntentTools.length,
    calculatorForms: builtinUiCalculators.length,
    sidebarTools: toolRegistry.length,
    chatOnRequest: rows.filter((r) => r.chatOnRequest).length,
    withPage: rows.filter((r) => r.pagePath).length,
    withApi: rows.filter((r) => r.backendExecutor).length,
    chatOnlyForms: rows.filter((r) => r.chatOnlyForm).length,
    hubOnlyCalculators: nluCalculatorHubOnly.length,
  };
}

export function getMedicalExpansionCategoryPackRows() {
  return MEDICAL_EXPANSION_CATEGORY_PACKS.map((pack) => ({
    id: pack.id,
    name: pack.label,
    tierAToolIds: [...pack.tierA],
    tierBToolIds: [...pack.tierB],
    tierCToolIds: [...pack.tierC],
    totalTools: new Set([...pack.tierA, ...pack.tierB, ...pack.tierC]).size,
  }));
}

export function getPlatformSystemsCatalogRows() {
  return PLATFORM_SYSTEM_CAPABILITIES.map(buildFromPlatformCapability);
}
