import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { clinicalIntentTools, nluCalculatorHubOnly } from './clinicalIntentToolCatalog';
import {
  pecarnHeadChatConfig,
  PECARN_HEAD_REQUIRED_NLU_ALIASES,
} from './chatAssistedCalculators/pecarnHead';
import {
  resolveCatalogLaunch,
  NLU_TO_REGISTRY_ID,
  PR9_TIER_B_CHAT_CALCULATOR_IDS,
  TIER_B_CHAT_CALCULATOR_REGISTRY_IDS,
  resolveRegistryId,
} from './clinicalCatalogWiring';
import { getMedicalToolsCatalogRows } from './medicalToolsCatalogIndex';
import { getAllDiscoveredTools, toolIdAliases } from './sourceCodeToolDiscovery';
import { toolRegistryById } from './toolRegistry';
import { ensureChatSeedGuardrails, SAFETY_AUDIT_PATTERNS } from './clinicalSafetyGuardrails';

const __dirname = dirname(fileURLToPath(import.meta.url));
const id = 'pecarn-head';

const appSource = readFileSync(join(__dirname, '../app/router.jsx'), 'utf8');
const patternsSource = readFileSync(
  join(
    __dirname,
    '../../backend/src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns.ts'
  ),
  'utf8'
);

describe('PECARN Head Injury (Tier B chat-assisted) wiring', () => {
  it('is listed in PR9 Tier B audit lists', () => {
    expect([...PR9_TIER_B_CHAT_CALCULATOR_IDS]).toContain(id);
    expect([...TIER_B_CHAT_CALCULATOR_REGISTRY_IDS]).toContain(id);
  });

  it('exposes chat config with pediatric trauma safety seed', () => {
    expect(pecarnHeadChatConfig.toolId).toBe(id);
    expect(pecarnHeadChatConfig.description).toMatch(/informational only/i);
    expect(pecarnHeadChatConfig.description).toMatch(/does not recommend/i);
    expect(pecarnHeadChatConfig.chatSeed).toMatch(/STEP 0/i);
    expect(pecarnHeadChatConfig.chatSeed).toMatch(/does not recommend for or against head CT/i);
    expect(pecarnHeadChatConfig.chatSeed).toMatch(/Do not override clinician judgment/i);
    expect(pecarnHeadChatConfig.chatSeed).toMatch(/CT is "required"/i);
    expect(pecarnHeadChatConfig.guidedSteps).toContain('age category');
  });

  it('uses hub-only routing without dedicated calculator form', () => {
    const nlu = clinicalIntentTools.find((t) => t.toolId === id);
    expect(nlu?.path).toBe('/tools/calculators');
    expect(nlu?.sidebarToolId).toBe(id);
    expect(nlu?.backendExecutable).toBe(false);
    expect(nluCalculatorHubOnly.some((h) => h.toolId === id)).toBe(true);
    expect(appSource).not.toContain("path: '/tools/calculators/pecarn-head'");
  });

  it.each(PECARN_HEAD_REQUIRED_NLU_ALIASES)(
    'resolves required NLU alias "%s" to pecarn-head with hub launch',
    (alias) => {
      expect(NLU_TO_REGISTRY_ID[alias]).toBe(id);
      const launch = resolveCatalogLaunch(alias);
      expect(launch.path).toBe('/tools/calculators');
      expect(launch.registryId).toBe(id);
      expect(launch.openLabel).toBe('Start guided chat');
      expect(launch.chatSeed).toMatch(/PECARN/i);
    }
  );

  it('resolves discovery slug aliases to pecarn-head', () => {
    expect(resolveRegistryId('pecarn-head-injury')).toBe(id);
    expect(resolveRegistryId('pediatric-head-ct-rule')).toBe(id);
    expect(resolveCatalogLaunch('child-head-trauma-ct').registryId).toBe(id);
  });

  it('includes registry, discovery, and catalog rows', () => {
    expect(toolRegistryById[id]?.path).toBe('/tools/calculators');
    expect(getAllDiscoveredTools().some((r) => r.id === id)).toBe(true);
    const row = getMedicalToolsCatalogRows().find((r) => r.primaryId === id);
    expect(row?.chatOnlyForm).toBe(true);
    expect(row?.pagePath).toBe('/tools/calculators');
  });

  it('chat seed includes trauma guardrails after normalization', () => {
    const row = clinicalIntentTools.find((t) => t.toolId === id);
    const seed = ensureChatSeedGuardrails(row);
    expect(seed).toMatch(SAFETY_AUDIT_PATTERNS.URGENT_CARE_RE);
    expect(seed).not.toMatch(SAFETY_AUDIT_PATTERNS.PE_ACS_CERTAINTY_FORBIDDEN_RE);
  });

  it('mirrors backend patterns', () => {
    expect(patternsSource).toContain(`toolId: '${id}'`);
    expect(patternsSource).toContain('pecarn');
  });

  it('documents discovery aliases', () => {
    const ids = toolIdAliases.map((a) => a.id);
    expect(ids).toContain('pecarn-head-injury');
    expect(ids).toContain('pediatric-head-ct-rule');
  });
});
