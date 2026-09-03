import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { clinicalIntentTools, nluCalculatorHubOnly } from './clinicalIntentToolCatalog';
import { romeIvIbsChatConfig } from './chatAssistedCalculators/romeIvIbs';
import {
  resolveCatalogLaunch,
  resolveNavigationPathForLaunch,
  NLU_TO_REGISTRY_ID,
  PR7_TIER_B_CHAT_CALCULATOR_IDS,
  TIER_B_CHAT_CALCULATOR_REGISTRY_IDS,
  resolveRegistryId,
} from './clinicalCatalogWiring';
import { PR7_HUB_PATH, PR7_REQUIRED_NLU_ALIAS_PAIRS } from './pr7TestConstants';
import { getMedicalToolsCatalogRows } from './medicalToolsCatalogIndex';
import { getAllDiscoveredTools, toolIdAliases } from './sourceCodeToolDiscovery';
import { toolRegistryById } from './toolRegistry';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(__dirname, '../app/router.tsx'), 'utf8');
const patternsSource = readFileSync(
  join(
    __dirname,
    '../../backend/src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns.ts',
  ),
  'utf8',
);

describe('Rome IV IBS (Tier B chat-assisted) wiring', () => {
  const id = 'rome-iv-ibs';

  it('is listed in PR7 Tier B audit lists', () => {
    expect([...PR7_TIER_B_CHAT_CALCULATOR_IDS]).toContain(id);
    expect([...TIER_B_CHAT_CALCULATOR_REGISTRY_IDS]).toContain(id);
  });

  it('exposes chat config with informational criteria safety seed', () => {
    expect(romeIvIbsChatConfig.toolId).toBe(id);
    expect(romeIvIbsChatConfig.chatSeed).toMatch(/criteria support for discussion only/i);
    expect(romeIvIbsChatConfig.chatSeed).toMatch(/NOT a diagnosis/i);
    expect(romeIvIbsChatConfig.chatSeed).toMatch(/Do NOT state that the patient has IBS/i);
    expect(romeIvIbsChatConfig.chatSeed).toMatch(/qualified clinician/i);
  });

  it('uses hub-only routing without dedicated calculator form', () => {
    const nlu = clinicalIntentTools.find((t) => t.toolId === id);
    if (!nlu) throw new Error('expected nlu tool entry to exist');
    expect(nlu?.path).toBe('/tools/calculators');
    expect(nlu?.sidebarToolId).toBe(id);
    expect(nlu?.backendExecutable).toBe(false);
    expect(nluCalculatorHubOnly.some((h) => h.toolId === id)).toBe(true);
    expect(appSource).not.toContain("path: '/tools/calculators/rome-iv-ibs'");
  });

  it('resolves launch to hub path and guided chat seed (Tier B)', () => {
    const launch = resolveCatalogLaunch(id);
    expect(launch.path).toBe(PR7_HUB_PATH);
    expect(launch.registryId).toBe(id);
    expect(launch.chatSeed).toBe(romeIvIbsChatConfig.chatSeed);
    expect(launch.chatSeed).toMatch(/Rome IV/i);
    expect(launch.chatSeed).toMatch(/abdominal pain frequency/i);
    expect(launch.chatSeed).toMatch(/symptom duration/i);
    expect(launch.chatSeed).toMatch(/relation to defecation/i);
    expect(launch.chatSeed).toMatch(/stool frequency change/i);
    expect(launch.chatSeed).toMatch(/stool form change/i);
    expect(launch.chatSeed).toMatch(/criteria support assessment/i);
    expect(launch.openLabel).toBe('Start guided chat');
    expect(launch.orchestratorTool).toBeNull();
    expect(resolveNavigationPathForLaunch(launch)).toBe('/assistant');
  });

  it.each(PR7_REQUIRED_NLU_ALIAS_PAIRS)(
    'NLU alias "%s" resolves to hub launch for %s',
    (alias, canonical) => {
      expect(NLU_TO_REGISTRY_ID[alias]).toBe(canonical);
      expect(resolveRegistryId(alias)).toBe(canonical);
      const launch = resolveCatalogLaunch(alias);
      expect(launch.path).toBe(PR7_HUB_PATH);
      expect(launch.registryId).toBe(canonical);
      expect(launch.chatSeed).toBe(romeIvIbsChatConfig.chatSeed);
    },
  );

  it('resolves hyphenated discovery aliases', () => {
    expect(resolveRegistryId('rome-iv')).toBe(id);
    expect(resolveCatalogLaunch('ibs-criteria').registryId).toBe(id);
    expect(resolveCatalogLaunch('irritable-bowel-syndrome-criteria').registryId).toBe(id);
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
    expect(patternsSource).toContain('preferRomeIvIbs');
  });

  it('documents discovery aliases', () => {
    const ids = toolIdAliases.map((a) => a.id);
    expect(ids).toContain('rome-iv');
    expect(ids).toContain('ibs-criteria');
    expect(ids).toContain('irritable-bowel-syndrome-criteria');
  });
});
