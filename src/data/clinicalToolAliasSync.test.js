/**
 * Drift detection: clinicalIntentToolCatalog.js ↔ tool.patterns.ts ↔ NLU_TO_REGISTRY_ID.
 */

import { describe, it, expect } from 'vitest';
import { clinicalIntentTools } from './clinicalIntentToolCatalog';
import { NLU_PROFILE_TOOL_IDS, NLU_TO_REGISTRY_ID } from './clinicalToolIdContract';
import { resolveRegistryId } from './clinicalCatalogWiring';
import {
  ALL_REQUIRED_CATALOG_ALIAS_PAIRS,
  AUDITED_CLINICAL_REGISTRY_IDS,
  CHAT_ASSISTED_NLU_TOOL_IDS,
  PHANTOM_BLOCKED_CATALOG_ALIASES,
  buildChatAssistedBackendCoverageReport,
  buildClinicalToolAliasSyncReport,
  buildMetadataParityReport,
  buildSynchronizedAliasMap,
  exportSynchronizedAliasMapJson,
  formatAliasSyncReport,
} from './clinicalToolAliasSync';
import { aliasToSlug, extractToolPatternKeywords } from './parseToolPatterns';
import { readToolPatternsSource } from './clinicalToolAliasSync';
import { messageMatchesToolKeywords } from './testHelpers/clinicalToolsTestFixtures';

const patternsSource = readToolPatternsSource();

function sortedUnique(ids) {
  return [...new Set(ids)].sort();
}

describe('clinicalToolAliasSync — toolId parity', () => {
  const report = buildClinicalToolAliasSyncReport({ patternsSource });

  it('matches frontend clinicalIntentTools, backend patterns, and contract NLU_PROFILE_TOOL_IDS', () => {
    expect(report.idMismatches.missingInBackend).toEqual([]);
    expect(report.idMismatches.missingInFrontend).toEqual([]);
    expect(report.idMismatches.missingInContract).toEqual([]);
    expect(report.backendToolIds).toEqual(sortedUnique([...NLU_PROFILE_TOOL_IDS]));
    expect(report.frontendToolIds).toEqual(
      sortedUnique(clinicalIntentTools.map((t) => t.toolId))
    );
  });
});

describe('clinicalToolAliasSync — catalog aliases (PR1–PR7 + fleet)', () => {
  const report = buildClinicalToolAliasSyncReport({ patternsSource });

  it('has no missing or wrong required catalog alias targets', () => {
    if (report.missingCatalogAliases.length || report.wrongCatalogTargets.length) {
      console.log(formatAliasSyncReport(report));
    }
    expect(report.wrongCatalogTargets).toEqual([]);
    expect(report.missingCatalogAliases).toEqual([]);
  });

  it.each(ALL_REQUIRED_CATALOG_ALIAS_PAIRS)(
    'NLU_TO_REGISTRY_ID resolves "%s" → %s',
    (alias, registryId) => {
      const phrase = NLU_TO_REGISTRY_ID[alias];
      const slug = NLU_TO_REGISTRY_ID[aliasToSlug(alias)];
      expect(phrase === registryId || slug === registryId).toBe(true);
      expect(resolveRegistryId(alias)).toBe(registryId);
    }
  );

  it.each(ALL_REQUIRED_CATALOG_ALIAS_PAIRS)(
    'required alias "%s" matches backend keywords for %s when phrase-based',
    (alias, registryId) => {
      const { map, registryToNlu } = buildSynchronizedAliasMap(patternsSource);
      const nluToolId = registryToNlu.get(registryId) || registryId;
      const spec = map[nluToolId];
      if (!spec) return;
      if (aliasToSlug(alias) === alias && !alias.includes(' ')) return;
      expect(messageMatchesToolKeywords(alias, spec.backendKeywords)).toBe(true);
    }
  );
});

describe('clinicalToolAliasSync — metadata parity', () => {
  it('matches toolName and category for every NLU profile in frontend vs backend', () => {
    const mismatches = buildMetadataParityReport(patternsSource);
    if (mismatches.length) {
      console.log('metadata mismatches:', mismatches);
    }
    expect(mismatches).toEqual([]);
  });
});

describe('clinicalToolAliasSync — chat-assisted tools', () => {
  it('includes every Tier B / hub-only chat tool in CHAT_ASSISTED_NLU_TOOL_IDS', () => {
    for (const toolId of [
      'wells-pe',
      'perc',
      'grace-acs',
      'nihss',
      'canadian-c-spine',
      'ottawa-ankle',
      'copd-gold',
      'rome-iv-ibs',
      'dispatch-ai',
      'apache2-calculator',
      'curb65-calculator',
      'gcs-calculator',
      'wells-dvt-calculator',
    ]) {
      expect(CHAT_ASSISTED_NLU_TOOL_IDS).toContain(toolId);
    }
  });

  it('has backend keyword coverage for chat-assisted NLU tools and config aliases', () => {
    const gaps = buildChatAssistedBackendCoverageReport(patternsSource);
    if (gaps.length) {
      console.log('chat-assisted gaps:', gaps);
    }
    expect(gaps).toEqual([]);
  });
});

describe('clinicalToolAliasSync — safety and collisions', () => {
  const report = buildClinicalToolAliasSyncReport({ patternsSource });

  it('does not route phantom / emergency cost-tracking ids through NLU_TO_REGISTRY_ID', () => {
    expect(report.unsafeCatalogRoutes).toEqual([]);
    for (const id of PHANTOM_BLOCKED_CATALOG_ALIASES) {
      expect(NLU_TO_REGISTRY_ID[id]).toBeUndefined();
    }
  });

  it('has no high-risk emergency → casual tool catalog misroutes', () => {
    expect(report.highRiskMisroutes).toEqual([]);
  });

  it('has no catalog alias slug collisions across different registry targets', () => {
    if (report.catalogAliasCollisions.length) {
      console.log(formatAliasSyncReport(report));
    }
    expect(report.catalogAliasCollisions).toEqual([]);
  });

  it('documents expected backend keyword overlaps only via allowlist', () => {
    if (report.backendKeywordCollisions.length) {
      console.log(formatAliasSyncReport(report));
    }
    expect(report.backendKeywordCollisions).toEqual([]);
  });
});

describe('clinicalToolAliasSync — synchronized alias map', () => {
  it('includes backend keywords for every NLU profile toolId', () => {
    const { map } = buildSynchronizedAliasMap(patternsSource);
    for (const toolId of NLU_PROFILE_TOOL_IDS) {
      expect(map[toolId]?.backendKeywords?.length, toolId).toBeGreaterThan(0);
    }
  });

  it('maps audited registry ids to catalog aliases without empty specs', () => {
    const { map, registryToNlu } = buildSynchronizedAliasMap(patternsSource);
    for (const registryId of AUDITED_CLINICAL_REGISTRY_IDS) {
      const nluToolId = registryToNlu.get(registryId);
      if (!nluToolId || !map[nluToolId]) continue;
      expect(map[nluToolId].registryId).toBeTruthy();
    }
  });

  it('exposes fleet tool keywords in backend patterns', () => {
    for (const id of ['dispatch-ai', 'route-optimizer', 'predictive-maintenance', 'fleet-command']) {
      const keywords = extractToolPatternKeywords(patternsSource, id);
      expect(keywords.length).toBeGreaterThan(3);
    }
  });

  it('exports a JSON synchronized alias map with keywords and catalog aliases', () => {
    const json = exportSynchronizedAliasMapJson(patternsSource);
    const map = JSON.parse(json);
    expect(map['wells-pe']?.backendKeywords).toContain('pe score');
    expect(map['dispatch-ai']?.catalogAliases).toContain('dispatch');
    expect(map['wells-pe']?.toolName).toBeTruthy();
  });

  it('reports isClean when full sync report has no drift', () => {
    const report = buildClinicalToolAliasSyncReport({ patternsSource });
    expect(report.isClean).toBe(true);
  });
});
