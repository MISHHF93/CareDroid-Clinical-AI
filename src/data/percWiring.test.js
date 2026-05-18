import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import toolRegistry, { toolRegistryById } from './toolRegistry';
import { clinicalIntentTools, nluCalculatorHubOnly } from './clinicalIntentToolCatalog';
import { percChatConfig } from './chatAssistedCalculators/perc';
import {
  resolveCatalogLaunch,
  NLU_TO_REGISTRY_ID,
  PR2_TIER_B_CHAT_CALCULATOR_IDS,
  resolveRegistryId,
} from './clinicalCatalogWiring';
import { getMedicalToolsCatalogRows } from './medicalToolsCatalogIndex';
import { getAllDiscoveredTools, toolIdAliases } from './sourceCodeToolDiscovery';
import {
  PERC_REQUIRED_NLU_ALIAS_PAIRS,
  PERC_REGISTRY_ID,
  PERC_HUB_PATH,
  PERC_CATALOG_SEARCH_QUERIES,
} from './pr2PercTestConstants';
import { catalogRowsMatchingQuery } from '../utils/catalogSearch';
import { CHAT_ASSISTED_HUB_GROUPS } from './chatAssistedHubGroups';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(__dirname, '../App.jsx'), 'utf8');
const patternsSource = readFileSync(
  join(
    __dirname,
    '../../backend/src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns.ts'
  ),
  'utf8'
);

describe('PERC (Tier B chat-assisted) wiring', () => {
  const id = PERC_REGISTRY_ID;

  it('is listed in Tier B chat calculator audit list', () => {
    expect(Object.isFrozen(PR2_TIER_B_CHAT_CALCULATOR_IDS)).toBe(true);
    expect([...PR2_TIER_B_CHAT_CALCULATOR_IDS]).toContain(id);
  });

  it('exposes chat config with safety-focused chatSeed', () => {
    expect(percChatConfig.toolId).toBe(id);
    expect(percChatConfig.chatSeed).toMatch(/pre-test probability.*LOW/i);
    expect(percChatConfig.chatSeed).toMatch(/does NOT definitively rule out/i);
    expect(percChatConfig.chatSeed).toMatch(/never say PE is "ruled out"/i);
    expect(percChatConfig.guidedCriteria).toHaveLength(8);
  });

  it('uses hub-only routing without dedicated calculator form', () => {
    const nlu = clinicalIntentTools.find((t) => t.toolId === id);
    expect(nlu?.path).toBe(PERC_HUB_PATH);
    expect(nlu?.sidebarToolId).toBe(id);
    expect(nlu?.backendExecutable).toBe(false);
    expect(nlu?.chatSeed).toBe(percChatConfig.chatSeed);
    expect(nluCalculatorHubOnly.some((h) => h.toolId === id)).toBe(true);
    expect(appSource).not.toContain("path: '/tools/calculators/perc'");
    expect(appSource).not.toContain('initialCalculatorId="perc"');
  });

  it('resolves launch to hub with guided chat (Tier B)', () => {
    const launch = resolveCatalogLaunch(id);
    expect(launch.path).toBe(PERC_HUB_PATH);
    expect(launch.registryId).toBe(id);
    expect(launch.chatSeed).toBe(percChatConfig.chatSeed);
    expect(launch.chatSeed).toMatch(/PERC rule/i);
    expect(launch.openLabel).toBe('Start guided chat');
    expect(launch.orchestratorTool).toBeNull();
  });

  it.each(PERC_REQUIRED_NLU_ALIAS_PAIRS)(
    'NLU_TO_REGISTRY_ID maps "%s" → %s',
    (alias, canonical) => {
      expect(NLU_TO_REGISTRY_ID[alias]).toBe(canonical);
      expect(resolveRegistryId(alias)).toBe(canonical);
      const launch = resolveCatalogLaunch(alias);
      expect(launch.path).toBe(PERC_HUB_PATH);
      expect(launch.registryId).toBe(canonical);
    }
  );

  it('separates pe-rule-out (PERC) from pe-score (Wells PE) launches', () => {
    expect(resolveCatalogLaunch('pe-rule-out').registryId).toBe('perc');
    expect(resolveCatalogLaunch('pe-score').registryId).toBe('wells-pe');
  });

  it('includes registry, discovery, and catalog rows', () => {
    const reg = toolRegistryById[id];
    expect(reg?.path).toBe(PERC_HUB_PATH);
    expect(reg?.panelTool).toBe('calculators');
    expect(reg?.initialCalc).toBeUndefined();

    expect(getAllDiscoveredTools().some((r) => r.id === id)).toBe(true);
    const row = getMedicalToolsCatalogRows().find((r) => r.primaryId === id);
    expect(row?.chatOnlyForm).toBe(true);
    expect(row?.chatOnRequest).toBe(true);
    expect(row?.uiCalculatorSlug).toBeNull();
    expect(row?.pagePath).toBe(PERC_HUB_PATH);
  });

  it('mirrors backend patterns', () => {
    expect(patternsSource).toContain(`toolId: '${id}'`);
  });

  it('documents discovery aliases', () => {
    const ids = toolIdAliases.map((a) => a.id);
    expect(ids).toContain('perc-rule');
    expect(ids).toContain('pe-rule-out');
    expect(ids).toContain('pulmonary-embolism-rule-out');
  });

  it('appears in calculator hub PE chat-assisted group with Wells PE', () => {
    const peGroup = CHAT_ASSISTED_HUB_GROUPS.find((g) => g.groupId === 'pe');
    expect(peGroup?.toolIds).toContain(id);
    expect(peGroup?.toolIds).toContain('wells-pe');
    expect(peGroup?.lead).toMatch(/do not rule in or rule out/i);
  });

  it.each(PERC_CATALOG_SEARCH_QUERIES)(
    'catalog search for %s via "%s"',
    (primaryId, query) => {
      const rows = getMedicalToolsCatalogRows();
      const hits = catalogRowsMatchingQuery(rows, query);
      expect(hits.some((r) => r.primaryId === primaryId)).toBe(true);
    }
  );

  it('lists perc in toolRegistry export', () => {
    expect(toolRegistry.some((t) => t.id === PERC_REGISTRY_ID)).toBe(true);
  });
});
