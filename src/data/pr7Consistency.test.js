/**
 * Cross-layer PR7 consistency — Rome IV IBS Tier-B chat-assisted wiring.
 * Per-tool: romeIvIbsWiring.test.js
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import toolRegistry, { toolRegistryById } from './toolRegistry';
import {
  clinicalIntentTools,
  nluCalculatorHubOnly,
} from './clinicalIntentToolCatalog';
import {
  resolveCatalogLaunch,
  resolveNavigationPathForLaunch,
  NLU_TO_REGISTRY_ID,
  PR7_CALCULATOR_REGISTRY_IDS,
  PR7_TIER_B_CHAT_CALCULATOR_IDS,
  TIER_B_CHAT_CALCULATOR_REGISTRY_IDS,
} from './clinicalCatalogWiring';
import { getMedicalToolsCatalogRows } from './medicalToolsCatalogIndex';
import { getAllDiscoveredTools } from './sourceCodeToolDiscovery';
import { getToolIcon } from '../navigation/iconRegistry';
import { CHAT_ASSISTED_HUB_GROUPS } from './chatAssistedHubGroups';
import {
  PR7_HUB_PATH,
  PR7_REQUIRED_NLU_ALIAS_PAIRS,
  PR7_BACKEND_DISAMBIGUATION_HELPERS,
  PR7_CATALOG_SEARCH_QUERIES,
  PR7_ALL_ALIAS_PAIRS,
  catalogRowsMatchingQuery,
} from './pr7TestConstants';

const __dirname = dirname(fileURLToPath(import.meta.url));
const patternsSource = readFileSync(
  join(
    __dirname,
    '../../backend/src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns.ts'
  ),
  'utf8'
);

describe('PR7 consistency — centralized audit lists', () => {
  it('freezes PR7 Tier-B registry ids', () => {
    expect(Object.isFrozen(PR7_TIER_B_CHAT_CALCULATOR_IDS)).toBe(true);
    expect([...PR7_CALCULATOR_REGISTRY_IDS]).toEqual(['rome-iv-ibs']);
    expect(TIER_B_CHAT_CALCULATOR_REGISTRY_IDS).toContain('rome-iv-ibs');
  });
});

describe('PR7 consistency — registry, NLU, and backend alignment', () => {
  it('keeps hub path and backend pattern toolId aligned', () => {
    for (const id of PR7_CALCULATOR_REGISTRY_IDS) {
      const reg = toolRegistryById[id];
      expect(reg?.path).toBe(PR7_HUB_PATH);
      expect(patternsSource).toContain(`toolId: '${id}'`);

      const nlu = clinicalIntentTools.find((t) => t.toolId === id);
      expect(nlu?.path).toBe(PR7_HUB_PATH);
      expect(nlu?.sidebarToolId).toBe(id);
      expect(nlu?.chatSeed.length).toBeGreaterThan(200);
    }
  });

  it('includes rome-iv-ibs in nluCalculatorHubOnly and chat hub groups', () => {
    expect(nluCalculatorHubOnly.some((h) => h.toolId === 'rome-iv-ibs')).toBe(true);
    const group = CHAT_ASSISTED_HUB_GROUPS.find((g) => g.toolIds.includes('rome-iv-ibs'));
    expect(group?.groupId).toBe('gastrointestinal');
  });

  it('documents backend disambiguation helper', () => {
    for (const helper of PR7_BACKEND_DISAMBIGUATION_HELPERS) {
      expect(patternsSource).toContain(helper);
    }
  });
});

describe('PR7 consistency — aliases and launch', () => {
  it('has no conflicting alias targets within PR7 alias pairs', () => {
    const targetByAlias = new Map();
    for (const [alias, canonical] of PR7_ALL_ALIAS_PAIRS) {
      if (targetByAlias.has(alias) && targetByAlias.get(alias) !== canonical) {
        throw new Error(
          `Conflicting PR7 alias "${alias}": ${targetByAlias.get(alias)} vs ${canonical}`
        );
      }
      targetByAlias.set(alias, canonical);
    }
  });

  it('resolves required NLU aliases via resolveCatalogLaunch', () => {
    for (const [alias, canonical] of PR7_REQUIRED_NLU_ALIAS_PAIRS) {
      expect(NLU_TO_REGISTRY_ID[alias]).toBe(canonical);
      const launch = resolveCatalogLaunch(alias);
      expect(launch.registryId).toBe(canonical);
      expect(launch.path).toBe(PR7_HUB_PATH);
      expect(launch.chatSeed).toMatch(/Rome IV/i);
    }
  });
});

describe('PR7 consistency — catalog and discovery', () => {
  it('includes rome-iv-ibs as chat-only catalog row', () => {
    const rows = getMedicalToolsCatalogRows();
    const matches = rows.filter((r) => r.primaryId === 'rome-iv-ibs');
    expect(matches).toHaveLength(1);
    expect(matches[0].chatOnlyForm).toBe(true);
  });

  it('finds rome-iv-ibs via catalog search', () => {
    const rows = getMedicalToolsCatalogRows();
    for (const [id, query] of PR7_CATALOG_SEARCH_QUERIES) {
      const found = catalogRowsMatchingQuery(rows, query);
      expect(found.some((r) => r.primaryId === id)).toBe(true);
    }
  });

  it('includes rome-iv-ibs in discovery aggregate', () => {
    const discovered = new Set(getAllDiscoveredTools().map((r) => r.id));
    expect(discovered.has('rome-iv-ibs')).toBe(true);
  });

  it('exposes tool icon for rome-iv-ibs', () => {
    expect(getToolIcon('rome-iv-ibs')).toBeTruthy();
  });
});

describe('PR7 consistency — sidebar and canonical launch', () => {
  it('lists rome-iv-ibs exactly once in toolRegistry', () => {
    const rows = toolRegistry.filter((t) => t.id === 'rome-iv-ibs');
    expect(rows).toHaveLength(1);
    expect(rows[0].path).toBe(PR7_HUB_PATH);
  });

  it('resolveCatalogLaunch(rome-iv-ibs) uses NLU chat seed', () => {
    const nlu = clinicalIntentTools.find((t) => t.toolId === 'rome-iv-ibs');
    const launch = resolveCatalogLaunch('rome-iv-ibs');
    expect(launch.registryId).toBe('rome-iv-ibs');
    expect(launch.path).toBe(PR7_HUB_PATH);
    expect(launch.chatSeed).toBe(nlu?.chatSeed);
    expect(launch.openLabel).toBe('Start guided chat');
    expect(resolveNavigationPathForLaunch(launch)).toBe('/chat');
  });
});
