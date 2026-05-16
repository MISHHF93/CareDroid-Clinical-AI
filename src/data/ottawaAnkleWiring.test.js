import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { clinicalIntentTools, nluCalculatorHubOnly } from './clinicalIntentToolCatalog';
import { ottawaAnkleChatConfig } from './chatAssistedCalculators/ottawaAnkle';
import {
  resolveCatalogLaunch,
  NLU_TO_REGISTRY_ID,
  PR3_TIER_B_CHAT_CALCULATOR_IDS,
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

describe('Ottawa Ankle Rule (Tier B chat-assisted) wiring', () => {
  const id = 'ottawa-ankle';

  it('is listed in PR3 Tier B audit list', () => {
    expect([...PR3_TIER_B_CHAT_CALCULATOR_IDS]).toContain(id);
  });

  it('exposes chat config with acute injury and hard-stop safety seed', () => {
    expect(ottawaAnkleChatConfig.toolId).toBe(id);
    expect(ottawaAnkleChatConfig.chatSeed).toMatch(/acute ankle/i);
    expect(ottawaAnkleChatConfig.chatSeed).toMatch(/neurovascular compromise/i);
    expect(ottawaAnkleChatConfig.chatSeed).toMatch(/open fracture/i);
    expect(ottawaAnkleChatConfig.chatSeed).toMatch(/do not override clinician judgment/i);
  });

  it('uses hub-only routing without dedicated calculator form', () => {
    const nlu = clinicalIntentTools.find((t) => t.toolId === id);
    expect(nlu?.path).toBe('/tools/calculators');
    expect(nlu?.sidebarToolId).toBe(id);
    expect(nluCalculatorHubOnly.some((h) => h.toolId === id)).toBe(true);
    expect(appSource).not.toContain("path: '/tools/calculators/ottawa-ankle'");
  });

  it('resolves launch and NLU aliases', () => {
    const launch = resolveCatalogLaunch(id);
    expect(launch.path).toBe('/tools/calculators');
    expect(launch.registryId).toBe(id);
    expect(launch.chatSeed).toMatch(/Ottawa Ankle Rule/i);

    expect(NLU_TO_REGISTRY_ID['ottawa ankle']).toBe(id);
    expect(NLU_TO_REGISTRY_ID['ottawa ankle rule']).toBe(id);
    expect(NLU_TO_REGISTRY_ID['ankle xray rule']).toBe(id);
    expect(NLU_TO_REGISTRY_ID['ankle injury imaging']).toBe(id);
    expect(NLU_TO_REGISTRY_ID['foot xray rule']).toBe(id);
    expect(resolveRegistryId('ottawa-ankle-rule')).toBe(id);
    expect(resolveCatalogLaunch('ankle-injury-imaging').registryId).toBe(id);
  });

  it('includes registry, discovery, and catalog rows', () => {
    expect(toolRegistryById[id]?.path).toBe('/tools/calculators');
    expect(getAllDiscoveredTools().some((r) => r.id === id)).toBe(true);
    const row = getMedicalToolsCatalogRows().find((r) => r.primaryId === id);
    expect(row?.chatOnlyForm).toBe(true);
    expect(row?.pagePath).toBe('/tools/calculators');
  });

  it('mirrors backend patterns', () => {
    expect(patternsSource).toContain(`toolId: '${id}'`);
    expect(patternsSource).toContain('preferOttawaAnkle');
  });

  it('documents discovery aliases', () => {
    const ids = toolIdAliases.map((a) => a.id);
    expect(ids).toContain('ottawa-ankle-rule');
    expect(ids).toContain('ankle-xray-rule');
    expect(ids).toContain('foot-xray-rule');
  });
});
