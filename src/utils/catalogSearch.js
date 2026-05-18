/**
 * Catalog search, category normalization, and launchability helpers.
 * Used by ClinicalToolCatalog and PR consistency tests.
 */

import { resolveCatalogLaunch } from '../data/clinicalCatalogWiring';
import {
  CLINICAL_TIER_B_CHAT_REGISTRY_IDS,
  NLU_TO_REGISTRY_ID,
  ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS,
} from '../data/clinicalToolIdContract';
import { toolIdAliases } from '../data/sourceCodeToolDiscovery';

const NON_EXECUTABLE_DISCOVERY_STATUSES = new Set(['phantom', 'marketing-copy']);

/** @deprecated Use ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS from clinicalToolIdContract */
export const ORCHESTRATOR_REGISTERED_NLU_IDS = ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS;

let aliasesByCanonical = null;

function getAliasesByCanonical() {
  if (aliasesByCanonical) return aliasesByCanonical;
  aliasesByCanonical = new Map();
  const add = (canonical, alias) => {
    if (!canonical || !alias) return;
    const key = String(canonical);
    if (!aliasesByCanonical.has(key)) aliasesByCanonical.set(key, new Set());
    aliasesByCanonical.get(key).add(String(alias));
  };
  for (const [alias, canonical] of Object.entries(NLU_TO_REGISTRY_ID)) {
    add(canonical, alias);
  }
  for (const { id, mapsTo } of toolIdAliases) {
    add(mapsTo, id);
  }
  return aliasesByCanonical;
}

/** Lowercase category for filters and badges; hub-only rows use chat-assisted, not calculator. */
export function normalizeCatalogCategory(category, { chatOnlyForm = false } = {}) {
  const base = !category ? 'tool' : String(category).toLowerCase().trim();
  if (chatOnlyForm && base !== 'fleet') return 'chat-assisted';
  return base;
}

/** Alias and phrase terms that should match catalog search for the given ids. */
export function getSearchTermsForCatalogIds(...ids) {
  const terms = new Set();
  const byCanonical = getAliasesByCanonical();
  for (const raw of ids) {
    if (!raw) continue;
    const id = String(raw);
    terms.add(id);
    const aliases = byCanonical.get(id);
    if (aliases) {
      for (const a of aliases) terms.add(a);
    }
  }
  return [...terms];
}

export function buildMedicalCatalogSearchBlob(row) {
  const terms =
    row.searchTerms ||
    getSearchTermsForCatalogIds(row.primaryId, row.id, row.sidebarToolId);
  return [
    row.name,
    row.primaryId,
    row.id,
    row.sidebarToolId,
    row.category,
    row.description,
    row.accessSummary,
    ...terms,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function matchesCatalogRow(row, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return true;
  return buildMedicalCatalogSearchBlob(row).includes(q);
}

export function catalogRowsMatchingQuery(rows, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((row) => matchesCatalogRow(row, q));
}

export function isOrchestratorRegisteredNlu(toolId) {
  return ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS.includes(toolId);
}

function resolveAccessTier(row) {
  if (row.chatOnlyForm) return 'chat-assisted';
  if (row.uiCalculatorSlug && row.pagePath) return 'calculator-form';
  if (row.pagePath) return 'clinical-page';
  if (row.backendExecutor && isOrchestratorRegisteredNlu(row.primaryId || row.id)) {
    return 'backend-api';
  }
  if (row.backendExecutor) return 'nlu-api-intent';
  return 'chat-only';
}

function resolveLaunchLabel(row, launch) {
  if (row.chatOnlyForm) return 'Start guided chat';
  const registryId = row.sidebarToolId || row.primaryId || row.id;
  if (
    CLINICAL_TIER_B_CHAT_REGISTRY_IDS.includes(registryId) &&
    !row.uiCalculatorSlug
  ) {
    return 'Start guided chat';
  }
  if (launch.path) return 'Open';
  if (launch.chatSeed) return 'Try in chat';
  return 'Launch';
}

/**
 * Adds searchTerms, normalized category, launchable, launchLabel, and API tier flags.
 */
export function enrichMedicalCatalogRow(row) {
  const launchId = row.primaryId || row.id;
  const launch = resolveCatalogLaunch(launchId);
  const category = normalizeCatalogCategory(row.category, {
    chatOnlyForm: row.chatOnlyForm,
  });
  const searchTerms = getSearchTermsForCatalogIds(
    row.primaryId,
    row.id,
    row.sidebarToolId
  );
  const launchable = Boolean(launch.path || launch.chatSeed);
  const primaryId = row.primaryId || row.id;
  const backendApiRegistered = isOrchestratorRegisteredNlu(primaryId);
  const backendApiIntentOnly = Boolean(row.backendExecutor && !backendApiRegistered);

  return {
    ...row,
    category,
    searchTerms,
    launchable,
    launchLabel: launchable ? resolveLaunchLabel(row, launch) : null,
    accessTier: resolveAccessTier({ ...row, category }),
    backendApiRegistered,
    backendApiIntentOnly,
  };
}

export function buildDiscoveredSearchBlob(row) {
  const terms = getSearchTermsForCatalogIds(row.id, row.mapsTo);
  return [
    row.id,
    row.name,
    row.notes,
    row.source,
    row.status,
    row.category,
    row.mapsTo,
    row.apiPath,
    row.protocolReference,
    ...terms,
    ...(row.sources || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function matchesDiscoveredRow(row, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return true;
  return buildDiscoveredSearchBlob(row).includes(q);
}

export function isDiscoveredRowLaunchable(row) {
  if (NON_EXECUTABLE_DISCOVERY_STATUSES.has(row.status)) return false;
  if (row.path && String(row.path).includes(':')) return false;
  const launchId = row.mapsTo || row.id;
  if (row.status === 'alias' && !row.mapsTo) return false;
  const launch = resolveCatalogLaunch(launchId);
  const hasPath = Boolean(
    (row.path && !String(row.path).includes(':')) || launch.path
  );
  return hasPath || Boolean(launch.chatSeed);
}

export function getDiscoveredLaunchLabel(row) {
  if (!isDiscoveredRowLaunchable(row)) return null;
  if (row.status === 'alias') return 'Open canonical';
  const launch = resolveCatalogLaunch(row.mapsTo || row.id);
  if (row.chatOnly || (row.status === 'nlu-chat' && !row.path && launch.chatSeed)) {
    return 'Start guided chat';
  }
  if (row.status === 'orchestrator' || row.status === 'backend-executor') {
    return 'View in catalog';
  }
  if (launch.path) return 'Open';
  if (launch.chatSeed) return 'Try in chat';
  return 'Launch';
}

/** Unique normalized categories for medical rows (filter dropdown integrity). */
export function getMedicalCatalogCategories(rows) {
  return [...new Set(rows.map((r) => r.category).filter(Boolean))].sort();
}
