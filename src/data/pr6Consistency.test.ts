/**
 * Cross-layer PR6 consistency — COPD GOLD Tier-B chat-assisted wiring.
 * Per-tool: copdGoldWiring.test.js
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import toolRegistry, { toolRegistryById } from './toolRegistry';
import { clinicalIntentTools, nluCalculatorHubOnly } from './clinicalIntentToolCatalog';
import {
  resolveCatalogLaunch,
  resolveNavigationPathForLaunch,
  NLU_TO_REGISTRY_ID,
  PR6_CALCULATOR_REGISTRY_IDS,
  PR6_TIER_B_CHAT_CALCULATOR_IDS,
  TIER_B_CHAT_CALCULATOR_REGISTRY_IDS,
} from './clinicalCatalogWiring';
import { getMedicalToolsCatalogRows } from './medicalToolsCatalogIndex';
import { getAllDiscoveredTools } from './sourceCodeToolDiscovery';
import { getToolIcon } from '../navigation/iconRegistry';
import { CHAT_ASSISTED_HUB_GROUPS } from './chatAssistedHubGroups';
import {
  PR6_HUB_PATH,
  PR6_REQUIRED_NLU_ALIAS_PAIRS,
  PR6_BACKEND_DISAMBIGUATION_HELPERS,
  PR6_CATALOG_SEARCH_QUERIES,
  PR6_ALL_ALIAS_PAIRS,
  catalogRowsMatchingQuery,
} from './pr6TestConstants';

const __dirname = dirname(fileURLToPath(import.meta.url));
const patternsSource = readFileSync(
  join(
    __dirname,
    '../../backend/src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns.ts',
  ),
  'utf8',
);

describe('PR6 consistency — centralized audit lists', () => {
  it('freezes PR6 Tier-B registry ids', () => {
    expect(Object.isFrozen(PR6_TIER_B_CHAT_CALCULATOR_IDS)).toBe(true);
    expect([...PR6_CALCULATOR_REGISTRY_IDS]).toEqual(['copd-gold']);
    expect(TIER_B_CHAT_CALCULATOR_REGISTRY_IDS).toContain('copd-gold');
  });
});

describe('PR6 consistency — registry, NLU, and backend alignment', () => {
  it('keeps hub path and backend pattern toolId aligned', () => {
    for (const id of PR6_CALCULATOR_REGISTRY_IDS) {
      const reg = toolRegistryById[id];
      expect(reg?.path).toBe(PR6_HUB_PATH);
      expect(reg?.panelTool).toBe('calculators');
      expect(patternsSource).toContain(`toolId: '${id}'`);

      const nlu = clinicalIntentTools.find((t) => t.toolId === id);
      expect(nlu?.path).toBe(PR6_HUB_PATH);
      expect(nlu?.sidebarToolId).toBe(id);
      expect(nlu?.backendExecutable).toBe(false);
      expect(nlu?.chatSeed.length).toBeGreaterThan(200);
    }
  });

  it('includes copd-gold in nluCalculatorHubOnly and chat hub groups', () => {
    expect(nluCalculatorHubOnly.some((h) => h.toolId === 'copd-gold')).toBe(true);
    const group = CHAT_ASSISTED_HUB_GROUPS.find((g) => g.toolIds.includes('copd-gold'));
    expect(group?.groupId).toBe('pulmonary-copd');
  });

  it('documents backend disambiguation helper', () => {
    for (const helper of PR6_BACKEND_DISAMBIGUATION_HELPERS) {
      expect(patternsSource).toContain(helper);
    }
  });
});

describe('PR6 consistency — aliases and launch', () => {
  it('has no conflicting alias targets within PR6 alias pairs', () => {
    const targetByAlias = new Map();
    for (const [alias, canonical] of PR6_ALL_ALIAS_PAIRS) {
      if (targetByAlias.has(alias) && targetByAlias.get(alias) !== canonical) {
        throw new Error(
          `Conflicting PR6 alias "${alias}": ${targetByAlias.get(alias)} vs ${canonical}`,
        );
      }
      targetByAlias.set(alias, canonical);
    }
  });

  it('resolves required NLU aliases via resolveCatalogLaunch', () => {
    for (const [alias, canonical] of PR6_REQUIRED_NLU_ALIAS_PAIRS) {
      expect(NLU_TO_REGISTRY_ID[alias]).toBe(canonical);
      const launch = resolveCatalogLaunch(alias);
      expect(launch.registryId).toBe(canonical);
      expect(launch.path).toBe(PR6_HUB_PATH);
      expect(launch.chatSeed).toMatch(/COPD GOLD/i);
    }
  });
});

describe('PR6 consistency — catalog and discovery', () => {
  it('includes copd-gold as chat-only catalog row', () => {
    const rows = getMedicalToolsCatalogRows();
    const matches = rows.filter((r) => r.primaryId === 'copd-gold');
    expect(matches).toHaveLength(1);
    expect(matches[0].chatOnlyForm).toBe(true);
    expect(matches[0].uiCalculatorSlug).toBeNull();
  });

  it('finds copd-gold via catalog search', () => {
    const rows = getMedicalToolsCatalogRows();
    for (const [id, query] of PR6_CATALOG_SEARCH_QUERIES) {
      const found = catalogRowsMatchingQuery(rows, query);
      expect(found.some((r) => r.primaryId === id)).toBe(true);
    }
  });

  it('includes copd-gold in discovery aggregate', () => {
    const discovered = new Set(getAllDiscoveredTools().map((r) => r.id));
    expect(discovered.has('copd-gold')).toBe(true);
  });

  it('exposes tool icon for copd-gold', () => {
    expect(getToolIcon('copd-gold')).toBeTruthy();
  });
});

describe('PR6 consistency — sidebar and canonical launch', () => {
  it('lists copd-gold exactly once in toolRegistry', () => {
    const rows = toolRegistry.filter((t) => t.id === 'copd-gold');
    expect(rows).toHaveLength(1);
    expect(rows[0].path).toBe(PR6_HUB_PATH);
  });

  it('resolveCatalogLaunch(copd-gold) uses NLU chat seed', () => {
    const nlu = clinicalIntentTools.find((t) => t.toolId === 'copd-gold');
    const launch = resolveCatalogLaunch('copd-gold');
    expect(launch.registryId).toBe('copd-gold');
    expect(launch.path).toBe(PR6_HUB_PATH);
    expect(launch.chatSeed).toBe(nlu?.chatSeed);
    expect(launch.openLabel).toBe('Start guided chat');
    expect(resolveNavigationPathForLaunch(launch)).toBe('/assistant');
  });
});
