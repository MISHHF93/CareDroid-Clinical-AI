/**
 * Frontend ↔ backend NLU alias synchronization and drift reports.
 *
 * Backend keywords (tool.patterns.ts) drive NLU matching.
 * NLU_TO_REGISTRY_ID holds precise catalog / deep-link aliases only — not every keyword.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { clinicalIntentTools } from './clinicalIntentToolCatalog';
import {
  CLINICAL_TIER_B_CHAT_REGISTRY_IDS,
  NLU_HUB_ONLY_PROFILE_TOOL_IDS,
  NLU_PROFILE_TOOL_IDS,
  ORCHESTRATOR_TO_REGISTRY_ID,
  NLU_TO_REGISTRY_ID,
  PR1_CALCULATOR_REGISTRY_IDS,
  PR2_CALCULATOR_REGISTRY_IDS,
  PR3_CALCULATOR_REGISTRY_IDS,
  PR4A_CALCULATOR_REGISTRY_IDS,
  PR5_CALCULATOR_REGISTRY_IDS,
  PR6_CALCULATOR_REGISTRY_IDS,
  PR8_TIER_A_CALCULATOR_REGISTRY_IDS,
  PR9_TIER_B_CHAT_CALCULATOR_IDS,
  PR10_TIER_A_CALCULATOR_REGISTRY_IDS,
  PR11_TIER_A_CALCULATOR_REGISTRY_IDS,
  EMERGENCY_CRITICAL_CARE_TIER_A_CALCULATOR_REGISTRY_IDS,
  PR_FLEET_ALL_REGISTRY_IDS,
  REGISTRY,
} from './clinicalToolIdContract';
import { GRACE_ACS_REQUIRED_NLU_ALIASES } from './chatAssistedCalculators/graceAcs';
import { NIHSS_REQUIRED_NLU_ALIASES } from './chatAssistedCalculators/nihss';
import { CANADIAN_C_SPINE_REQUIRED_NLU_ALIASES } from './chatAssistedCalculators/canadianCSpine';
import { OTTAWA_ANKLE_REQUIRED_NLU_ALIASES } from './chatAssistedCalculators/ottawaAnkle';
import { PECARN_HEAD_REQUIRED_NLU_ALIASES } from './chatAssistedCalculators/pecarnHead';
import { NEXUS_CSPINE_REQUIRED_NLU_ALIASES } from './chatAssistedCalculators/nexusCSpine';
import { PR1_ALL_ALIAS_PAIRS } from './pr1TestConstants';
import { MELD_ALL_ALIAS_PAIRS } from './pr2MeldTestConstants';
import { TIMI_ALL_ALIAS_PAIRS } from './pr2TimiTestConstants';
import { WELLS_PE_ALL_ALIAS_PAIRS } from './pr2WellsPeTestConstants';
import { PERC_ALL_ALIAS_PAIRS } from './pr2PercTestConstants';
import { PR4A_ALL_ALIAS_PAIRS } from './pr4aTestConstants';
import { PR5_ALL_ALIAS_PAIRS } from './pr5TestConstants';
import { PR6_ALL_ALIAS_PAIRS } from './pr6TestConstants';
import { PR7_ALL_ALIAS_PAIRS } from './pr7TestConstants';
import { PR9_ALL_ALIAS_PAIRS, PR9_REQUIRED_NLU_ALIAS_PAIRS } from './pr9TestConstants';
import { NEW_CLINICAL_TOOLS_ALL_ALIAS_PAIRS } from './newClinicalToolsAuditConstants';
import { PR3_NLU_ALIAS_PAIRS, PR3_DISCOVERY_ALIAS_PAIRS } from './pr3TestConstants';
import { PR_FLEET_ALL_ALIAS_PAIRS } from './prFleetTestConstants';
import {
  aliasToSlug,
  normalizeAliasKey,
  parseClinicalToolPatternRecords,
  parseClinicalToolPatterns,
} from './parseToolPatterns';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const TOOL_PATTERNS_PATH = join(
  __dirname,
  '../../backend/src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns.ts'
);

/** Phantom / cost-tracking ids that must never map to a launchable registry via NLU_TO_REGISTRY_ID. */
export const PHANTOM_BLOCKED_CATALOG_ALIASES = Object.freeze([
  'abc-assessment',
  'chemo-calculator',
  'cancer-calculator',
  'tumor-staging',
  'medication-checker',
]);

/** Over-broad catalog keys — allowed only when explicitly listed (hub navigation). */
export const BROAD_CATALOG_ALIASES = Object.freeze(['calculator', 'dispatch']);

/**
 * Backend keywords shared across tools; matchToolPatterns applies disambiguation filters.
 * @type {readonly { keyword: string, toolIds: readonly string[], reason: string }[]}
 */
export const ALLOWED_BACKEND_KEYWORD_COLLISIONS = Object.freeze([
  {
    keyword: 'wells',
    toolIds: ['wells-pe', 'wells-dvt-calculator'],
    reason: 'preferWellsPe / preferWellsDvt disambiguation',
  },
  {
    keyword: 'wells score',
    toolIds: ['wells-pe', 'wells-dvt-calculator'],
    reason: 'preferWellsPe / preferWellsDvt disambiguation',
  },
  {
    keyword: 'gcs',
    toolIds: ['gcs-calculator', 'apache2-calculator', 'sofa-calculator', 'qsofa'],
    reason: 'parameter name vs GCS tool; context filters in matchToolPatterns',
  },
  {
    keyword: 'stroke',
    toolIds: ['has-bled', 'nihss', 'cha2ds2vasc-calculator'],
    reason: 'optional parameter / stroke scale; disambiguation prefers NIHSS when stroke scale phrased',
  },
  {
    keyword: 'cardiac risk',
    toolIds: ['ascvd-risk', 'heart-score'],
    reason: 'shared discovery phrase; downstream launcher disambiguates by explicit ASCVD vs HEART context',
  },
  {
    keyword: 'cardiac risk calculator',
    toolIds: ['ascvd-risk', 'heart-score'],
    reason: 'shared discovery phrase; downstream launcher disambiguates by explicit ASCVD vs HEART context',
  },
]);

/** Registry ids shipped in PR1–PR6 + fleet audits. */
export const AUDITED_CLINICAL_REGISTRY_IDS = Object.freeze([
  ...PR1_CALCULATOR_REGISTRY_IDS,
  ...PR2_CALCULATOR_REGISTRY_IDS,
  ...PR3_CALCULATOR_REGISTRY_IDS,
  ...PR4A_CALCULATOR_REGISTRY_IDS,
  ...PR5_CALCULATOR_REGISTRY_IDS,
  ...PR6_CALCULATOR_REGISTRY_IDS,
  ...PR8_TIER_A_CALCULATOR_REGISTRY_IDS,
  ...PR9_TIER_B_CHAT_CALCULATOR_IDS,
  ...PR10_TIER_A_CALCULATOR_REGISTRY_IDS,
  ...PR11_TIER_A_CALCULATOR_REGISTRY_IDS,
  ...EMERGENCY_CRITICAL_CARE_TIER_A_CALCULATOR_REGISTRY_IDS,
  ...PR_FLEET_ALL_REGISTRY_IDS,
  REGISTRY.drugCheck,
  REGISTRY.labInterp,
  REGISTRY.protocols,
  REGISTRY.diagnosis,
  REGISTRY.procedures,
  REGISTRY.sofaScore,
  REGISTRY.calculatorsHub,
]);

/** Chat-assisted NLU tool ids (Tier B clinical + fleet dispatch hub). */
export const CHAT_ASSISTED_NLU_TOOL_IDS = Object.freeze([
  ...NLU_HUB_ONLY_PROFILE_TOOL_IDS,
  ...clinicalIntentTools
    .filter((t) => CLINICAL_TIER_B_CHAT_REGISTRY_IDS.includes(t.sidebarToolId || t.toolId as any))
    .map((t) => t.toolId),
  REGISTRY.dispatchAi,
]);

/** Per-tool NLU phrase lists co-located with chat configs (must match backend keywords). */
export const CHAT_ASSISTED_REQUIRED_BACKEND_ALIASES = Object.freeze([
  ...GRACE_ACS_REQUIRED_NLU_ALIASES.map((a) => ({ alias: a, nluToolId: 'grace-acs' })),
  ...NIHSS_REQUIRED_NLU_ALIASES.map((a) => ({ alias: a, nluToolId: 'nihss' })),
  ...CANADIAN_C_SPINE_REQUIRED_NLU_ALIASES.map((a) => ({
    alias: a,
    nluToolId: 'canadian-c-spine',
  })),
  ...OTTAWA_ANKLE_REQUIRED_NLU_ALIASES.map((a) => ({ alias: a, nluToolId: 'ottawa-ankle' })),
  ...PECARN_HEAD_REQUIRED_NLU_ALIASES.map((a) => ({ alias: a, nluToolId: 'pecarn-head' })),
  ...NEXUS_CSPINE_REQUIRED_NLU_ALIASES.map((a) => ({ alias: a, nluToolId: 'nexus-cspine' })),
]);

/** All product-required NLU / discovery alias pairs (PR1–PR7 + fleet). */
export const ALL_REQUIRED_CATALOG_ALIAS_PAIRS = Object.freeze([
  ...PR1_ALL_ALIAS_PAIRS,
  ...MELD_ALL_ALIAS_PAIRS,
  ...TIMI_ALL_ALIAS_PAIRS,
  ...WELLS_PE_ALL_ALIAS_PAIRS,
  ...PERC_ALL_ALIAS_PAIRS,
  ...PR4A_ALL_ALIAS_PAIRS,
  ...PR5_ALL_ALIAS_PAIRS,
  ...PR6_ALL_ALIAS_PAIRS,
  ...PR7_ALL_ALIAS_PAIRS,
  ...PR9_ALL_ALIAS_PAIRS,
  ...PR9_REQUIRED_NLU_ALIAS_PAIRS,
  ...NEW_CLINICAL_TOOLS_ALL_ALIAS_PAIRS,
  ...PR3_NLU_ALIAS_PAIRS,
  ...PR3_DISCOVERY_ALIAS_PAIRS,
  ...PR_FLEET_ALL_ALIAS_PAIRS,
]);

let cachedPatternsSource: any = null;

export function readToolPatternsSource() {
  if (!cachedPatternsSource) {
    cachedPatternsSource = readFileSync(TOOL_PATTERNS_PATH, 'utf8');
  }
  return cachedPatternsSource;
}

/** @returns {Map<string, string>} registryId → primary NLU toolId */
export function buildRegistryToNluToolIdMap() {
  const map = new Map();
  for (const [nluToolId, registryId] of Object.entries(ORCHESTRATOR_TO_REGISTRY_ID)) {
    map.set(registryId, nluToolId);
  }
  for (const row of clinicalIntentTools) {
    map.set(row.toolId, row.toolId);
    if (row.sidebarToolId) {
      map.set(row.sidebarToolId, row.toolId);
    }
  }
  return map;
}

/**
 * Per-NLU-tool synchronized view: backend keywords + catalog aliases targeting same registry.
 * @param {string} [patternsSource]
 */
/**
 * @param {string} [patternsSource]
 * @returns {Record<string, { toolId: string, registryId: string, toolName: string, category: string, backendKeywords: string[], catalogAliases: string[] }>}
 */
export function buildSynchronizedAliasMap(patternsSource = readToolPatternsSource()) {
  const records = parseClinicalToolPatternRecords(patternsSource);
  const patterns = records.map(({ toolId, keywords }) => ({ toolId, keywords }));
  const registryToNlu = buildRegistryToNluToolIdMap();
  const catalogByRegistry = new Map();

  for (const [alias, registryId] of Object.entries(NLU_TO_REGISTRY_ID)) {
    if (!catalogByRegistry.has(registryId)) catalogByRegistry.set(registryId, []);
    catalogByRegistry.get(registryId).push(alias);
  }

  const map: any = {};
  for (const { toolId, toolName, category, keywords } of records) {
    const registryId = ORCHESTRATOR_TO_REGISTRY_ID[toolId] || toolId;
    map[toolId] = {
      toolId,
      registryId,
      toolName,
      category,
      backendKeywords: keywords,
      catalogAliases: [...(catalogByRegistry.get(registryId) || [])].sort(),
    };
  }
  return { map, registryToNlu, patterns };
}

function normalizeMetadataString(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Compare frontend clinicalIntentTools vs backend tool.patterns metadata.
 * @param {string} [patternsSource]
 */
export function buildMetadataParityReport(patternsSource = readToolPatternsSource()) {
  const backendById = new Map(
    parseClinicalToolPatternRecords(patternsSource).map((r) => [r.toolId, r])
  );
  const mismatches = [] as any[];
  for (const row of clinicalIntentTools) {
    const backend = backendById.get(row.toolId);
    if (!backend) {
      mismatches.push({ toolId: row.toolId, field: 'toolId', issue: 'missing in backend' });
      continue;
    }
    if (normalizeMetadataString(row.toolName) !== normalizeMetadataString(backend.toolName)) {
      mismatches.push({
        toolId: row.toolId,
        field: 'toolName',
        frontend: row.toolName,
        backend: backend.toolName,
      });
    }
    if (normalizeMetadataString(row.category) !== normalizeMetadataString(backend.category)) {
      mismatches.push({
        toolId: row.toolId,
        field: 'category',
        frontend: row.category,
        backend: backend.category,
      });
    }
  }
  return mismatches;
}

/**
 * Chat-assisted tools must expose backend keywords (NLU routing), not only catalog slugs.
 * @param {string} [patternsSource]
 */
export function buildChatAssistedBackendCoverageReport(patternsSource = readToolPatternsSource()) {
  const { map } = buildSynchronizedAliasMap(patternsSource);
  const gaps = [] as any[];
  for (const toolId of CHAT_ASSISTED_NLU_TOOL_IDS) {
    const spec = map[toolId];
    if (!spec?.backendKeywords?.length) {
      gaps.push({ toolId, reason: 'no backend keywords' });
    }
  }
  for (const { alias, nluToolId } of CHAT_ASSISTED_REQUIRED_BACKEND_ALIASES) {
    const spec = map[nluToolId];
    if (!spec) {
      gaps.push({ alias, nluToolId, reason: 'tool not in synchronized map' });
      continue;
    }
    const matches = spec.backendKeywords.some(
      (kw) =>
        normalizeAliasKey(kw) === normalizeAliasKey(alias) || aliasToSlug(kw) === aliasToSlug(alias)
    );
    if (!matches) {
      gaps.push({ alias, nluToolId, reason: 'chat config alias missing from backend keywords' });
    }
  }
  return gaps;
}

function isAllowedCollision(keyword, toolIds) {
  const norm = normalizeAliasKey(keyword);
  return ALLOWED_BACKEND_KEYWORD_COLLISIONS.some((entry) => {
    if (normalizeAliasKey(entry.keyword) !== norm) return false;
    const a = [...entry.toolIds].sort().join(',');
    const b = [...toolIds].sort().join(',');
    return a === b;
  });
}

/**
 * @param {object} [options]
 * @param {string} [options.patternsSource]
 * @param {typeof NLU_TO_REGISTRY_ID} [options.nluToRegistry]
 */
export function buildClinicalToolAliasSyncReport(options: any = {}) {
  const patternsSource = options.patternsSource ?? readToolPatternsSource();
  const nluToRegistry = options.nluToRegistry ?? NLU_TO_REGISTRY_ID;
  const patterns = parseClinicalToolPatterns(patternsSource);
  const backendToolIds = patterns.map((p) => p.toolId).sort();
  const frontendToolIds = [...clinicalIntentTools.map((t) => t.toolId)].sort();
  const contractToolIds = [...NLU_PROFILE_TOOL_IDS].sort();

  const idMismatches = {
    missingInBackend: frontendToolIds.filter((id) => !backendToolIds.includes(id)),
    missingInFrontend: backendToolIds.filter((id) => !frontendToolIds.includes(id)),
    missingInContract: backendToolIds.filter((id) => !contractToolIds.includes(id)),
  };

  const registryToNlu = buildRegistryToNluToolIdMap();
  const missingCatalogAliases = [] as any[];
  const wrongCatalogTargets = [] as any[];
  const unsafeCatalogRoutes = [] as any[];
  const missingBackendKeywordCoverage = [] as any[];

  for (const [alias, registryId] of Object.entries(nluToRegistry)) {
    if (PHANTOM_BLOCKED_CATALOG_ALIASES.includes(alias)) {
      unsafeCatalogRoutes.push({
        alias,
        registryId,
        reason: 'phantom / emergency id must not map to a launchable registry',
      });
    }
  }

  for (const [alias, registryId] of ALL_REQUIRED_CATALOG_ALIAS_PAIRS) {
    const actual = nluToRegistry[alias];
    const slug = aliasToSlug(alias);
    const slugActual = nluToRegistry[slug];
    if (actual !== registryId && slugActual !== registryId) {
      missingCatalogAliases.push({ alias, expected: registryId, actual, slugActual });
    } else if (actual !== registryId && slugActual === registryId) {
      // phrase missing but slug ok — report as partial
      if (actual === undefined) {
        missingCatalogAliases.push({ alias, expected: registryId, note: 'slug present, phrase missing' });
      }
    } else if (actual !== registryId) {
      wrongCatalogTargets.push({ alias, expected: registryId, actual });
    }

    const nluToolId = registryToNlu.get(registryId) || registryId;
    const pattern = patterns.find((p) => p.toolId === nluToolId);
    if (pattern && !BROAD_CATALOG_ALIASES.includes(alias)) {
      const phrase = normalizeAliasKey(alias);
      const matchesBackend = pattern.keywords.some(
        (kw) => normalizeAliasKey(kw) === phrase || aliasToSlug(kw) === slug
      );
      if (!matchesBackend && !aliasToSlug(alias).includes(nluToolId)) {
        missingBackendKeywordCoverage.push({
          alias,
          registryId,
          nluToolId,
          reason: 'catalog alias has no matching backend keyword (may be discovery-only slug)',
        });
      }
    }
  }

  const keywordToTools = new Map();
  for (const { toolId, keywords } of patterns) {
    for (const kw of keywords) {
      const slug = aliasToSlug(kw);
      if (!keywordToTools.has(slug)) keywordToTools.set(slug, new Set());
      keywordToTools.get(slug).add(toolId);
    }
  }

  const backendKeywordCollisions = [] as any[];
  for (const [slug, toolIdsSet] of keywordToTools) {
    const toolIds = [...toolIdsSet];
    if (toolIds.length < 2) continue;
    const phrase = slug.replace(/-/g, ' ');
    if (isAllowedCollision(phrase, toolIds)) continue;
    backendKeywordCollisions.push({ keyword: slug, toolIds });
  }

  const catalogSlugTargets = new Map();
  const catalogAliasCollisions = [] as any[];
  for (const [alias, registryId] of Object.entries(nluToRegistry)) {
    const slug = aliasToSlug(alias);
    if (!catalogSlugTargets.has(slug)) {
      catalogSlugTargets.set(slug, { registryId, aliases: [alias] });
      continue;
    }
    const existing = catalogSlugTargets.get(slug);
    if (existing.registryId !== registryId) {
      catalogAliasCollisions.push({
        slug,
        registryA: existing.registryId,
        registryB: registryId,
        aliases: [...existing.aliases, alias],
      });
    } else {
      existing.aliases.push(alias);
    }
  }

  const mentalHealthRegistry = new Set([REGISTRY.phq9, REGISTRY.gad7]);
  const metadataMismatches = buildMetadataParityReport(patternsSource);
  const chatAssistedBackendGaps = buildChatAssistedBackendCoverageReport(patternsSource);

  const highRiskMisroutes = [] as any[];
  for (const [alias, registryId] of Object.entries(nluToRegistry) as any[]) {
    const lower = normalizeAliasKey(alias);
    if (
      (lower.includes('emergency') || lower.includes('trauma') || lower.includes('abc ')) &&
      mentalHealthRegistry.has(registryId)
    ) {
      highRiskMisroutes.push({ alias, registryId, reason: 'emergency/trauma phrase → mental health tool' });
    }
    if (lower.includes('pulmonary embolism') && registryId === REGISTRY.phq9) {
      highRiskMisroutes.push({ alias, registryId, reason: 'PE phrase → PHQ-9' });
    }
    if (lower.includes('pulmonary embolism') && registryId === REGISTRY.gad7) {
      highRiskMisroutes.push({ alias, registryId, reason: 'PE phrase → GAD-7' });
    }
    if (
      (lower === 'screen' || lower === 'screening') &&
      (mentalHealthRegistry.has(registryId) || registryId === REGISTRY.auditC)
    ) {
      highRiskMisroutes.push({
        alias,
        registryId,
        reason: 'vague screen/screening → mental health or alcohol tool',
      });
    }
  }

  const unsafeBackendKeywordRoutes = [] as any[];
  const mentalHealthNlu = new Set(['phq9', 'gad7', 'audit-c']);
  for (const { toolId, keywords } of patterns) {
    if (!mentalHealthNlu.has(toolId)) continue;
    for (const kw of keywords) {
      const lower = normalizeAliasKey(kw);
      if (
        lower.includes('emergency') ||
        lower.includes('trauma') ||
        lower.startsWith('abc ') ||
        lower === 'abc'
      ) {
        unsafeBackendKeywordRoutes.push({ toolId, keyword: kw, reason: 'emergency term on mental health tool' });
      }
    }
  }

  const isClean =
    !idMismatches.missingInBackend.length &&
    !idMismatches.missingInFrontend.length &&
    !idMismatches.missingInContract.length &&
    !missingCatalogAliases.length &&
    !wrongCatalogTargets.length &&
    !unsafeCatalogRoutes.length &&
    !backendKeywordCollisions.length &&
    !catalogAliasCollisions.length &&
    !highRiskMisroutes.length &&
    !metadataMismatches.length &&
    !chatAssistedBackendGaps.length &&
    !unsafeBackendKeywordRoutes.length;

  return {
    backendToolIds,
    frontendToolIds,
    contractToolIds,
    idMismatches,
    missingCatalogAliases,
    wrongCatalogTargets,
    unsafeCatalogRoutes,
    missingBackendKeywordCoverage,
    backendKeywordCollisions,
    catalogAliasCollisions,
    highRiskMisroutes,
    metadataMismatches,
    chatAssistedBackendGaps,
    unsafeBackendKeywordRoutes,
    isClean,
    synchronized: buildSynchronizedAliasMap(patternsSource).map,
  };
}

/** JSON-serializable synchronized alias map for tooling and audits. */
export function exportSynchronizedAliasMapJson(patternsSource = readToolPatternsSource()) {
  return JSON.stringify(buildSynchronizedAliasMap(patternsSource).map, null, 2);
}

export function formatAliasSyncReport(report) {
  const lines = ['Clinical tool alias sync report', '================================'];
  if (report.idMismatches.missingInBackend.length) {
    lines.push(`Missing in backend: ${report.idMismatches.missingInBackend.join(', ')}`);
  }
  if (report.idMismatches.missingInFrontend.length) {
    lines.push(`Missing in frontend catalog: ${report.idMismatches.missingInFrontend.join(', ')}`);
  }
  if (report.unsafeCatalogRoutes.length) {
    lines.push('Unsafe catalog routes:');
    for (const row of report.unsafeCatalogRoutes) {
      lines.push(`  - ${row.alias} → ${row.registryId} (${row.reason})`);
    }
  }
  if (report.wrongCatalogTargets.length) {
    lines.push('Wrong catalog targets:');
    for (const row of report.wrongCatalogTargets) {
      lines.push(`  - ${row.alias}: expected ${row.expected}, got ${row.actual}`);
    }
  }
  if (report.missingCatalogAliases.length) {
    lines.push(`Missing catalog aliases (${report.missingCatalogAliases.length}):`);
    for (const row of report.missingCatalogAliases.slice(0, 20)) {
      lines.push(`  - ${JSON.stringify(row)}`);
    }
  }
  if (report.backendKeywordCollisions.length) {
    lines.push('Backend keyword collisions (unexpected):');
    for (const row of report.backendKeywordCollisions) {
      lines.push(`  - "${row.keyword}": ${row.toolIds.join(', ')}`);
    }
  }
  if (report.catalogAliasCollisions.length) {
    lines.push('Catalog alias slug collisions:');
    for (const row of report.catalogAliasCollisions) {
      lines.push(`  - ${row.slug}: ${row.registryA} vs ${row.registryB}`);
    }
  }
  if (report.highRiskMisroutes.length) {
    lines.push('High-risk misroutes:');
    for (const row of report.highRiskMisroutes) {
      lines.push(`  - ${row.alias} → ${row.registryId} (${row.reason})`);
    }
  }
  if (report.metadataMismatches?.length) {
    lines.push('Metadata mismatches (frontend vs backend):');
    for (const row of report.metadataMismatches) {
      lines.push(`  - ${row.toolId} ${row.field}: ${JSON.stringify(row)}`);
    }
  }
  if (report.chatAssistedBackendGaps?.length) {
    lines.push('Chat-assisted backend keyword gaps:');
    for (const row of report.chatAssistedBackendGaps) {
      lines.push(`  - ${JSON.stringify(row)}`);
    }
  }
  if (report.unsafeBackendKeywordRoutes?.length) {
    lines.push('Unsafe backend keywords:');
    for (const row of report.unsafeBackendKeywordRoutes) {
      lines.push(`  - ${row.toolId}: "${row.keyword}" (${row.reason})`);
    }
  }
  if (report.isClean) {
    lines.push('Status: CLEAN — frontend catalog, backend patterns, and alias map are aligned.');
  } else {
    lines.push('Status: DRIFT DETECTED — see sections above.');
  }
  return lines.join('\n');
}
