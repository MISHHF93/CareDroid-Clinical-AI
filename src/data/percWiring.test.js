import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
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

describe('PERC (Tier B chat-assisted) wiring', () => {
  const id = 'perc';

  it('is listed in Tier B chat calculator audit list', () => {
    expect([...PR2_TIER_B_CHAT_CALCULATOR_IDS]).toContain(id);
  });

  it('exposes chat config with safety-focused chatSeed', () => {
    expect(percChatConfig.toolId).toBe(id);
    expect(percChatConfig.chatSeed).toMatch(/pre-test probability.*LOW/i);
    expect(percChatConfig.chatSeed).toMatch(/does NOT definitively rule out/i);
  });

  it('uses hub-only routing without dedicated calculator form', () => {
    const nlu = clinicalIntentTools.find((t) => t.toolId === id);
    expect(nlu?.path).toBe('/tools/calculators');
    expect(nlu?.sidebarToolId).toBe(id);
    expect(nluCalculatorHubOnly.some((h) => h.toolId === id)).toBe(true);
    expect(appSource).not.toContain("path: '/tools/calculators/perc'");
  });

  it('resolves launch and NLU aliases', () => {
    const launch = resolveCatalogLaunch(id);
    expect(launch.path).toBe('/tools/calculators');
    expect(launch.registryId).toBe(id);
    expect(launch.chatSeed).toMatch(/PERC rule/i);

    expect(NLU_TO_REGISTRY_ID.perc).toBe(id);
    expect(NLU_TO_REGISTRY_ID['pe rule out']).toBe(id);
    expect(NLU_TO_REGISTRY_ID['pulmonary embolism rule out']).toBe(id);
    expect(resolveRegistryId('perc-rule')).toBe(id);
    expect(resolveCatalogLaunch('pe-rule-out').registryId).toBe(id);
  });

  it('includes registry, discovery, and catalog rows', () => {
    expect(toolRegistryById[id]?.path).toBe('/tools/calculators');
    expect(getAllDiscoveredTools().some((r) => r.id === id)).toBe(true);
    const row = getMedicalToolsCatalogRows().find((r) => r.primaryId === id);
    expect(row?.chatOnlyForm).toBe(true);
    expect(row?.uiCalculatorSlug).toBeNull();
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
});
