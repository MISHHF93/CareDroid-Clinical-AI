/**
 * Dispatch Intelligence Assistant (dispatch-ai) Tier-B wiring contracts.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { toolRegistryById } from './toolRegistry';
import { clinicalIntentTools, nluCalculatorHubOnly } from './clinicalIntentToolCatalog';
import { dispatchAiChatConfig } from './chatAssistedFleet/dispatchAi';
import {
  resolveCatalogLaunch,
  resolveNavigationPathForLaunch,
  NLU_TO_REGISTRY_ID,
  PR_FLEET_TIER_B_CHAT_REGISTRY_IDS,
  REGISTRY_ID_TO_ORCHESTRATOR_TOOL,
  TIER_B_CHAT_CALCULATOR_REGISTRY_IDS,
  resolveRegistryId,
} from './clinicalCatalogWiring';
import { getMedicalToolsCatalogRows } from './medicalToolsCatalogIndex';
import { getAllDiscoveredTools, toolIdAliases } from './sourceCodeToolDiscovery';
import { CHAT_ASSISTED_HUB_GROUPS } from './chatAssistedHubGroups';
import {
  extractToolPatternKeywords,
  messageMatchesToolKeywords,
  messageTriggersBackendDisambiguation,
} from './testHelpers/clinicalToolsTestFixtures';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(__dirname, '../app/router.tsx'), 'utf8');
const patternsSource = readFileSync(
  join(
    __dirname,
    '../../backend/src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns.ts'
  ),
  'utf8'
);

const HUB_PATH = '/tools/calculators';
const id = 'dispatch-ai';

const ALIAS_PAIRS = [
  ['dispatch', id],
  ['dispatch assistant', id],
  ['dispatch-assistant', id],
  ['vehicle dispatch', id],
  ['vehicle-dispatch', id],
  ['fleet dispatch', id],
  ['fleet-dispatch', id],
  ['dispatch intelligence', id],
  ['dispatch-intelligence', id],
];

describe('Dispatch Intelligence (dispatch-ai) wiring', () => {
  it('is listed in PR-FLEET Tier-B chat audit ids', () => {
    expect(PR_FLEET_TIER_B_CHAT_REGISTRY_IDS).toContain(id);
    expect(TIER_B_CHAT_CALCULATOR_REGISTRY_IDS).toContain(id);
  });

  it('exposes chat config with human-approval workflow', () => {
    expect(dispatchAiChatConfig.toolId).toBe(id);
    expect(dispatchAiChatConfig.hubPath).toBe(HUB_PATH);
    expect(dispatchAiChatConfig.chatSeed).toMatch(/human dispatcher must approve/i);
    expect(dispatchAiChatConfig.chatSeed).toMatch(/vehicle assignment OPTIONS/i);
    expect(dispatchAiChatConfig.chatSeed).toMatch(/do NOT have authority/i);
  });

  it('uses calculators hub launch pattern without dedicated route', () => {
    const reg = toolRegistryById[id];
    expect(reg?.path).toBe(HUB_PATH);
    expect(reg?.panelTool).toBe('calculators');

    const nlu = clinicalIntentTools.find((t) => t.toolId === id);
    if (!nlu) throw new Error('expected nlu tool entry to exist');
    expect(nlu?.path).toBe(HUB_PATH);
    expect(nlu?.sidebarToolId).toBe(id);
    expect(nlu?.backendRouted).toBe(true);
    expect(nlu?.postExecutable).toBe(false);
    expect(nluCalculatorHubOnly.some((h) => h.toolId === id)).toBe(true);
    expect(appSource).not.toContain("path: '/tools/calculators/dispatch-ai'");
  });

  it('resolves catalog launch to hub with dispatch chatSeed', () => {
    const launch = resolveCatalogLaunch(id);
    expect(launch.path).toBe(HUB_PATH);
    expect(launch.registryId).toBe(id);
    expect(launch.chatSeed).toBe(dispatchAiChatConfig.chatSeed);
    expect(launch.chatSeed).toMatch(/requires dispatcher approval/i);
    expect(launch.openLabel).toBe('Start guided chat');
    expect(launch.orchestratorTool).toBeNull();
    expect(REGISTRY_ID_TO_ORCHESTRATOR_TOOL[id]).toBeUndefined();
  });

  it('maps hub launch to chat for conversational workflow', () => {
    const launch = resolveCatalogLaunch(id);
    expect(resolveNavigationPathForLaunch(launch)).toBe('/assistant');
  });

  it.each(ALIAS_PAIRS)('alias "%s" resolves same launch as dispatch-ai', (alias, expected) => {
    expect(expected).toBe(id);
    const fromAlias = resolveCatalogLaunch(alias);
    const fromCanonical = resolveCatalogLaunch(id);
    expect(fromAlias.registryId).toBe(id);
    expect(fromAlias.path).toBe(fromCanonical.path);
    expect(fromAlias.chatSeed).toBe(fromCanonical.chatSeed);
    expect(resolveRegistryId(alias)).toBe(id);
    expect(NLU_TO_REGISTRY_ID[alias]).toBe(id);
  });

  it('includes discovery and catalog rows', () => {
    expect(getAllDiscoveredTools().some((r) => r.id === id)).toBe(true);
    const row = getMedicalToolsCatalogRows().find((r) => r.primaryId === id);
    expect(row?.pagePath).toBe(HUB_PATH);
    expect(row?.chatOnRequest).toBe(true);
    expect(row?.chatOnlyForm).toBe(true);
  });

  it('registers fleet-dispatch hub group', () => {
    const group = CHAT_ASSISTED_HUB_GROUPS.find((g) => g.groupId === 'fleet-dispatch');
    expect(group?.toolIds).toContain(id);
    expect(group?.lead).toMatch(/does not auto-assign/i);
  });

  it('mirrors backend patterns and disambiguation', () => {
    expect(patternsSource).toContain("toolId: 'dispatch-ai'");
    expect(patternsSource).toContain('preferDispatchAi');
  });

  it('documents discovery aliases', () => {
    const ids = toolIdAliases.filter((a) => a.mapsTo === id).map((a) => a.id);
    expect(ids).toContain('dispatch');
    expect(ids).toContain('dispatch-assistant');
    expect(ids).toContain('vehicle-dispatch');
    expect(ids).toContain('fleet-dispatch');
  });
});

describe('Dispatch Intelligence NLU keyword matching', () => {
  const keywords = extractToolPatternKeywords(patternsSource, id);

  it.each([
    'help with dispatch intelligence for vehicle assignment',
    'fleet dispatch bottleneck review',
    'dispatch assistant prioritize requests',
    'vehicle dispatch queue triage',
  ])('phrase "%s" matches backend keywords', (phrase) => {
    expect(messageMatchesToolKeywords(phrase, keywords)).toBe(true);
  });

  it.each([
    'dispatch intelligence for backlog',
    'fleet dispatch assign vehicle',
    'dispatch assistant prioritize queue',
  ])('phrase "%s" triggers disambiguation helper', (phrase) => {
    expect(messageTriggersBackendDisambiguation(phrase, id)).toBe(true);
  });
});
