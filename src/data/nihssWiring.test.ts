import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { clinicalIntentTools, nluCalculatorHubOnly } from './clinicalIntentToolCatalog';
import {
  nihssChatConfig,
  NIHSS_REQUIRED_NLU_ALIASES,
} from './chatAssistedCalculators/nihss';
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
const appSource = readFileSync(join(__dirname, '../app/router.tsx'), 'utf8');
const patternsSource = readFileSync(
  join(
    __dirname,
    '../../backend/src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns.ts'
  ),
  'utf8'
);

describe('NIHSS (Tier B chat-assisted) wiring', () => {
  const id = 'nihss';

  it('is listed in PR3 Tier B audit lists', () => {
    expect([...PR3_TIER_B_CHAT_CALCULATOR_IDS]).toContain(id);
    expect([...TIER_B_CHAT_CALCULATOR_REGISTRY_IDS]).toContain(id);
  });

  it('exposes chat config with stroke safety seed', () => {
    expect(nihssChatConfig.toolId).toBe(id);
    expect(nihssChatConfig.description).toMatch(/clinical decision support/i);
    expect(nihssChatConfig.description).toMatch(/does not replace urgent stroke evaluation/i);
    expect(nihssChatConfig.chatSeed).toMatch(/domain-by-domain/i);
    expect(nihssChatConfig.chatSeed).toMatch(/STEP 0/i);
    expect(nihssChatConfig.chatSeed).toMatch(/does not replace urgent stroke evaluation/i);
    expect(nihssChatConfig.chatSeed).toMatch(/Do not delay or defer emergency stroke pathways/i);
    expect(nihssChatConfig.chatSeed).toMatch(/Remain informational and documentation-focused/i);
    expect(nihssChatConfig.guidedDomains).toHaveLength(15);
    expect(nihssChatConfig.chatSeed).not.toMatch(/\*\*/);
  });

  it('uses hub-only routing without dedicated calculator form', () => {
    const nlu = clinicalIntentTools.find((t) => t.toolId === id);
    expect(nlu?.path).toBe('/tools/calculators');
    expect(nlu?.sidebarToolId).toBe(id);
    expect(nlu?.backendExecutable).toBe(false);
    expect(nluCalculatorHubOnly.some((h) => h.toolId === id)).toBe(true);
    expect(appSource).not.toContain("path: '/tools/calculators/nihss'");
  });

  it.each(NIHSS_REQUIRED_NLU_ALIASES)(
    'resolves required NLU alias "%s" to nihss with hub launch',
    (alias) => {
      expect(NLU_TO_REGISTRY_ID[alias]).toBe(id);
      const launch = resolveCatalogLaunch(alias);
      expect(launch.path).toBe('/tools/calculators');
      expect(launch.registryId).toBe(id);
      expect(launch.openLabel).toBe('Start guided chat');
      expect(launch.orchestratorTool).toBeNull();
      expect(launch.chatSeed).toMatch(/NIH Stroke Scale/i);
    }
  );

  it('resolves discovery slug aliases to nihss', () => {
    expect(resolveRegistryId('nih-stroke-scale')).toBe(id);
    expect(resolveRegistryId('national-institutes-of-health-stroke-scale')).toBe(id);
    expect(resolveCatalogLaunch('stroke-severity-score').registryId).toBe(id);
    expect(resolveCatalogLaunch('stroke-scale').registryId).toBe(id);
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
    expect(patternsSource).toContain('preferNihss');
  });

  it('documents discovery aliases', () => {
    const ids = toolIdAliases.map((a) => a.id);
    expect(ids).toContain('nih-stroke-scale');
    expect(ids).toContain('stroke-scale');
    expect(ids).toContain('stroke-severity-score');
  });
});
