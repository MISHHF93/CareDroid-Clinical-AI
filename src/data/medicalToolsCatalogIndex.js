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
import { resolveCatalogLaunch } from './clinicalCatalogWiring';
import {
  BUILTIN_CALC,
  KEYWORD_ROUTED_REGISTRY_IDS,
  REGISTRY,
} from './clinicalToolIdContract';
import { enrichMedicalCatalogRow, normalizeCatalogCategory } from '../utils/catalogSearch';

/** Keyword-routed in chat but not separate NLU tool profiles */
export const chatKeywordExtras = [];

function accessSummary(row) {
  const parts = [];
  if (row.pagePath) parts.push('Page');
  if (row.uiCalculatorSlug) parts.push('Form');
  if (row.chatOnRequest) parts.push('Chat');
  if (row.backendExecutor) parts.push('API');
  return parts.length ? parts.join(' · ') : 'Chat';
}

function buildFromNlu(nlu) {
  const launch = resolveCatalogLaunch(nlu.toolId);
  const uiCalc = builtinUiCalculators.find(
    (c) =>
      c.orchestratorId === nlu.toolId ||
      c.id === nlu.toolId ||
      (nlu.toolId === 'cha2ds2vasc-calculator' && c.id === 'chads2vasc')
  );
  const hubOnly = nluCalculatorHubOnly.some((h) => h.toolId === nlu.toolId);

  return {
    primaryId: nlu.toolId,
    id: nlu.toolId,
    name: nlu.toolName,
    category: nlu.category,
    description: nlu.description,
    pagePath: nlu.path || launch.path,
    sidebarToolId: nlu.sidebarToolId || launch.registryId,
    chatOnRequest: true,
    chatSeed: nlu.chatSeed || launch.chatSeed || '',
    backendExecutor: Boolean(nlu.backendExecutable),
    uiCalculatorSlug: uiCalc?.id || null,
    chatOnlyForm: hubOnly,
    accessSummary: null,
    source: 'NLU (tool.patterns.ts)',
  };
}

function buildFromRegistry(reg) {
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
    name: reg.name,
    category: normalizeCatalogCategory(reg.category),
    description: reg.description,
    pagePath: reg.path,
    sidebarToolId: reg.id,
    chatOnRequest: Boolean(matchedNlu) || keywordRouted,
    chatSeed: matchedNlu?.chatSeed || launch.chatSeed || '',
    backendExecutor: Boolean(matchedNlu?.backendExecutable),
    uiCalculatorSlug: uiCalc?.id || reg.initialCalc || null,
    chatOnlyForm: false,
    accessSummary: null,
    source: matchedNlu ? 'toolRegistry + NLU' : 'toolRegistry.js',
    registryOnly: !matchedNlu,
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
      byId.set(row.id, row);
    }
  }

  for (const extra of chatKeywordExtras) {
    const row = { ...extra, accessSummary: accessSummary(extra) };
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
