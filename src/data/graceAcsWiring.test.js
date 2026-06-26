import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { clinicalIntentTools, nluCalculatorHubOnly } from './clinicalIntentToolCatalog';
import {
  graceAcsChatConfig,
  GRACE_ACS_REQUIRED_NLU_ALIASES,
} from './chatAssistedCalculators/graceAcs';
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
const appSource = readFileSync(join(__dirname, '../app/router.jsx'), 'utf8');
const patternsSource = readFileSync(
  join(
    __dirname,
    '../../backend/src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns.ts'
  ),
  'utf8'
);

describe('GRACE ACS (Tier B chat-assisted) wiring', () => {
  const id = 'grace-acs';

  it('is listed in PR3 Tier B audit lists', () => {
    expect([...PR3_TIER_B_CHAT_CALCULATOR_IDS]).toContain(id);
    expect([...TIER_B_CHAT_CALCULATOR_REGISTRY_IDS]).toContain(id);
  });

  it('exposes chat config with ACS risk stratification safety seed', () => {
    expect(graceAcsChatConfig.toolId).toBe(id);
    expect(graceAcsChatConfig.description).toMatch(/risk stratification/i);
    expect(graceAcsChatConfig.description).toMatch(/clinical decision support/i);
    expect(graceAcsChatConfig.description).toMatch(/not a diagnosis/i);
    expect(graceAcsChatConfig.chatSeed).toMatch(/risk stratification support only/i);
    expect(graceAcsChatConfig.chatSeed).toMatch(/does not confirm or exclude ACS/i);
    expect(graceAcsChatConfig.chatSeed).toMatch(/Do not recommend specific treatments/i);
    expect(graceAcsChatConfig.chatSeed).toMatch(/local ACS pathways/i);
  });

  it('uses hub-only routing without dedicated calculator form', () => {
    const nlu = clinicalIntentTools.find((t) => t.toolId === id);
    expect(nlu?.path).toBe('/tools/calculators');
    expect(nlu?.sidebarToolId).toBe(id);
    expect(nlu?.backendExecutable).toBe(false);
    expect(nluCalculatorHubOnly.some((h) => h.toolId === id)).toBe(true);
    expect(appSource).not.toContain("path: '/tools/calculators/grace-acs'");
  });

  it.each(GRACE_ACS_REQUIRED_NLU_ALIASES)(
    'resolves required NLU alias "%s" to grace-acs with hub launch',
    (alias) => {
      expect(NLU_TO_REGISTRY_ID[alias]).toBe(id);
      const launch = resolveCatalogLaunch(alias);
      expect(launch.path).toBe('/tools/calculators');
      expect(launch.registryId).toBe(id);
      expect(launch.openLabel).toBe('Start guided chat');
      expect(launch.orchestratorTool).toBeNull();
      expect(launch.chatSeed).toMatch(/GRACE ACS/i);
    }
  );

  it('resolves discovery slug aliases to grace-acs', () => {
    expect(resolveRegistryId('grace-score')).toBe(id);
    expect(resolveCatalogLaunch('acs-mortality-risk').registryId).toBe(id);
    expect(resolveCatalogLaunch('acute-coronary-syndrome-risk').registryId).toBe(id);
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
    expect(patternsSource).toContain('preferGraceAcs');
  });

  it('documents discovery aliases', () => {
    const ids = toolIdAliases.map((a) => a.id);
    expect(ids).toContain('grace-score');
    expect(ids).toContain('acs-mortality-risk');
    expect(ids).toContain('acute-coronary-syndrome-risk');
  });
});
