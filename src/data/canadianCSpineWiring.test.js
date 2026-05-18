import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { clinicalIntentTools, nluCalculatorHubOnly } from './clinicalIntentToolCatalog';
import { canadianCSpineChatConfig } from './chatAssistedCalculators/canadianCSpine';
import {
  resolveCatalogLaunch,
  NLU_TO_REGISTRY_ID,
  PR3_TIER_B_CHAT_CALCULATOR_IDS,
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

describe('Canadian C-Spine Rule (Tier B chat-assisted) wiring', () => {
  const id = 'canadian-c-spine';

  it('is listed in PR3 Tier B audit lists', () => {
    expect([...PR3_TIER_B_CHAT_CALCULATOR_IDS]).toContain(id);
    expect([...TIER_B_CHAT_CALCULATOR_REGISTRY_IDS]).toContain(id);
  });

  it('exposes chat config with applicability and trauma safety seed', () => {
    expect(canadianCSpineChatConfig.toolId).toBe(id);
    expect(canadianCSpineChatConfig.description).toMatch(/clinical decision support/i);
    expect(canadianCSpineChatConfig.description).toMatch(/not c-spine clearance/i);
    expect(canadianCSpineChatConfig.chatSeed).toMatch(/STEP 0/i);
    expect(canadianCSpineChatConfig.chatSeed).toMatch(/Applicability/i);
    expect(canadianCSpineChatConfig.chatSeed).toMatch(/unstable patients/i);
    expect(canadianCSpineChatConfig.chatSeed).toMatch(/delay primary trauma survey/i);
    expect(canadianCSpineChatConfig.chatSeed).toMatch(/45 degrees/i);
    expect(canadianCSpineChatConfig.chatSeed).toMatch(/does not "clear" the cervical spine/i);
    expect(canadianCSpineChatConfig.chatSeed).toMatch(/Do not override clinician judgment/i);
    expect(canadianCSpineChatConfig.guidedSteps).toEqual([
      'applicability',
      'high-risk factors',
      'low-risk factors',
      'active ROM 45°',
    ]);
  });

  it('uses hub-only routing without dedicated calculator form', () => {
    const nlu = clinicalIntentTools.find((t) => t.toolId === id);
    expect(nlu?.path).toBe('/tools/calculators');
    expect(nlu?.sidebarToolId).toBe(id);
    expect(nlu?.backendExecutable).toBe(false);
    expect(nluCalculatorHubOnly.some((h) => h.toolId === id)).toBe(true);
    expect(appSource).not.toContain("path: '/tools/calculators/canadian-c-spine'");
  });

  it('resolves launch and NLU aliases', () => {
    const launch = resolveCatalogLaunch(id);
    expect(launch.path).toBe('/tools/calculators');
    expect(launch.registryId).toBe(id);
    expect(launch.chatSeed).toMatch(/Canadian C-Spine Rule/i);
    expect(launch.openLabel).toBe('Start guided chat');
    expect(launch.orchestratorTool).toBeNull();

    expect(NLU_TO_REGISTRY_ID['canadian c spine']).toBe(id);
    expect(NLU_TO_REGISTRY_ID['canadian c-spine rule']).toBe(id);
    expect(NLU_TO_REGISTRY_ID['c spine rule']).toBe(id);
    expect(NLU_TO_REGISTRY_ID['cervical spine rule']).toBe(id);
    expect(NLU_TO_REGISTRY_ID['neck trauma imaging rule']).toBe(id);
    expect(resolveRegistryId('c-spine-rule')).toBe(id);
    expect(resolveRegistryId('canadian-c-spine-rule')).toBe(id);
    expect(resolveRegistryId('neck-trauma-imaging-rule')).toBe(id);
    expect(resolveCatalogLaunch('cervical-spine-rule').registryId).toBe(id);
    expect(resolveCatalogLaunch('neck trauma imaging rule').registryId).toBe(id);
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
    expect(patternsSource).toContain('preferCanadianCSpine');
  });

  it('documents discovery aliases', () => {
    const ids = toolIdAliases.map((a) => a.id);
    expect(ids).toContain('canadian-c-spine-rule');
    expect(ids).toContain('c-spine-rule');
    expect(ids).toContain('neck-trauma-imaging-rule');
  });
});
