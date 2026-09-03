/**
 * Cross-layer PR5 coverage (mirrors pr4aCoverage.test.js).
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { toolRegistryById } from './toolRegistry';
import { clinicalIntentTools, builtinUiCalculators } from './clinicalIntentToolCatalog';
import { resolveCatalogLaunch, PR5_CALCULATOR_REGISTRY_IDS } from './clinicalCatalogWiring';
import { getMedicalToolsCatalogRows } from './medicalToolsCatalogIndex';
import { PR5_ALL_ALIAS_PAIRS, PR5_TOOL_IDS } from './pr5TestConstants';

const __dirname = dirname(fileURLToPath(import.meta.url));
const patternsSource = readFileSync(
  join(
    __dirname,
    '../../backend/src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns.ts',
  ),
  'utf8',
);

describe('PR5 coverage — tool id matrix', () => {
  it('PR5_TOOL_IDS matches calculator registry list', () => {
    expect([...PR5_TOOL_IDS]).toEqual([...PR5_CALCULATOR_REGISTRY_IDS]);
  });

  it.each(PR5_CALCULATOR_REGISTRY_IDS)('%s has NLU profile keywords in backend patterns', (id) => {
    expect(patternsSource).toContain(`toolId: '${id}'`);
    const nlu = clinicalIntentTools.find((t) => t.toolId === id);
    expect(nlu?.description?.length).toBeGreaterThan(30);
  });
});

describe('PR5 coverage — launch paths', () => {
  it.each(PR5_CALCULATOR_REGISTRY_IDS)('resolveCatalogLaunch(%s) opens dedicated route', (id) => {
    const launch = resolveCatalogLaunch(id);
    expect(launch.path).toBe(`/tools/calculators/${id}`);
    expect(launch.registryId).toBe(id);
    expect(toolRegistryById[id]?.path).toBe(launch.path);
  });

  it.each(PR5_ALL_ALIAS_PAIRS)('alias %s → %s resolves launch', (alias, canonical) => {
    const launch = resolveCatalogLaunch(alias);
    expect(launch.registryId).toBe(canonical);
    expect(launch.path).toBe(`/tools/calculators/${canonical}`);
  });
});

describe('PR5 coverage — builtin calculators', () => {
  it.each(PR5_CALCULATOR_REGISTRY_IDS)('%s is in builtinUiCalculators with matching path', (id) => {
    const row = builtinUiCalculators.find((c) => c.id === id);
    expect(row?.path).toBe(`/tools/calculators/${id}`);
    expect(row?.calcQuery).toContain(`calc=${id}`);
    expect(row?.implementation).toMatch(new RegExp(`${id}Calculator`, 'i'));
  });
});

describe('PR5 coverage — catalog rows', () => {
  it('has exactly one catalog row per PR5 tool', () => {
    const rows = getMedicalToolsCatalogRows();
    for (const id of PR5_CALCULATOR_REGISTRY_IDS) {
      expect(rows.filter((r) => r.primaryId === id)).toHaveLength(1);
    }
  });
});
