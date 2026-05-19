/**
 * Catalog search, category normalization, and launchability helpers.
 * Used by ClinicalToolCatalog and PR consistency tests.
 */

import { resolveCatalogLaunch } from '../data/clinicalCatalogWiring';
import {
  CLINICAL_TIER_B_CHAT_REGISTRY_IDS,
  NLU_TO_REGISTRY_ID,
  ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS,
  ORCHESTRATOR_TO_REGISTRY_ID,
} from '../data/clinicalToolIdContract';
import { clinicalIntentTools } from '../data/clinicalIntentToolCatalog';
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
  for (const [nluId, registryId] of Object.entries(ORCHESTRATOR_TO_REGISTRY_ID)) {
    add(registryId, nluId);
    add(nluId, registryId);
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

/**
 * Match free text against a query, expanding optional catalog ids to NLU/registry aliases.
 * @param {string} text
 * @param {string} query
 * @param {{ ids?: string[] }} [options]
 */
export function textMatchesCatalogQuery(text, query, { ids = [] } = {}) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return true;
  const terms = getSearchTermsForCatalogIds(...ids);
  const blob = [text, ...terms].filter(Boolean).join(' ').toLowerCase();
  return blob.includes(q);
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
    row.title,
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
const REQUIRED_MEDICAL_ROW_FIELDS = [
  'primaryId',
  'id',
  'title',
  'name',
  'category',
  'description',
  'searchTerms',
  'launchable',
  'accessSummary',
];

/**
 * @param {object} row
 * @returns {{ ok: boolean, missing: string[] }}
 */
export function validateMedicalCatalogRow(row) {
  const missing = REQUIRED_MEDICAL_ROW_FIELDS.filter((key) => {
    const val = row[key];
    if (val === null || val === undefined) return true;
    if (typeof val === 'string' && !val.trim()) return true;
    if (key === 'searchTerms' && (!Array.isArray(val) || val.length === 0)) return true;
    return false;
  });
  return { ok: missing.length === 0, missing };
}

export function enrichMedicalCatalogRow(row) {
  const launchId = row.primaryId || row.id;
  const launch = resolveCatalogLaunch(launchId);
  const category = normalizeCatalogCategory(row.category, {
    chatOnlyForm: row.chatOnlyForm,
  });
  const searchTerms = getSearchTermsForCatalogIds(
    row.primaryId,
    row.id,
    row.sidebarToolId,
    launch.registryId
  );
  const launchable = Boolean(launch.path || launch.chatSeed);
  const primaryId = row.primaryId || row.id;
  const nluToolId =
    clinicalIntentPrimaryId(primaryId) ||
    (ORCHESTRATOR_TO_REGISTRY_ID[primaryId] ? primaryId : null);
  const backendApiRegistered = Boolean(
    nluToolId && isOrchestratorRegisteredNlu(nluToolId)
  );
  const backendApiIntentOnly = Boolean(row.backendExecutor && !backendApiRegistered);

  return {
    ...row,
    title: row.title || row.name,
    name: row.name || row.title,
    category,
    searchTerms,
    launchable,
    launchLabel: launchable ? resolveLaunchLabel(row, launch) : null,
    accessTier: resolveAccessTier({ ...row, category }),
    backendApiRegistered,
    backendApiIntentOnly,
    pagePath: row.pagePath || launch.path || null,
  };
}

function clinicalIntentPrimaryId(id) {
  if (!id) return null;
  if (ORCHESTRATOR_TO_REGISTRY_ID[id]) return id;
  return null;
}

/**
 * Normalize discovery scan rows for display (categories, status labels, search).
 */
export function enrichDiscoveredCatalogRow(row) {
  const chatOnly =
    Boolean(row.chatOnly) ||
    (row.status === 'nlu-chat' && !row.path) ||
    (row.status === 'nlu-chat' && row.path === '/tools/calculators');
  const category = normalizeCatalogCategory(row.category, { chatOnlyForm: chatOnly });
  const nluId = row.mapsTo || row.id;
  const nluProfile = clinicalIntentTools.find((t) => t.toolId === nluId);
  const tierCIntent = Boolean(nluProfile?.backendExecutable);
  const backendRegistered = isOrchestratorRegisteredNlu(nluId);
  let displayStatus = row.status;
  if ((row.status === 'backend-executor' || tierCIntent) && !backendRegistered) {
    displayStatus = 'nlu-api-intent';
  }
  if (row.status === 'orchestrator') {
    displayStatus = 'orchestrator';
  }
  const searchTerms = getSearchTermsForCatalogIds(row.id, row.mapsTo);
  const launch = resolveCatalogLaunch(row.mapsTo || row.id);

  return {
    ...row,
    title: row.title || row.name,
    name: row.name || row.title,
    category,
    displayStatus,
    searchTerms,
    chatOnly,
    launchable: isDiscoveredRowLaunchable(row),
    launchLabel: getDiscoveredLaunchLabel(row),
    backendApiRegistered: backendRegistered,
    backendApiIntentOnly: tierCIntent && !backendRegistered,
    mapsTo: row.mapsTo,
    notes: row.notes || '',
    path: row.path || launch.path || null,
  };
}

export function buildDiscoveredSearchBlob(row) {
  const enriched = row.searchTerms ? row : enrichDiscoveredCatalogRow(row);
  const terms = enriched.searchTerms || getSearchTermsForCatalogIds(enriched.id, enriched.mapsTo);
  return [
    enriched.id,
    enriched.name,
    enriched.title,
    enriched.notes,
    enriched.source,
    enriched.displayStatus || enriched.status,
    enriched.category,
    enriched.mapsTo,
    enriched.apiPath,
    enriched.protocolReference,
    ...terms,
    ...(enriched.sources || []),
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
  const normalized = rows.map((r) => normalizeCatalogCategory(r.category, { chatOnlyForm: r.chatOnlyForm }));
  return [...new Set(normalized.filter(Boolean))].sort();
}

/** No duplicate categories that differ only by case/spacing. */
export function assertCatalogCategoriesNormalized(rows) {
  const byKey = new Map();
  for (const row of rows) {
    const key = String(row.category || '')
      .toLowerCase()
      .trim();
    if (!key) continue;
    const prior = byKey.get(key);
    if (prior && prior !== row.category) {
      throw new Error(`Category spelling drift: "${prior}" vs "${row.category}"`);
    }
    byKey.set(key, row.category);
  }
}
