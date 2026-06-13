/**
 * Cross-layer PR1 coverage: catalog, discovery, NLU aliases, resolveCatalogLaunch, routes.
 * Scoring lives in src/utils/*Calculator.test.js; wiring matrix in pr1CalculatorsWiring.test.js.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import toolRegistry, { toolRegistryById } from './toolRegistry';
import { clinicalIntentTools } from './clinicalIntentToolCatalog';
import {
  resolveCatalogLaunch,
  NLU_TO_REGISTRY_ID,
  PR1_CALCULATOR_REGISTRY_IDS,
} from './clinicalCatalogWiring';
import { getMedicalCatalogSummary, getMedicalToolsCatalogRows } from './medicalToolsCatalogIndex';
import { getAllDiscoveredTools } from './sourceCodeToolDiscovery';
import { PR1_ALL_ALIAS_PAIRS, PR1_CALC_QUERY_BY_REGISTRY_ID } from './pr1TestConstants';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(__dirname, '../App.jsx'), 'utf8');

describe('PR1 coverage — catalog & discovery', () => {
  it('includes each PR1 tool in catalog rows with NLU source and chat affordances', () => {
    const rows = getMedicalToolsCatalogRows();
    for (const id of PR1_CALCULATOR_REGISTRY_IDS) {
      const row = rows.find((r) => r.primaryId === id);
      expect(row, `catalog row for ${id}`).toBeTruthy();
      expect(row.source).toMatch(/NLU|toolRegistry/);
      expect(row.chatOnRequest).toBe(true);
      expect(row.chatSeed && row.chatSeed.length).toBeGreaterThan(20);
      expect(row.pagePath).toBe(`/tools/calculators/${id}`);
    }
  });

  it('counts PR1 tools in catalog summary without double-counting primary ids', () => {
    const rows = getMedicalToolsCatalogRows();
    const summary = getMedicalCatalogSummary();
    const pr1Primaries = new Set(
      rows.filter((r) => PR1_CALCULATOR_REGISTRY_IDS.includes(r.primaryId)).map((r) => r.primaryId)
    );
    expect(pr1Primaries.size).toBe(PR1_CALCULATOR_REGISTRY_IDS.length);
    expect(summary.total).toBeGreaterThanOrEqual(clinicalIntentTools.length);
  });

  it('merges discovery rows for each PR1 id with calculator and NLU provenance', () => {
    const merged = getAllDiscoveredTools();
    for (const id of PR1_CALCULATOR_REGISTRY_IDS) {
      const hits = merged.filter((r) => r.id === id);
      expect(hits.length).toBe(1);
      const row = hits[0];
      const paths = [row.path].filter(Boolean);
      expect(paths.some((p) => p.includes(`/tools/calculators/${id}`))).toBe(true);
      const blob = [row.source, ...(row.sources || []), row.notes].filter(Boolean).join(' ');
      expect(blob).toMatch(/toolRegistry|Calculators|clinicalIntentToolCatalog|tool\.patterns/i);
    }
  });
});

describe('PR1 coverage — NLU aliases & resolveCatalogLaunch', () => {
  it('resolves NLU alias keys to the same launch as canonical PR1 ids', () => {
    for (const [alias, canonical] of PR1_ALL_ALIAS_PAIRS) {
      expect(NLU_TO_REGISTRY_ID[alias]).toBe(canonical);
      const a = resolveCatalogLaunch(alias);
      const c = resolveCatalogLaunch(canonical);
      expect(a.path).toBe(c.path);
      expect(a.registryId).toBe(c.registryId);
      expect(a.registryId).toBe(canonical);
    }
  });

  it('returns empty launch for falsy or unknown ids without throwing', () => {
    const empty = { path: null, registryId: null, chatSeed: null, orchestratorTool: null, openLabel: 'Try in chat' };
    expect(resolveCatalogLaunch('')).toEqual(empty);
    expect(resolveCatalogLaunch(null)).toEqual(empty);
    const unknown = resolveCatalogLaunch('not-a-real-tool-id-xyz');
    expect(unknown.path).toBe('/assistant');
    expect(unknown.registryId).toBeNull();
    expect(unknown.chatSeed).toBeTruthy();
  });

  it('resolves builtin calculator slug for PR1 via catalog path when NLU row exists', () => {
    for (const id of PR1_CALCULATOR_REGISTRY_IDS) {
      const fromNlu = resolveCatalogLaunch(id);
      expect(fromNlu.path).toBe(`/tools/calculators/${id}`);
    }
  });

  it('maps each PR1 id to hub calc-query deep link', () => {
    for (const id of PR1_CALCULATOR_REGISTRY_IDS) {
      expect(PR1_CALC_QUERY_BY_REGISTRY_ID[id]).toBe(`/tools/calculators?calc=${id}`);
    }
  });
});

describe('PR1 coverage — registry & routes', () => {
  it('keeps PR1 calculator inventory while retiring active App.jsx calculator mounts', () => {
    expect(appSource).not.toContain("path: '/tools/calculators'");
    expect(appSource).not.toContain('CALCULATOR_ROUTE_DEFS.map');
    expect(appSource).not.toContain('<LegacyCalculatorRouteRedirect />');
    expect(appSource).toContain(
      '<Route path="/tools/*" element={<Navigate to={CANONICAL_ROUTES.emergencyWhiteboard} replace />} />'
    );
  });

  it('exposes each PR1 registry id exactly once in toolRegistry export', () => {
    const pr1Rows = toolRegistry.filter((t) => PR1_CALCULATOR_REGISTRY_IDS.includes(t.id));
    expect(pr1Rows).toHaveLength(PR1_CALCULATOR_REGISTRY_IDS.length);
    for (const id of PR1_CALCULATOR_REGISTRY_IDS) {
      expect(toolRegistryById[id].id).toBe(id);
    }
  });
});
