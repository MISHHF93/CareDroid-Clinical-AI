/**
 * PR3 comprehensive Vitest coverage — registry, catalog, discovery, NLU, launch,
 * chat seeds, backend aliases, hub routes, duplicate detection, and orphan checks.
 * Complements pr3RegistrationAudit.test.js, pr3Coverage.test.js, pr3Consistency.test.js,
 * and per-tool *Wiring tests. Formula detail: src/utils/*Calculator.test.js
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import toolRegistry, { toolRegistryById } from './toolRegistry';
import {
  clinicalIntentTools,
  clinicalIntentToolsById,
  builtinUiCalculators,
  nluCalculatorHubOnly,
} from './clinicalIntentToolCatalog';
import { graceAcsChatConfig } from './chatAssistedCalculators/graceAcs';
import { nihssChatConfig } from './chatAssistedCalculators/nihss';
import { canadianCSpineChatConfig } from './chatAssistedCalculators/canadianCSpine';
import { ottawaAnkleChatConfig } from './chatAssistedCalculators/ottawaAnkle';
import {
  resolveCatalogLaunch,
  resolveNavigationPathForLaunch,
  resolveRegistryId,
  NLU_TO_REGISTRY_ID,
  BUILTIN_CALC_ID_TO_REGISTRY_ID,
  PR3_CALCULATOR_REGISTRY_IDS,
  PR3_TIER_B_CHAT_CALCULATOR_IDS,
  TIER_B_CHAT_CALCULATOR_REGISTRY_IDS,
  REGISTRY_ID_TO_ORCHESTRATOR_TOOL,
  ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS,
} from './clinicalCatalogWiring';
import { getMedicalToolsCatalogRows } from './medicalToolsCatalogIndex';
import { getAllDiscoveredTools, toolIdAliases } from './sourceCodeToolDiscovery';
import { getToolIcon } from '../navigation/iconRegistry';
import {
  CALCULATOR_ROUTE_DEFS,
  expectedLaunchPath,
  isKnownToolAreaPath,
} from '../routes/clinicalToolRoutes';
import { TOOL_PATTERNS_PATH } from './clinicalToolAliasSync';
import {
  aliasToSlug,
  extractToolPatternKeywords,
  parseClinicalToolPatterns,
} from './parseToolPatterns';
import { computeGraceAcsRisk } from '../utils/graceAcsCalculator';
import { computeNihssTotal } from '../utils/nihssCalculator';
import {
  applyCanadianCSpineRule,
  evaluateCcrHighRisk,
  evaluateCcrLowRisk,
} from '../utils/canadianCSpineCalculator';
import { evaluateOttawaAnkleRule } from '../utils/ottawaAnkleCalculator';
import {
  PR3_ALL_ALIAS_PAIRS,
  PR3_CATALOG_SEARCH_QUERIES,
  PR3_CHAT_CONFIG_BY_ID,
  PR3_DISCOVERY_ALIAS_PAIRS,
  PR3_EMPTY_LAUNCH,
  PR3_HUB_PATH,
  PR3_HUB_ROUTE_BY_REGISTRY_ID,
  PR3_NLU_ALIAS_PAIRS,
  PR3_REQUIRED_NLU_ALIAS_PAIRS,
  PR3_TOOL_IDS,
  catalogRowsMatchingQuery,
} from './pr3TestConstants';
import {
  CANADIAN_C_SPINE_ALL_LOW_RISK,
  CANADIAN_C_SPINE_NO_HIGH_RISK,
  CANADIAN_C_SPINE_LAUNCH_ALIASES,
  GRACE_ACS_LAUNCH_ALIASES,
  GRACE_ACS_LOW_RISK_INPUT,
  NIHSS_LAUNCH_ALIASES,
  OTTAWA_ANKLE_IMAGING_INDICATED,
  OTTAWA_ANKLE_LAUNCH_ALIASES,
  PR3_LAUNCH_ALIASES_BY_REGISTRY_ID,
} from './testHelpers/pr3TestFixtures';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(__dirname, '../app/router.tsx'), 'utf8');
const patternsSource = readFileSync(TOOL_PATTERNS_PATH, 'utf8');

const PR3_CHAT_CONFIGS = [
  graceAcsChatConfig,
  nihssChatConfig,
  canadianCSpineChatConfig,
  ottawaAnkleChatConfig,
];

/** Documents the ten PR3 audit areas (deterministic checklist, not a snapshot). */
export const PR3_COVERAGE_AREA_LABELS = Object.freeze([
  'registry inclusion',
  'catalog inclusion',
  'discovery inclusion',
  'NLU alias matching',
  'resolveCatalogLaunch behavior',
  'chatSeed presence',
  'backend alias consistency',
  'route or hub path correctness',
  'duplicate alias detection',
  'no orphaned tool IDs',
]);

describe('PR3 comprehensive — coverage matrix', () => {
  it('targets the four required Tier-B registry ids', () => {
    expect([...PR3_TOOL_IDS]).toEqual([
      'grace-acs',
      'nihss',
      'canadian-c-spine',
      'ottawa-ankle',
    ]);
    expect([...PR3_CALCULATOR_REGISTRY_IDS]).toEqual([...PR3_TOOL_IDS]);
    expect([...PR3_TIER_B_CHAT_CALCULATOR_IDS]).toEqual([...PR3_TOOL_IDS]);
  });

  it('documents ten deterministic audit areas', () => {
    expect(PR3_COVERAGE_AREA_LABELS).toHaveLength(10);
    expect(PR3_COVERAGE_AREA_LABELS[0]).toBe('registry inclusion');
    expect(PR3_COVERAGE_AREA_LABELS[9]).toBe('no orphaned tool IDs');
  });
});

describe('PR3 comprehensive — 1. registry inclusion', () => {
  it.each(PR3_TOOL_IDS)('toolRegistry includes %s exactly once on calculators hub', (id) => {
    expect(toolRegistry.filter((t) => t.id === id)).toHaveLength(1);
    const reg = toolRegistryById[id];
    expect(reg.id).toBe(id);
    expect(reg.panelTool).toBe('calculators');
    expect(reg.path).toBe(PR3_HUB_PATH);
    expect(reg.initialCalc).toBeUndefined();
    expect(getToolIcon(id)).toBeTruthy();
  });

  it.each(PR3_TOOL_IDS)('%s is in combined Tier-B hub audit list', (id) => {
    expect([...TIER_B_CHAT_CALCULATOR_REGISTRY_IDS]).toContain(id);
  });

  it.each(PR3_TOOL_IDS)('%s is not a builtin calculator slug', (id) => {
    expect(builtinUiCalculators.some((c) => c.id === id)).toBe(false);
    expect(BUILTIN_CALC_ID_TO_REGISTRY_ID[id]).toBeUndefined();
  });
});

describe('PR3 comprehensive — 2. catalog inclusion', () => {
  it.each(PR3_TOOL_IDS)('medical catalog row for %s is chat-only on hub', (id) => {
    const rows = getMedicalToolsCatalogRows().filter((r) => r.primaryId === id);
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.source).toMatch(/NLU|toolRegistry/);
    expect(row.pagePath).toBe(PR3_HUB_PATH);
    expect(row.chatOnlyForm).toBe(true);
    expect(row.uiCalculatorSlug).toBeNull();
    expect(row.chatOnRequest).toBe(true);
    // grace-acs and canadian-c-spine are real registerTool() backend executors, so
    // backendExecutor is true; nihss/ottawa-ankle have no backend executor.
    expect(row.backendExecutor).toBe(
      (ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS as readonly string[]).includes(id)
    );
    expect(row.chatSeed?.length).toBeGreaterThan(20);
    expect(row.chatSeed).toBe(clinicalIntentToolsById[id]?.chatSeed);
  });

  it.each(PR3_CATALOG_SEARCH_QUERIES)('catalog search "%s" finds %s', (registryId, query) => {
    const hits = catalogRowsMatchingQuery(getMedicalToolsCatalogRows(), query);
    expect(hits.some((r) => r.primaryId === registryId || r.sidebarToolId === registryId)).toBe(
      true
    );
  });
});

describe('PR3 comprehensive — 3. discovery inclusion', () => {
  it.each(PR3_TOOL_IDS)('merged discovery includes canonical %s once', (id) => {
    const hits = getAllDiscoveredTools().filter((r) => r.id === id);
    expect(hits).toHaveLength(1);
    expect(hits[0].path).toBe(PR3_HUB_PATH);
    const blob = [hits[0].source, ...(hits[0].sources || []), hits[0].notes].filter(Boolean).join(' ');
    expect(blob).toMatch(/toolRegistry|clinicalIntentToolCatalog|tool\.patterns|chatAssisted/i);
  });

  it.each(PR3_DISCOVERY_ALIAS_PAIRS)('discovery alias %s → %s', (aliasId, canonical) => {
    const row = toolIdAliases.find((a) => a.id === aliasId);
    expect(row?.mapsTo).toBe(canonical);
    const merged = getAllDiscoveredTools().find((r) => r.id === aliasId);
    expect(merged?.mapsTo).toBe(canonical);
    expect(merged?.status).toBe('alias');
  });
});

describe('PR3 comprehensive — 4. NLU alias matching', () => {
  it.each(PR3_REQUIRED_NLU_ALIAS_PAIRS)('required NLU alias "%s" → %s', (alias, canonical) => {
    expect(NLU_TO_REGISTRY_ID[alias]).toBe(canonical);
    expect(resolveRegistryId(alias)).toBe(canonical);
  });

  it.each(PR3_NLU_ALIAS_PAIRS)('extended NLU alias "%s" → %s', (alias, canonical) => {
    expect(NLU_TO_REGISTRY_ID[alias]).toBe(canonical);
    expect(resolveRegistryId(alias)).toBe(canonical);
  });

  it.each(PR3_DISCOVERY_ALIAS_PAIRS)('discovery slug "%s" → %s via NLU map', (aliasId, canonical) => {
    expect(NLU_TO_REGISTRY_ID[aliasId]).toBe(canonical);
    expect(resolveRegistryId(aliasId)).toBe(canonical);
  });

  it('separates NIHSS stroke scale from Canadian C-Spine aliases', () => {
    expect(NLU_TO_REGISTRY_ID['stroke scale']).toBe('nihss');
    expect(NLU_TO_REGISTRY_ID['c spine rule']).toBe('canadian-c-spine');
    expect(resolveCatalogLaunch('stroke scale').registryId).toBe('nihss');
    expect(resolveCatalogLaunch('cervical-spine-rule').registryId).toBe('canadian-c-spine');
  });
});

describe('PR3 comprehensive — 5. resolveCatalogLaunch behavior', () => {
  it.each(PR3_TOOL_IDS)('canonical launch for %s → hub with guided chat', (id) => {
    const launch = resolveCatalogLaunch(id);
    expect(launch.path).toBe(PR3_HUB_PATH);
    expect(launch.registryId).toBe(id);
    // grace-acs and canadian-c-spine are now real registerTool() backend executors
    // (Tier C / backend-backed), so their launch resolves to 'Open' with a real
    // orchestratorTool id; nihss/ottawa-ankle remain chat-only (no backend executor).
    const expectedOrchestratorTool = REGISTRY_ID_TO_ORCHESTRATOR_TOOL[id] ?? null;
    expect(launch.openLabel).toBe(expectedOrchestratorTool ? 'Open' : 'Start guided chat');
    expect(launch.orchestratorTool).toBe(expectedOrchestratorTool);
    expect(launch.chatSeed).toBe(PR3_CHAT_CONFIG_BY_ID[id].chatSeed);
    expect(launch.chatSeed?.length).toBeGreaterThan(80);
  });

  it.each(PR3_ALL_ALIAS_PAIRS)(
    'resolveCatalogLaunch("%s") matches canonical %s',
    (alias, canonical) => {
      const fromAlias = resolveCatalogLaunch(alias);
      const fromCanonical = resolveCatalogLaunch(canonical);
      expect(fromAlias.path).toBe(fromCanonical.path);
      expect(fromAlias.registryId).toBe(fromCanonical.registryId);
      expect(fromAlias.chatSeed).toBe(fromCanonical.chatSeed);
    }
  );

  it.each(PR3_TOOL_IDS)('resolveNavigationPathForLaunch(%s) opens chat for chat visibility', (id) => {
    const launch = resolveCatalogLaunch(id);
    expect(resolveNavigationPathForLaunch(launch)).toBe('/assistant');
  });

  it('returns empty launch shape for unknown ids', () => {
    expect(resolveCatalogLaunch('')).toEqual(PR3_EMPTY_LAUNCH);
    expect(resolveCatalogLaunch(null)).toEqual(PR3_EMPTY_LAUNCH);
    const unknown = resolveCatalogLaunch('not-a-pr3-tool-xyz');
    expect(unknown.path).toBe('/assistant');
    expect(unknown.registryId).toBeNull();
    expect(unknown.chatSeed).toBeTruthy();
    expect(resolveNavigationPathForLaunch(unknown)).toBe('/assistant');
  });
});

describe('PR3 comprehensive — 6. chatSeed presence', () => {
  it.each(PR3_TOOL_IDS)('clinicalIntentTools row for %s has guided chatSeed', (id) => {
    const nlu = clinicalIntentTools.find((t) => t.toolId === id);
    expect(nlu?.path).toBe(PR3_HUB_PATH);
    expect(nlu?.sidebarToolId).toBe(id);
    // grace-acs and canadian-c-spine are real registerTool() backend executors, so
    // backendExecutable is true; nihss/ottawa-ankle have no backend executor.
    expect(nlu?.backendExecutable).toBe(
      (ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS as readonly string[]).includes(id)
    );
    expect(nlu?.chatSeed?.length).toBeGreaterThan(100);
    expect(nlu?.chatSeed).toBe(PR3_CHAT_CONFIG_BY_ID[id].chatSeed);
  });

  it.each(PR3_TOOL_IDS)('%s is listed in nluCalculatorHubOnly', (id) => {
    expect(nluCalculatorHubOnly.some((h) => h.toolId === id)).toBe(true);
  });

  it.each(PR3_CHAT_CONFIGS)('$toolId chat config seed includes STEP 0 safety gate', (cfg) => {
    expect(cfg.chatSeed).toMatch(/STEP 0/i);
    expect(cfg.chatSeed.length).toBeGreaterThan(200);
    expect(cfg.hubPath).toBe(PR3_HUB_PATH);
    expect(cfg.toolId).toBe(cfg.registryId);
  });
});

describe('PR3 comprehensive — 7. backend alias consistency', () => {
  it.each(PR3_TOOL_IDS)('tool.patterns.ts declares toolId %s exactly once', (id) => {
    const patterns = parseClinicalToolPatterns(patternsSource);
    expect(patterns.filter((p) => p.toolId === id)).toHaveLength(1);
  });

  it('documents PR3 disambiguation helpers in backend patterns', () => {
    expect(patternsSource).toContain('preferGraceAcs');
    expect(patternsSource).toContain('preferNihss');
    expect(patternsSource).toContain('preferCanadianCSpine');
    expect(patternsSource).toContain('preferOttawaAnkle');
  });

  it.each(PR3_TOOL_IDS)(
    'product-required phrases appear in backend keywords or NLU map for %s',
    (id) => {
      const keywords = extractToolPatternKeywords(patternsSource, id).map((k) => aliasToSlug(k));
      const requiredForTool = PR3_REQUIRED_NLU_ALIAS_PAIRS.filter(([, c]) => c === id).map(
        ([a]) => a
      );
      for (const phrase of requiredForTool) {
        const slug = aliasToSlug(phrase);
        const inNluMap = NLU_TO_REGISTRY_ID[phrase] === id || NLU_TO_REGISTRY_ID[slug] === id;
        const inBackend = keywords.includes(slug) || keywords.includes(aliasToSlug(phrase));
        expect(
          inNluMap || inBackend,
          `alias "${phrase}" for ${id} missing from NLU_TO_REGISTRY_ID and backend keywords`
        ).toBe(true);
      }
    }
  );
});

describe('PR3 comprehensive — 8. route or hub path correctness', () => {
  it.each(PR3_TOOL_IDS)('expectedLaunchPath(%s) → calculators hub', (id) => {
    expect(expectedLaunchPath(id)).toBe(PR3_HUB_PATH);
    expect(PR3_HUB_ROUTE_BY_REGISTRY_ID[id]).toBe(PR3_HUB_PATH);
    expect(isKnownToolAreaPath(PR3_HUB_PATH)).toBe(true);
  });

  it.each(PR3_TOOL_IDS)('%s has no dedicated CALCULATOR_ROUTE_DEFS slug', (id) => {
    expect(CALCULATOR_ROUTE_DEFS.some((d) => d.calculatorSlug === id)).toBe(false);
    expect(appSource).not.toContain(`path: '${PR3_HUB_PATH}/${id}'`);
    expect(appSource).not.toContain(`initialCalculatorId="${id}"`);
    expect(toolRegistryById[id].path).not.toBe(`/tools/calculator/${id}`);
    expect(toolRegistryById[id].path).not.toMatch(/^\/tools\/calculator\//);
  });
});

describe('PR3 comprehensive — 9. duplicate alias detection', () => {
  it('uses unique toolIdAliases.id values globally', () => {
    const seen = new Set();
    for (const { id } of toolIdAliases) {
      expect(seen.has(id), `duplicate toolIdAliases.id: ${id}`).toBe(false);
      seen.add(id);
    }
  });

  it('has no conflicting targets within PR3_ALL_ALIAS_PAIRS', () => {
    const byAlias = new Map();
    for (const [alias, canonical] of PR3_ALL_ALIAS_PAIRS) {
      const prev = byAlias.get(alias);
      expect(prev, `alias "${alias}" maps to both ${prev} and ${canonical}`).toBeUndefined();
      byAlias.set(alias, canonical);
    }
  });

  it('does not map PR3 discovery aliases to conflicting mapsTo', () => {
    const pr3Rows = toolIdAliases.filter((a) => (PR3_TOOL_IDS as readonly string[]).includes(a.mapsTo));
    const ids = pr3Rows.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const [aliasId, canonical] of PR3_DISCOVERY_ALIAS_PAIRS) {
      const row = toolIdAliases.find((a) => a.id === aliasId);
      expect(row?.mapsTo).toBe(canonical);
      expect(NLU_TO_REGISTRY_ID[aliasId]).toBe(canonical);
    }
  });
});

describe('PR3 comprehensive — 10. no orphaned tool IDs', () => {
  it.each(PR3_TOOL_IDS)('%s is wired through NLU, hub-only, catalog, and discovery', (id) => {
    expect(toolRegistryById[id]).toBeTruthy();
    expect(clinicalIntentToolsById[id]).toBeTruthy();
    expect(nluCalculatorHubOnly.some((h) => h.toolId === id)).toBe(true);
    expect(getMedicalToolsCatalogRows().some((r) => r.primaryId === id)).toBe(true);
    expect(getAllDiscoveredTools().some((r) => r.id === id)).toBe(true);
  });

  it('does not leave PR3-targeting discovery aliases pointing at missing registry ids', () => {
    const pr3AliasRows = toolIdAliases.filter((a) => (PR3_TOOL_IDS as readonly string[]).includes(a.mapsTo));
    for (const { id, mapsTo } of pr3AliasRows) {
      expect(toolRegistryById[mapsTo], `orphan mapsTo for alias ${id}`).toBeTruthy();
      expect(NLU_TO_REGISTRY_ID[id] ?? NLU_TO_REGISTRY_ID[id.replace(/-/g, ' ')]).toBe(mapsTo);
    }
  });

  it.each(PR3_TOOL_IDS)('NLU sidebarToolId matches registry id for %s', (id) => {
    expect(clinicalIntentToolsById[id].sidebarToolId).toBe(id);
  });
});

describe('PR3 comprehensive — client scoring utils smoke', () => {
  it('GRACE ACS computes low-risk category for favorable profile', () => {
    const result = computeGraceAcsRisk(GRACE_ACS_LOW_RISK_INPUT);
    expect(result.sixMonthRiskCategory).toBe('low');
    expect(result.sixMonthMortalityPct).toBeLessThan(3);
  });

  it('NIHSS sums zero for normal exam fixture', () => {
    const exam = Object.fromEntries(
      [
        'loc',
        'locQuestions',
        'locCommands',
        'bestGaze',
        'visualFields',
        'facialPalsy',
        'motorArmLeft',
        'motorArmRight',
        'motorLegLeft',
        'motorLegRight',
        'limbAtaxia',
        'sensory',
        'bestLanguage',
        'dysarthria',
        'extinctionInattention',
      ].map((k) => [k, 0])
    );
    const { total } = computeNihssTotal(exam);
    expect(total).toBe(0);
  });

  it('Canadian C-Spine does not indicate imaging when low-risk and ROM 45° met', () => {
    const out = applyCanadianCSpineRule({
      highRisk: evaluateCcrHighRisk(CANADIAN_C_SPINE_NO_HIGH_RISK),
      lowRisk: evaluateCcrLowRisk(CANADIAN_C_SPINE_ALL_LOW_RISK),
      activeRotationLeft45: true,
      activeRotationRight45: true,
    });
    expect(out.imagingIndicatedByRule).toBe(false);
    expect(out.branch).toBe('rom-pass');
  });

  it('Ottawa Ankle indicates radiograph when malleolar tenderness present', () => {
    const out = evaluateOttawaAnkleRule(OTTAWA_ANKLE_IMAGING_INDICATED);
    expect(out.ankleRadiographIndicated).toBe(true);
  });
});

describe('PR3 comprehensive — per-tool conversational launch', () => {
  it('GRACE ACS launch returns ACS safety-focused chat seed', () => {
    const launch = resolveCatalogLaunch('grace-acs');
    expect(launch.path).toBe(graceAcsChatConfig.hubPath);
    expect(launch.chatSeed).toBe(graceAcsChatConfig.chatSeed);
    expect(launch.chatSeed).toMatch(/does not confirm or exclude ACS/i);
    expect(launch.chatSeed).toMatch(/STEP 0/i);
  });

  it.each(GRACE_ACS_LAUNCH_ALIASES)('GRACE alias "%s" resolves to same hub launch', (alias) => {
    const canonical = resolveCatalogLaunch('grace-acs');
    const fromAlias = resolveCatalogLaunch(alias);
    expect(fromAlias.path).toBe(canonical.path);
    expect(fromAlias.registryId).toBe('grace-acs');
    expect(fromAlias.chatSeed).toBe(canonical.chatSeed);
  });

  it('NIHSS launch returns stroke safety-focused chat seed', () => {
    const launch = resolveCatalogLaunch('nihss');
    expect(launch.chatSeed).toBe(nihssChatConfig.chatSeed);
    expect(launch.chatSeed).toMatch(/does not replace urgent stroke evaluation/i);
    expect(launch.chatSeed).toMatch(/STEP 0/i);
  });

  it.each(NIHSS_LAUNCH_ALIASES)('NIHSS alias "%s" resolves to same hub launch', (alias) => {
    const canonical = resolveCatalogLaunch('nihss');
    const fromAlias = resolveCatalogLaunch(alias);
    expect(fromAlias.registryId).toBe('nihss');
    expect(fromAlias.chatSeed).toBe(canonical.chatSeed);
  });

  it('Canadian C-Spine launch avoids clearance language in seed', () => {
    const launch = resolveCatalogLaunch('canadian-c-spine');
    expect(launch.chatSeed).toBe(canadianCSpineChatConfig.chatSeed);
    expect(launch.chatSeed).toMatch(/does not "clear" the cervical spine/i);
  });

  it.each(CANADIAN_C_SPINE_LAUNCH_ALIASES)(
    'Canadian C-Spine alias "%s" resolves to same hub launch',
    (alias) => {
      const canonical = resolveCatalogLaunch('canadian-c-spine');
      const fromAlias = resolveCatalogLaunch(alias);
      expect(fromAlias.registryId).toBe('canadian-c-spine');
      expect(fromAlias.chatSeed).toBe(canonical.chatSeed);
    }
  );

  it('Ottawa Ankle launch includes hard-stop safety language', () => {
    const launch = resolveCatalogLaunch('ottawa-ankle');
    expect(launch.chatSeed).toBe(ottawaAnkleChatConfig.chatSeed);
    expect(launch.chatSeed).toMatch(/neurovascular compromise/i);
  });

  it.each(OTTAWA_ANKLE_LAUNCH_ALIASES)('Ottawa alias "%s" resolves to same hub launch', (alias) => {
    const canonical = resolveCatalogLaunch('ottawa-ankle');
    const fromAlias = resolveCatalogLaunch(alias);
    expect(fromAlias.registryId).toBe('ottawa-ankle');
    expect(fromAlias.chatSeed).toBe(canonical.chatSeed);
  });

  it.each(PR3_TOOL_IDS)('launch alias bundle covers %s', (id) => {
    const aliases = PR3_LAUNCH_ALIASES_BY_REGISTRY_ID[id];
    expect(aliases.length).toBeGreaterThanOrEqual(4);
    for (const alias of aliases) {
      expect(resolveCatalogLaunch(alias).registryId).toBe(id);
    }
  });
});
