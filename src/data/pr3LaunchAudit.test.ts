/**
 * PR3 launch audit — ten-dimension consistency matrix per tool.
 * Complements pr3Consistency, pr3RegistrationAudit, and per-tool *Wiring tests.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import toolRegistry, { toolRegistryById } from './toolRegistry';
import {
  clinicalIntentTools,
  clinicalIntentToolsById,
  nluCalculatorHubOnly,
} from './clinicalIntentToolCatalog';
import {
  resolveCatalogLaunch,
  resolveRegistryId,
  NLU_TO_REGISTRY_ID,
  PR3_CALCULATOR_REGISTRY_IDS,
} from './clinicalCatalogWiring';
import { getMedicalToolsCatalogRows } from './medicalToolsCatalogIndex';
import { getAllDiscoveredTools, toolIdAliases } from './sourceCodeToolDiscovery';
import { getToolIcon } from '../navigation/iconRegistry';
import { expectedLaunchPath } from '../routes/clinicalToolRoutes';
import { extractToolPatternKeywords } from './parseToolPatterns';
import {
  PR3_CHAT_CONFIG_BY_ID,
  PR3_DISCOVERY_ALIAS_PAIRS,
  PR3_HUB_PATH,
  PR3_REQUIRED_NLU_ALIAS_PAIRS,
} from './pr3TestConstants';

const __dirname = dirname(fileURLToPath(import.meta.url));
const patternsSource = readFileSync(
  join(
    __dirname,
    '../../backend/src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns.ts'
  ),
  'utf8'
);

const PR3_DISCOVERY_BY_CANONICAL = Object.freeze(
  Object.fromEntries(
    PR3_CALCULATOR_REGISTRY_IDS.map((id) => [
      id,
      PR3_DISCOVERY_ALIAS_PAIRS.filter(([, c]) => c === id).map(([a]) => a),
    ])
  )
);

describe('PR3 launch audit — ten-dimension matrix', () => {
  it.each(PR3_CALCULATOR_REGISTRY_IDS)('%s passes registry → launch consistency', (registryId) => {
    // 1. Registry ID exists exactly once in toolRegistry
    const registryRows = toolRegistry.filter((t) => t.id === registryId);
    expect(registryRows).toHaveLength(1);
    const reg = toolRegistryById[registryId];
    expect(reg.id).toBe(registryId);
    expect(reg.panelTool).toBe('calculators');

    // 2. Hub launch path (no dedicated Tier-A route)
    expect(reg.path).toBe(PR3_HUB_PATH);
    expect(reg.initialCalc).toBeUndefined();

    // 3. NLU profile toolId matches registry id
    const nlu = clinicalIntentToolsById[registryId];
    expect(nlu?.toolId).toBe(registryId);
    expect(nlu?.sidebarToolId).toBe(registryId);
    expect(nlu?.path).toBe(PR3_HUB_PATH);
    expect(nlu?.backendExecutable).toBe(false);

    // 4. Discovery: canonical row + alias rows
    const discovered = getAllDiscoveredTools().filter((r) => r.id === registryId);
    expect(discovered).toHaveLength(1);
    expect(discovered[0].path).toBe(PR3_HUB_PATH);
    for (const aliasId of PR3_DISCOVERY_BY_CANONICAL[registryId]) {
      const aliasRow = toolIdAliases.find((a) => a.id === aliasId);
      expect(aliasRow?.mapsTo, `discovery alias ${aliasId}`).toBe(registryId);
    }

    // 5. Catalog index row with launch seed
    const catalogRow = getMedicalToolsCatalogRows().find((r) => r.primaryId === registryId);
    expect(catalogRow, `catalog missing ${registryId}`).toBeTruthy();
    expect(catalogRow.pagePath).toBe(PR3_HUB_PATH);
    expect(catalogRow.chatOnlyForm).toBe(true);
    expect(catalogRow.chatOnRequest).toBe(true);
    expect(catalogRow.chatSeed?.length).toBeGreaterThan(20);

    // 6. Backend intent pattern (exactly one block)
    expect(patternsSource.split(`toolId: '${registryId}'`).length - 1).toBe(1);
    const keywords = extractToolPatternKeywords(patternsSource, registryId);
    expect(keywords.length).toBeGreaterThan(0);

    // 7–8. resolveCatalogLaunch + chatSeed
    const launch = resolveCatalogLaunch(registryId);
    expect(launch.path).toBe(PR3_HUB_PATH);
    expect(launch.registryId).toBe(registryId);
    expect(launch.openLabel).toBe('Start guided chat');
    expect(launch.orchestratorTool).toBeNull();
    expect(launch.chatSeed).toBe(nlu.chatSeed);
    expect(launch.chatSeed).toBe(PR3_CHAT_CONFIG_BY_ID[registryId].chatSeed);
    expect(launch.chatSeed.length).toBeGreaterThan(80);

    // 9. Sidebar visibility (registry + icon)
    expect(getToolIcon(registryId)).toBeTruthy();
    expect(nluCalculatorHubOnly.some((h) => h.toolId === registryId)).toBe(true);

    // 10. Deep link / expectedLaunchPath
    expect(expectedLaunchPath(registryId)).toBe(PR3_HUB_PATH);
    expect(resolveRegistryId(registryId)).toBe(registryId);
  });

  it.each(PR3_REQUIRED_NLU_ALIAS_PAIRS)(
    'alias "%s" resolves launch for %s (no orphan catalog alias)',
    (alias, registryId) => {
      expect(NLU_TO_REGISTRY_ID[alias]).toBe(registryId);
      const launch = resolveCatalogLaunch(alias);
      expect(launch.registryId).toBe(registryId);
      expect(launch.path).toBe(PR3_HUB_PATH);
      expect(launch.chatSeed).toBeTruthy();
    }
  );

  it('has no PR3 registry ids outside the frozen audit list', () => {
    const hubPr3 = toolRegistry
      .filter((t) => t.path === PR3_HUB_PATH && (PR3_CALCULATOR_REGISTRY_IDS as readonly string[]).includes(t.id))
      .map((t) => t.id);
    expect(hubPr3.sort()).toEqual([...PR3_CALCULATOR_REGISTRY_IDS].sort());
  });

  it('has no NLU calculator profiles for PR3 ids that cannot resolveRegistryId', () => {
    const pr3Nlu = clinicalIntentTools.filter((t) => (PR3_CALCULATOR_REGISTRY_IDS as readonly string[]).includes(t.toolId));
    expect(pr3Nlu).toHaveLength(PR3_CALCULATOR_REGISTRY_IDS.length);
    for (const row of pr3Nlu) {
      expect(resolveRegistryId(row.toolId)).toBe(row.toolId);
    }
  });

  it('does not expose catalog primary rows without hub launch path', () => {
    const rows = getMedicalToolsCatalogRows().filter((r) =>
      PR3_CALCULATOR_REGISTRY_IDS.includes(r.primaryId)
    );
    for (const row of rows) {
      const launch = resolveCatalogLaunch(row.primaryId);
      expect(launch.path, `no launch for catalog primary ${row.primaryId}`).toBe(PR3_HUB_PATH);
    }
  });
});
