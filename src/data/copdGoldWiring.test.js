import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { clinicalIntentTools, nluCalculatorHubOnly } from './clinicalIntentToolCatalog';
import { copdGoldChatConfig } from './chatAssistedCalculators/copdGold';
import {
  resolveCatalogLaunch,
  NLU_TO_REGISTRY_ID,
  PR6_TIER_B_CHAT_CALCULATOR_IDS,
  TIER_B_CHAT_CALCULATOR_REGISTRY_IDS,
  resolveRegistryId,
} from './clinicalCatalogWiring';
import { getMedicalToolsCatalogRows } from './medicalToolsCatalogIndex';
import { getAllDiscoveredTools, toolIdAliases } from './sourceCodeToolDiscovery';
import { toolRegistryById } from './toolRegistry';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(__dirname, '../App.jsx'), 'utf8');
const patternsSource = readFileSync(
  join(
    __dirname,
    '../../backend/src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns.ts'
  ),
  'utf8'
);

describe('COPD GOLD (Tier B chat-assisted) wiring', () => {
  const id = 'copd-gold';

  it('is listed in PR6 Tier B audit lists', () => {
    expect([...PR6_TIER_B_CHAT_CALCULATOR_IDS]).toContain(id);
    expect([...TIER_B_CHAT_CALCULATOR_REGISTRY_IDS]).toContain(id);
  });

  it('exposes chat config with GOLD grouping safety seed', () => {
    expect(copdGoldChatConfig.toolId).toBe(id);
    expect(copdGoldChatConfig.chatSeed).toMatch(/grouping support only/i);
    expect(copdGoldChatConfig.chatSeed).toMatch(/not a diagnosis of COPD/i);
    expect(copdGoldChatConfig.chatSeed).toMatch(/Do NOT recommend specific medications/i);
    expect(copdGoldChatConfig.chatSeed).toMatch(/inhalers/i);
    expect(copdGoldChatConfig.chatSeed).toMatch(/clinician judgment/i);
  });

  it('uses hub-only routing without dedicated calculator form', () => {
    const nlu = clinicalIntentTools.find((t) => t.toolId === id);
    expect(nlu?.path).toBe('/tools/calculators');
    expect(nlu?.sidebarToolId).toBe(id);
    expect(nlu?.backendExecutable).toBe(false);
    expect(nluCalculatorHubOnly.some((h) => h.toolId === id)).toBe(true);
    expect(appSource).not.toContain("path: '/tools/calculators/copd-gold'");
  });

  it('resolves launch and NLU aliases', () => {
    const launch = resolveCatalogLaunch(id);
    expect(launch.path).toBe('/tools/calculators');
    expect(launch.registryId).toBe(id);
    expect(launch.chatSeed).toMatch(/COPD GOLD/i);
    expect(launch.orchestratorTool).toBeUndefined();

    expect(NLU_TO_REGISTRY_ID['gold copd']).toBe(id);
    expect(NLU_TO_REGISTRY_ID['copd assessment']).toBe(id);
    expect(NLU_TO_REGISTRY_ID['copd risk']).toBe(id);
    expect(NLU_TO_REGISTRY_ID['gold classification']).toBe(id);
    expect(resolveRegistryId('gold-copd')).toBe(id);
    expect(resolveCatalogLaunch('copd-assessment').registryId).toBe(id);
  });

  it('includes registry, discovery, and catalog rows', () => {
    expect(toolRegistryById[id]?.path).toBe('/tools/calculators');
    expect(getAllDiscoveredTools().some((r) => r.id === id)).toBe(true);
    const row = getMedicalToolsCatalogRows().find((r) => r.primaryId === id);
    expect(row?.chatOnlyForm).toBe(true);
    expect(row?.uiCalculatorSlug).toBeNull();
    expect(row?.pagePath).toBe('/tools/calculators');
  });

  it('mirrors backend patterns', () => {
    expect(patternsSource).toContain(`toolId: '${id}'`);
    expect(patternsSource).toContain('preferCopdGold');
  });

  it('documents discovery aliases', () => {
    const ids = toolIdAliases.map((a) => a.id);
    expect(ids).toContain('gold-copd');
    expect(ids).toContain('copd-assessment');
    expect(ids).toContain('gold-classification');
  });
});
