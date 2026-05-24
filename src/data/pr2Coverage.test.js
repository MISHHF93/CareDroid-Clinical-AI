/**
 * Cross-layer PR2 coverage (mirrors pr1Coverage.test.js).
 * Formula correctness & clinical edge cases: src/utils/*Calculator.test.js
 * Wiring matrices: meldCalculatorsWiring, timiCalculatorsWiring, wellsPeWiring, percWiring, pr2Consistency, pr2Comprehensive
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import toolRegistry, { toolRegistryById } from './toolRegistry';
import { clinicalIntentTools, builtinUiCalculators } from './clinicalIntentToolCatalog';
import { wellsPeChatConfig } from './chatAssistedCalculators/wellsPe';
import { percChatConfig } from './chatAssistedCalculators/perc';
import {
  resolveCatalogLaunch,
  resolveRegistryId,
  NLU_TO_REGISTRY_ID,
  BUILTIN_CALC_ID_TO_REGISTRY_ID,
  PR2_CALCULATOR_REGISTRY_IDS,
  PR2_TIER_A_CALCULATOR_REGISTRY_IDS,
  PR2_TIER_B_CHAT_CALCULATOR_IDS,
} from './clinicalCatalogWiring';
import { getMedicalCatalogSummary, getMedicalToolsCatalogRows } from './medicalToolsCatalogIndex';
import { getAllDiscoveredTools, toolIdAliases } from './sourceCodeToolDiscovery';
import { computeMeldResult } from '../utils/meldCalculator';
import { PR2_DISCOVERY_ALIAS_PAIRS } from './pr2TestConstants';
import { matchCalculatorRoute } from '../routes/clinicalToolRoutes';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(__dirname, '../App.jsx'), 'utf8');
const HUB = '/tools/calculators';

const EMPTY_LAUNCH = {
  path: null,
  registryId: null,
  chatSeed: null,
  orchestratorTool: null,
  openLabel: 'Try in chat',
};

describe('PR2 coverage — catalog & discovery', () => {
  it('includes each PR2 tool in catalog rows with NLU source and chat affordances', () => {
    const rows = getMedicalToolsCatalogRows();
    for (const id of PR2_CALCULATOR_REGISTRY_IDS) {
      const row = rows.find((r) => r.primaryId === id);
      expect(row, `catalog row for ${id}`).toBeTruthy();
      expect(row.source).toMatch(/NLU|toolRegistry/);
      expect(row.chatOnRequest).toBe(true);
      expect(row.chatSeed && row.chatSeed.length).toBeGreaterThan(20);
    }
  });

  it('indexes Tier-A tools with dedicated pagePath and calculator slug', () => {
    const rows = getMedicalToolsCatalogRows();
    for (const id of PR2_TIER_A_CALCULATOR_REGISTRY_IDS) {
      const row = rows.find((r) => r.primaryId === id);
      expect(row?.pagePath).toBe(`${HUB}/${id}`);
      expect(row?.uiCalculatorSlug).toBe(id);
      expect(row?.chatOnlyForm).toBe(false);
    }
  });

  it('indexes Tier-B tools as chat-only on calculator hub', () => {
    const rows = getMedicalToolsCatalogRows();
    for (const id of PR2_TIER_B_CHAT_CALCULATOR_IDS) {
      const row = rows.find((r) => r.primaryId === id);
      expect(row?.pagePath).toBe(HUB);
      expect(row?.chatOnlyForm).toBe(true);
      expect(row?.uiCalculatorSlug).toBeNull();
    }
  });

  it('merges discovery rows for each PR2 id exactly once', () => {
    const merged = getAllDiscoveredTools();
    for (const id of PR2_CALCULATOR_REGISTRY_IDS) {
      const hits = merged.filter((r) => r.id === id);
      expect(hits.length).toBe(1);
    }
  });

  it('counts PR2 primaries in catalog summary without double-counting', () => {
    const rows = getMedicalToolsCatalogRows();
    const summary = getMedicalCatalogSummary();
    const pr2Primaries = new Set(
      rows.filter((r) => PR2_CALCULATOR_REGISTRY_IDS.includes(r.primaryId)).map((r) => r.primaryId)
    );
    expect(pr2Primaries.size).toBe(PR2_CALCULATOR_REGISTRY_IDS.length);
    expect(summary.total).toBeGreaterThanOrEqual(clinicalIntentTools.length);
  });
});

describe('PR2 coverage — registry mappings', () => {
  it('maps Tier-A builtin calculator slugs to registry ids', () => {
    for (const id of PR2_TIER_A_CALCULATOR_REGISTRY_IDS) {
      expect(BUILTIN_CALC_ID_TO_REGISTRY_ID[id]).toBe(id);
      expect(toolRegistryById[id].id).toBe(id);
    }
  });

  it('exposes each PR2 registry id exactly once in toolRegistry export', () => {
    const pr2Rows = toolRegistry.filter((t) => PR2_CALCULATOR_REGISTRY_IDS.includes(t.id));
    expect(pr2Rows).toHaveLength(PR2_CALCULATOR_REGISTRY_IDS.length);
  });

  it('aligns discovery alias mapsTo with NLU_TO_REGISTRY_ID for PR2 aliases', () => {
    const pr2Aliases = toolIdAliases.filter((a) => PR2_CALCULATOR_REGISTRY_IDS.includes(a.mapsTo));
    expect(pr2Aliases.length).toBeGreaterThan(0);
    for (const { id, mapsTo } of pr2Aliases) {
      expect(NLU_TO_REGISTRY_ID[id]).toBe(mapsTo);
      expect(resolveRegistryId(id)).toBe(mapsTo);
    }
  });
});

describe('PR2 coverage — NLU aliases & resolveCatalogLaunch', () => {
  it('resolves NLU alias keys to the same launch as canonical PR2 ids', () => {
    for (const [alias, canonical] of PR2_DISCOVERY_ALIAS_PAIRS) {
      expect(NLU_TO_REGISTRY_ID[alias]).toBe(canonical);
      const fromAlias = resolveCatalogLaunch(alias);
      const fromCanonical = resolveCatalogLaunch(canonical);
      expect(fromAlias.path).toBe(fromCanonical.path);
      expect(fromAlias.registryId).toBe(fromCanonical.registryId);
    }
  });

  it('resolves Tier-A tools to dedicated calculator paths', () => {
    for (const id of PR2_TIER_A_CALCULATOR_REGISTRY_IDS) {
      const launch = resolveCatalogLaunch(id);
      expect(launch.path).toBe(`${HUB}/${id}`);
      expect(launch.registryId).toBe(id);
      expect(launch.openLabel).toBe('Open');
    }
  });

  it('resolves builtin calculator slug deep links for Tier-A PR2 tools', () => {
    for (const id of PR2_TIER_A_CALCULATOR_REGISTRY_IDS) {
      const builtin = builtinUiCalculators.find((c) => c.id === id);
      const launch = resolveCatalogLaunch(id);
      expect(launch.path).toBe(builtin?.path);
      expect(builtin?.calcQuery).toContain(`calc=${id}`);
    }
  });

  it('returns empty launch for falsy or unknown ids without throwing', () => {
    expect(resolveCatalogLaunch('')).toEqual(EMPTY_LAUNCH);
    expect(resolveCatalogLaunch(null)).toEqual(EMPTY_LAUNCH);
    expect(resolveCatalogLaunch('not-a-pr2-tool-xyz').path).toBe('/assistant');
  });

  it('separates Wells PE score aliases from PERC rule-out aliases', () => {
    expect(resolveCatalogLaunch('pe-score').registryId).toBe('wells-pe');
    expect(resolveCatalogLaunch('pe-rule-out').registryId).toBe('perc');
    expect(resolveCatalogLaunch('pe-score').path).toBe(HUB);
    expect(resolveCatalogLaunch('pe-rule-out').path).toBe(HUB);
  });
});

describe('PR2 coverage — Wells PE conversational launch', () => {
  const id = 'wells-pe';

  it('resolveCatalogLaunch returns hub path, registry id, and guided chat seed', () => {
    const launch = resolveCatalogLaunch(id);
    expect(launch.path).toBe(wellsPeChatConfig.hubPath);
    expect(launch.registryId).toBe(wellsPeChatConfig.registryId);
    expect(launch.chatSeed).toMatch(/guided step-by-step/i);
    expect(launch.chatSeed).toMatch(/does not rule in or rule out/i);
    expect(launch.chatSeed.length).toBeGreaterThan(100);
  });

  it('NLU profile chatSeed matches config used for catalog launch', () => {
    const nlu = clinicalIntentTools.find((t) => t.toolId === id);
    expect(nlu?.chatSeed).toBe(wellsPeChatConfig.chatSeed);
    expect(resolveCatalogLaunch(id).chatSeed).toBe(nlu?.chatSeed);
  });

  it('resolves hyphenated Wells aliases to the same hub launch', () => {
    const canonical = resolveCatalogLaunch(id);
    for (const alias of ['wells-pe-score', 'pe-score', 'pulmonary-embolism-wells']) {
      const fromAlias = resolveCatalogLaunch(alias);
      expect(fromAlias.registryId).toBe(canonical.registryId);
      expect(fromAlias.path).toBe(canonical.path);
    }
  });
});

describe('PR2 coverage — PERC conversational launch', () => {
  const id = 'perc';

  it('resolveCatalogLaunch returns hub path, registry id, and safety-focused chat seed', () => {
    const launch = resolveCatalogLaunch(id);
    expect(launch.path).toBe(percChatConfig.hubPath);
    expect(launch.registryId).toBe(percChatConfig.registryId);
    expect(launch.chatSeed).toMatch(/pre-test probability.*LOW/i);
    expect(launch.chatSeed).toMatch(/does NOT definitively rule out/i);
    expect(launch.chatSeed.length).toBeGreaterThan(100);
  });

  it('NLU profile chatSeed matches config used for catalog launch', () => {
    const nlu = clinicalIntentTools.find((t) => t.toolId === id);
    expect(nlu?.chatSeed).toBe(percChatConfig.chatSeed);
    expect(resolveCatalogLaunch(id).chatSeed).toBe(nlu?.chatSeed);
  });

  it('resolves hyphenated PERC aliases to the same hub launch', () => {
    const canonical = resolveCatalogLaunch(id);
    for (const alias of ['perc-rule', 'pe-rule-out', 'pulmonary-embolism-rule-out']) {
      const fromAlias = resolveCatalogLaunch(alias);
      expect(fromAlias.registryId).toBe(canonical.registryId);
      expect(fromAlias.path).toBe(canonical.path);
    }
  });
});

describe('PR2 coverage — invalid input handling (MELD)', () => {
  const validBase = {
    bilirubin: '2',
    bilirubinUnit: 'mg_dl',
    inr: '1.5',
    creatinine: '1.2',
    creatinineUnit: 'mg_dl',
    onDialysis: false,
  };

  it('rejects empty required fields', () => {
    const out = computeMeldResult({ ...validBase, bilirubin: '', inr: '' });
    expect(out.ok).toBe(false);
    expect(out.errors?.length).toBeGreaterThan(0);
  });

  it('rejects non-numeric bilirubin and INR', () => {
    expect(computeMeldResult({ ...validBase, bilirubin: 'abc' }).ok).toBe(false);
    expect(computeMeldResult({ ...validBase, inr: 'x' }).ok).toBe(false);
  });

  it('requires sodium when computing MELD-Na', () => {
    const out = computeMeldResult(validBase, { includeMeldNa: true });
    expect(out.ok).toBe(false);
    expect(out.errors?.some((e) => /sodium/i.test(e))).toBe(true);
  });

  it('rejects sodium outside 100–180 mEq/L', () => {
    const out = computeMeldResult({ ...validBase, sodium: '90' }, { includeMeldNa: true });
    expect(out.ok).toBe(false);
    expect(out.errors?.some((e) => /sodium/i.test(e))).toBe(true);
  });
});

describe('PR2 coverage — registry & routes', () => {
  it('registers Tier-A calculator routes via CALCULATOR_ROUTE_DEFS before hub', () => {
    expect(appSource).toContain('CALCULATOR_ROUTE_DEFS.map');
    for (const id of PR2_TIER_A_CALCULATOR_REGISTRY_IDS) {
      expect(matchCalculatorRoute(`${HUB}/${id}`)?.calculatorSlug).toBe(id);
    }
  });

  it('does not register Tier-B standalone calculator routes', () => {
    for (const id of PR2_TIER_B_CHAT_CALCULATOR_IDS) {
      expect(appSource).not.toContain(`path: '${HUB}/${id}'`);
    }
  });
});
