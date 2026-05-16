import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { clinicalIntentTools, nluCalculatorHubOnly } from './clinicalIntentToolCatalog';
import { wellsPeChatConfig } from './chatAssistedCalculators/wellsPe';
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

describe('Wells PE (Tier B chat-assisted) wiring', () => {
  const id = 'wells-pe';

  it('exports frozen Tier B audit list', () => {
    expect(Object.isFrozen(PR2_TIER_B_CHAT_CALCULATOR_IDS)).toBe(true);
    expect([...PR2_TIER_B_CHAT_CALCULATOR_IDS]).toContain(id);
  });

  it('exposes chat-assisted config with guided chatSeed', () => {
    expect(wellsPeChatConfig.toolId).toBe(id);
    expect(wellsPeChatConfig.chatSeed).toMatch(/guided step-by-step/i);
    expect(wellsPeChatConfig.chatSeed).toMatch(/does not rule in or rule out/i);
    expect(wellsPeChatConfig.hubPath).toBe('/tools/calculators');
  });

  it('registers NLU profile as hub-only (no dedicated form route)', () => {
    const nlu = clinicalIntentTools.find((t) => t.toolId === id);
    expect(nlu?.path).toBe('/tools/calculators');
    expect(nlu?.sidebarToolId).toBe(id);
    expect(nlu?.backendExecutable).toBe(false);
    expect(appSource).not.toContain("path: '/tools/calculators/wells-pe'");
    expect(appSource).not.toContain('initialCalculatorId="wells-pe"');

    const hub = nluCalculatorHubOnly.find((h) => h.toolId === id);
    expect(hub?.hubPath).toBe('/tools/calculators');
  });

  it('includes registry entry pointing at calculator hub', () => {
    const reg = toolRegistryById[id];
    expect(reg?.path).toBe('/tools/calculators');
    expect(reg?.panelTool).toBe('calculators');
    expect(reg?.initialCalc).toBeUndefined();
  });

  it('resolves launch to hub path and chat seed', () => {
    const launch = resolveCatalogLaunch(id);
    expect(launch.path).toBe('/tools/calculators');
    expect(launch.registryId).toBe(id);
    expect(launch.chatSeed).toMatch(/Wells score for suspected pulmonary embolism/i);
    expect(launch.openLabel).toBe('Open');
  });

  it('resolves NLU aliases', () => {
    expect(NLU_TO_REGISTRY_ID['wells pe']).toBe(id);
    expect(NLU_TO_REGISTRY_ID['pe score']).toBe(id);
    expect(NLU_TO_REGISTRY_ID['wells pulmonary embolism']).toBe(id);
    expect(resolveCatalogLaunch('wells-pe-score').path).toBe('/tools/calculators');
    expect(resolveRegistryId('pulmonary-embolism-wells')).toBe(id);
  });

  it('mirrors backend patterns and discovery rows', () => {
    expect(patternsSource).toContain(`toolId: '${id}'`);
    const discovered = new Set(getAllDiscoveredTools().map((r) => r.id));
    expect(discovered.has(id)).toBe(true);
    const row = getMedicalToolsCatalogRows().find((r) => r.primaryId === id);
    expect(row?.chatOnlyForm).toBe(true);
    expect(row?.chatOnRequest).toBe(true);
    expect(row?.uiCalculatorSlug).toBeNull();
  });

  it('documents discovery aliases', () => {
    const ids = toolIdAliases.map((a) => a.id);
    expect(ids).toContain('wells-pe-score');
    expect(ids).toContain('pulmonary-embolism-wells');
  });
});
