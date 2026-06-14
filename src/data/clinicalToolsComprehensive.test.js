/**
 * Comprehensive deterministic coverage: PHQ-9, GAD-7, COPD GOLD, Rome IV IBS.
 * Scoring, Q9 safety, Tier-B launch, registry, catalog, discovery, routes, NLU.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import {
  categorizePhq9Severity,
  computePhq9Result,
  interpretPhq9Score,
  isPhq9Question9Elevated,
  sumPhq9Score,
  computePhq9Breakdown,
} from '../utils/phq9Calculator';
import {
  categorizeGad7Severity,
  computeGad7Result,
  interpretGad7Score,
  sumGad7Score,
  computeGad7Breakdown,
} from '../utils/gad7Calculator';
import toolRegistry, { toolRegistryById } from './toolRegistry';
import {
  clinicalIntentToolsById,
  nluCalculatorHubOnly,
  ORCHESTRATOR_TO_REGISTRY_ID,
} from './clinicalIntentToolCatalog';
import {
  resolveCatalogLaunch,
  resolveRegistryId,
  resolveNavigationPathForLaunch,
  NLU_TO_REGISTRY_ID,
  BUILTIN_CALC_ID_TO_REGISTRY_ID,
} from './clinicalCatalogWiring';
import { builtinUiCalculators } from './clinicalIntentToolCatalog';
import { getMedicalToolsCatalogRows } from './medicalToolsCatalogIndex';
import { getAllDiscoveredTools, toolIdAliases } from './sourceCodeToolDiscovery';
import { matchCalculatorRoute } from '../routes/clinicalToolRoutes';
import { CHAT_ASSISTED_HUB_GROUPS } from './chatAssistedHubGroups';
import { copdGoldChatConfig } from './chatAssistedCalculators/copdGold';
import { romeIvIbsChatConfig } from './chatAssistedCalculators/romeIvIbs';
import { PR5_REQUIRED_NLU_ALIAS_PAIRS, PR5_ALL_ALIAS_PAIRS } from './pr5TestConstants';
import { PR6_ALL_ALIAS_PAIRS, PR6_REQUIRED_NLU_ALIAS_PAIRS } from './pr6TestConstants';
import { PR7_ALL_ALIAS_PAIRS, PR7_REQUIRED_NLU_ALIAS_PAIRS } from './pr7TestConstants';
import {
  WIRING_AUDIT_ALL_IDS,
  WIRING_AUDIT_TOOL_SPECS,
  WIRING_AUDIT_HUB_PATH,
  WIRING_AUDIT_TIER_A_IDS,
  WIRING_AUDIT_TIER_B_IDS,
  WIRING_AUDIT_DISCOVERY_ALIAS_PAIRS,
  catalogRowsMatchingQuery,
} from './wiringAuditTestConstants';
import { parseClinicalToolPatterns } from './parseToolPatterns';
import {
  PHQ9_SEVERITY_BOUNDARIES,
  GAD7_SEVERITY_BOUNDARIES,
  buildPhq9Responses,
  buildGad7Responses,
  extractToolPatternKeywords,
  messageMatchesToolKeywords,
  messageTriggersBackendDisambiguation,
} from './testHelpers/clinicalToolsTestFixtures';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(__dirname, '../App.jsx'), 'utf8');
const patternsSource = readFileSync(
  join(
    __dirname,
    '../../backend/src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns.ts'
  ),
  'utf8'
);
const calculatorsSource = readFileSync(join(__dirname, '../pages/tools/Calculators.jsx'), 'utf8');
const _hubRouteIdx = appSource.indexOf("path: '/tools/calculators', element:");

const BACKEND_KEYWORDS_BY_TOOL = Object.freeze({
  phq9: extractToolPatternKeywords(patternsSource, 'phq9'),
  gad7: extractToolPatternKeywords(patternsSource, 'gad7'),
  'copd-gold': extractToolPatternKeywords(patternsSource, 'copd-gold'),
  'rome-iv-ibs': extractToolPatternKeywords(patternsSource, 'rome-iv-ibs'),
});

describe('1. PHQ-9 scoring', () => {
  it.each(PHQ9_SEVERITY_BOUNDARIES)(
    'categorizePhq9Severity($score) → $category',
    ({ score, category }) => {
      expect(categorizePhq9Severity(score)).toBe(category);
    }
  );

  it('computePhq9Result returns exact total and breakdown for a fixed pattern', () => {
    const responses = buildPhq9Responses({
      q1: 1,
      q2: 2,
      q3: 0,
      q4: 1,
      q5: 0,
      q6: 2,
      q7: 1,
      q8: 0,
      q9: 0,
    });
    const out = computePhq9Result(responses);
    expect(out.ok).toBe(true);
    expect(out.totalScore).toBe(7);
    expect(out.severityCategory).toBe('mild');
    expect(sumPhq9Score(out.breakdown)).toBe(7);
  });

  it('sums all-zero and all-three extremes', () => {
    const zeros = buildPhq9Responses({});
    const threes = buildPhq9Responses(
      Object.fromEntries(['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9'].map((k) => [k, 3]))
    );
    expect(sumPhq9Score(computePhq9Breakdown(zeros))).toBe(0);
    expect(sumPhq9Score(computePhq9Breakdown(threes))).toBe(27);
  });

  it('reports one validation error per unanswered item', () => {
    const partial = { q1: 0, q2: 1 };
    const out = computePhq9Result(partial);
    expect(out.ok).toBe(false);
    expect(out.errors).toHaveLength(7);
  });

  it('maps moderately severe band to warning UI severity when q9 is zero', () => {
    const interp = interpretPhq9Score(17, 0);
    expect(interp.severityCategory).toBe('moderately_severe');
    expect(interp.severity).toBe('warning');
    expect(interp.severityLabel).toMatch(/Moderately severe/i);
  });
});

describe('2. GAD-7 scoring', () => {
  it.each(GAD7_SEVERITY_BOUNDARIES)(
    'categorizeGad7Severity($score) → $category',
    ({ score, category }) => {
      expect(categorizeGad7Severity(score)).toBe(category);
    }
  );

  it('computeGad7Result returns exact total for a fixed pattern', () => {
    const responses = buildGad7Responses({
      q1: 2,
      q2: 1,
      q3: 0,
      q4: 2,
      q5: 1,
      q6: 0,
      q7: 1,
    });
    const out = computeGad7Result(responses);
    expect(out.ok).toBe(true);
    expect(out.totalScore).toBe(7);
    expect(out.severityCategory).toBe('mild');
    expect(sumGad7Score(out.breakdown)).toBe(7);
  });

  it('sums all-zero and all-three extremes', () => {
    const zeros = buildGad7Responses({});
    const threes = buildGad7Responses(
      Object.fromEntries(['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7'].map((k) => [k, 3]))
    );
    expect(sumGad7Score(computeGad7Breakdown(zeros))).toBe(0);
    expect(sumGad7Score(computeGad7Breakdown(threes))).toBe(21);
  });

  it('reports one validation error per unanswered item', () => {
    const partial = { q1: 0, q2: 1, q3: 2 };
    const out = computeGad7Result(partial);
    expect(out.ok).toBe(false);
    expect(out.errors).toHaveLength(4);
  });

  it('warrants moderate symptom escalation for scores 10–14 only', () => {
    const moderate = interpretGad7Score(12);
    const mild = interpretGad7Score(9);
    const severe = interpretGad7Score(15);
    expect(moderate.moderateSymptomEscalation.warranted).toBe(true);
    expect(moderate.acuteDistressSafetyAlert.elevated).toBe(false);
    expect(mild.moderateSymptomEscalation.warranted).toBe(false);
    expect(severe.moderateSymptomEscalation.warranted).toBe(false);
    expect(severe.acuteDistressSafetyAlert.elevated).toBe(true);
  });

  it('computeGad7Result returns moderate escalation fields for total 12', () => {
    const out = computeGad7Result(buildGad7Responses({ q1: 2, q2: 2, q3: 2, q4: 2, q5: 2, q6: 1, q7: 1 }));
    expect(out.ok).toBe(true);
    expect(out.totalScore).toBe(12);
    expect(out.severityCategory).toBe('moderate');
    expect(out.moderateSymptomEscalation.warranted).toBe(true);
  });
});

describe('3. PHQ-9 Question 9 handling', () => {
  it.each([
    { q9: 0, elevated: false },
    { q9: 1, elevated: true },
    { q9: 2, elevated: true },
    { q9: 3, elevated: true },
  ])('isPhq9Question9Elevated(q9=$q9) → $elevated', ({ q9, elevated }) => {
    expect(isPhq9Question9Elevated(q9)).toBe(elevated);
  });

  it('elevates critical severity and safety alert when q9 is non-zero', () => {
    const out = computePhq9Result(buildPhq9Responses({ q9: 2 }));
    expect(out.ok).toBe(true);
    expect(out.question9Elevated).toBe(true);
    expect(out.severity).toBe('critical');
    expect(out.question9SafetyAlert.elevated).toBe(true);
    expect(out.label).toMatch(/Question 9 elevated/i);
  });

  it('prioritizes Q9 over severity band when total is low', () => {
    const interp = interpretPhq9Score(3, 1);
    expect(interp.severity).toBe('critical');
    expect(interp.severityCategory).toBe('none_minimal');
    expect(interp.interpretation).toMatch(/prioritize safety assessment/i);
  });

  it('warns on high symptom burden when q9 is zero', () => {
    const interp = interpretPhq9Score(18, 0);
    expect(interp.question9Elevated).toBe(false);
    expect(interp.highSymptomEscalation.warranted).toBe(true);
    expect(interp.highSymptomEscalation.message).toMatch(/does not rule out suicide risk/i);
  });

  it('does not warrant high-symptom escalation for moderate totals with q9 zero', () => {
    const interp = interpretPhq9Score(12, 0);
    expect(interp.highSymptomEscalation.warranted).toBe(false);
  });
});

describe('4. COPD GOLD launch behavior', () => {
  const canonical = 'copd-gold';

  it('resolveCatalogLaunch from canonical id targets calculators hub with COPD seed', () => {
    const launch = resolveCatalogLaunch(canonical);
    expect(launch.registryId).toBe(canonical);
    expect(launch.path).toBe(WIRING_AUDIT_HUB_PATH);
    expect(launch.path).toBe(copdGoldChatConfig.hubPath);
    expect(launch.chatSeed).toBe(copdGoldChatConfig.chatSeed);
    expect(launch.chatSeed).toBe(clinicalIntentToolsById[canonical].chatSeed);
    expect(launch.openLabel).toBe('Start guided chat');
    expect(launch.orchestratorTool).toBeNull();
  });

  it.each(PR6_ALL_ALIAS_PAIRS)('alias "%s" resolves same launch as copd-gold', (alias, expected) => {
    expect(expected).toBe(canonical);
    const fromAlias = resolveCatalogLaunch(alias);
    const fromCanonical = resolveCatalogLaunch(canonical);
    expect(fromAlias.registryId).toBe(canonical);
    expect(fromAlias.path).toBe(WIRING_AUDIT_HUB_PATH);
    expect(fromAlias.path).toBe(fromCanonical.path);
    expect(fromAlias.chatSeed).toBe(fromCanonical.chatSeed);
  });

  it('is hub-only with pulmonary-copd group and no dedicated calculator switch', () => {
    expect(nluCalculatorHubOnly.some((h) => h.toolId === canonical)).toBe(true);
    const group = CHAT_ASSISTED_HUB_GROUPS.find((g) => g.toolIds.includes(canonical));
    expect(group?.groupId).toBe('pulmonary-copd');
    expect(calculatorsSource).not.toContain(`case '${canonical}':`);
    expect(appSource).not.toContain(`path: '/tools/calculators/${canonical}'`);
  });

  it('resolveNavigationPathForLaunch routes to chat for chat visibility', () => {
    const launch = resolveCatalogLaunch(canonical);
    expect(resolveNavigationPathForLaunch(launch)).toBe('/assistant');
    expect(launch.chatSeed).toMatch(WIRING_AUDIT_TOOL_SPECS[canonical].chatSeedPattern);
  });
});

describe('5. Rome IV IBS launch behavior', () => {
  const canonical = 'rome-iv-ibs';

  it('resolveCatalogLaunch from canonical id targets calculators hub with Rome seed', () => {
    const launch = resolveCatalogLaunch(canonical);
    expect(launch.registryId).toBe(canonical);
    expect(launch.path).toBe(WIRING_AUDIT_HUB_PATH);
    expect(launch.path).toBe(romeIvIbsChatConfig.hubPath);
    expect(launch.chatSeed).toBe(romeIvIbsChatConfig.chatSeed);
    expect(launch.chatSeed).toBe(clinicalIntentToolsById[canonical].chatSeed);
    expect(launch.openLabel).toBe('Start guided chat');
    expect(launch.orchestratorTool).toBeNull();
  });

  it.each(PR7_ALL_ALIAS_PAIRS)('alias "%s" resolves same launch as rome-iv-ibs', (alias, expected) => {
    expect(expected).toBe(canonical);
    const fromAlias = resolveCatalogLaunch(alias);
    const fromCanonical = resolveCatalogLaunch(canonical);
    expect(fromAlias.registryId).toBe(canonical);
    expect(fromAlias.path).toBe(fromCanonical.path);
    expect(fromAlias.chatSeed).toBe(fromCanonical.chatSeed);
  });

  it('is hub-only with gastrointestinal group and no dedicated calculator switch', () => {
    expect(nluCalculatorHubOnly.some((h) => h.toolId === canonical)).toBe(true);
    const group = CHAT_ASSISTED_HUB_GROUPS.find((g) => g.toolIds.includes(canonical));
    expect(group?.groupId).toBe('gastrointestinal');
    expect(calculatorsSource).not.toContain(`case '${canonical}':`);
    expect(appSource).not.toContain(`path: '/tools/calculators/${canonical}'`);
  });

  it('resolveNavigationPathForLaunch routes to chat for chat visibility', () => {
    const launch = resolveCatalogLaunch(canonical);
    expect(resolveNavigationPathForLaunch(launch)).toBe('/assistant');
    expect(launch.chatSeed).toMatch(WIRING_AUDIT_TOOL_SPECS[canonical].chatSeedPattern);
  });
});

describe('6. Registry mappings', () => {
  it.each(WIRING_AUDIT_ALL_IDS)('%s exists in toolRegistryById with calculators panel', (id) => {
    const spec = WIRING_AUDIT_TOOL_SPECS[id];
    const reg = toolRegistryById[id];
    expect(reg?.id).toBe(id);
    expect(reg?.path).toBe(spec.routePath);
    expect(reg?.panelTool).toBe('calculators');
    if (spec.tier === 'A') {
      expect(reg?.initialCalc).toBe(id);
    } else {
      expect(reg?.initialCalc).toBeUndefined();
    }
  });

  it.each(WIRING_AUDIT_TIER_A_IDS)('%s maps builtin slug and orchestrator id', (id) => {
    expect(BUILTIN_CALC_ID_TO_REGISTRY_ID[id]).toBe(id);
    expect(ORCHESTRATOR_TO_REGISTRY_ID[id]).toBe(id);
  });

  it('lists each audited tool exactly once in toolRegistry array', () => {
    const audited = toolRegistry.filter((t) => WIRING_AUDIT_ALL_IDS.includes(t.id));
    expect(audited).toHaveLength(WIRING_AUDIT_ALL_IDS.length);
  });

  it.each(WIRING_AUDIT_TIER_A_IDS)('%s is registered in builtinUiCalculators with matching path', (id) => {
    const spec = WIRING_AUDIT_TOOL_SPECS[id];
    const builtin = builtinUiCalculators.find((c) => c.id === id);
    expect(builtin?.id).toBe(id);
    expect(builtin?.path).toBe(spec.routePath);
    expect(BUILTIN_CALC_ID_TO_REGISTRY_ID[builtin.id]).toBe(id);
  });

  it.each(WIRING_AUDIT_TIER_B_IDS)('%s is absent from builtinUiCalculators (chat-only)', (id) => {
    expect(builtinUiCalculators.some((c) => c.id === id)).toBe(false);
  });
});

describe('7. Catalog inclusion', () => {
  it.each(WIRING_AUDIT_ALL_IDS)('%s has one medical catalog row with expected flags', (id) => {
    const spec = WIRING_AUDIT_TOOL_SPECS[id];
    const rows = getMedicalToolsCatalogRows();
    const matches = rows.filter((r) => r.primaryId === id);
    expect(matches).toHaveLength(1);
    const row = matches[0];
    expect(row.pagePath).toBe(spec.routePath);
    expect(row.sidebarToolId).toBe(id);
    expect(row.chatOnlyForm).toBe(spec.chatOnlyForm);
    expect(row.uiCalculatorSlug).toBe(spec.uiCalculatorSlug);
    expect(row.chatSeed.length).toBeGreaterThan(40);
    expect(row.backendExecutor).toBe(false);
  });

  it.each(WIRING_AUDIT_ALL_IDS)('catalog search queries find %s', (id) => {
    const spec = WIRING_AUDIT_TOOL_SPECS[id];
    const rows = getMedicalToolsCatalogRows();
    for (const [canonical, query] of spec.catalogSearchQueries) {
      const hits = catalogRowsMatchingQuery(rows, query);
      expect(hits.some((r) => r.primaryId === canonical), `query "${query}"`).toBe(true);
    }
  });

  it.each(WIRING_AUDIT_ALL_IDS)('clinicalIntentToolsById[%s] matches registry path and seed', (id) => {
    const spec = WIRING_AUDIT_TOOL_SPECS[id];
    const intent = clinicalIntentToolsById[id];
    expect(intent?.toolId).toBe(id);
    expect(intent?.path).toBe(spec.routePath);
    expect(intent?.sidebarToolId).toBe(id);
    expect(intent?.backendExecutable).toBe(false);
    if (spec.tier === 'B') {
      expect(intent?.chatSeed).toMatch(spec.chatSeedPattern);
    }
  });
});

describe('8. Discovery inclusion', () => {
  it.each(WIRING_AUDIT_ALL_IDS)('%s appears exactly once in getAllDiscoveredTools', (id) => {
    const merged = getAllDiscoveredTools();
    const hits = merged.filter((r) => r.id === id);
    expect(hits).toHaveLength(1);
    const blob = [hits[0].source, ...(hits[0].sources || []), hits[0].notes].filter(Boolean).join(' ');
    expect(blob).toMatch(/toolRegistry|clinicalIntentToolCatalog|tool\.patterns|NLU/i);
  });

  it('maps hyphenated discovery aliases to canonical registry ids', () => {
    for (const id of WIRING_AUDIT_ALL_IDS) {
      const aliases = toolIdAliases.filter((a) => a.mapsTo === id).map((a) => a.id);
      expect(aliases.length).toBeGreaterThan(0);
      for (const aliasId of aliases) {
        expect(resolveRegistryId(aliasId)).toBe(id);
      }
    }
  });

  it.each(WIRING_AUDIT_DISCOVERY_ALIAS_PAIRS)(
    'discovery slug "%s" resolves to %s',
    (alias, canonical) => {
      expect(resolveRegistryId(alias)).toBe(canonical);
      expect(resolveCatalogLaunch(alias).registryId).toBe(canonical);
    }
  );
});

describe('9. Route resolution', () => {
  it.each(WIRING_AUDIT_TIER_A_IDS)('%s has dedicated calculator route before hub', (id) => {
    const spec = WIRING_AUDIT_TOOL_SPECS[id];
    expect(matchCalculatorRoute(spec.routePath)?.calculatorSlug).toBe(id);
    expect(appSource).not.toContain('CALCULATOR_ROUTE_DEFS.map');
    expect(appSource).not.toContain('<LegacyCalculatorRouteRedirect />');
    expect(appSource).toContain('<Route path="/tools/*" element={<ToolsRedirect />} />');
    expect(calculatorsSource).toContain(`case '${id}':`);
  });

  it.each(WIRING_AUDIT_TIER_A_IDS)('resolveCatalogLaunch(%s) opens dedicated calculator path', (id) => {
    const spec = WIRING_AUDIT_TOOL_SPECS[id];
    const launch = resolveCatalogLaunch(id);
    expect(launch.path).toBe(spec.routePath);
    expect(launch.registryId).toBe(id);
    expect(launch.openLabel).toBe('Open');
    expect(resolveNavigationPathForLaunch(launch)).toBe(spec.routePath);
  });

  it.each(WIRING_AUDIT_TIER_B_IDS)('%s resolves hub path only', (id) => {
    const launch = resolveCatalogLaunch(id);
    expect(launch.path).toBe(WIRING_AUDIT_HUB_PATH);
    expect(launch.registryId).toBe(id);
  });

  it('returns empty launch for unknown tool ids', () => {
    const empty = resolveCatalogLaunch('not-a-clinical-tool-xyz-123');
    expect(empty.path).toBe('/assistant');
    expect(empty.registryId).toBeNull();
    expect(empty.chatSeed).toBeTruthy();
  });
});

describe('10. NLU matching', () => {
  const allAliasPairs = [
    ...PR5_ALL_ALIAS_PAIRS,
    ...PR6_ALL_ALIAS_PAIRS,
    ...PR7_ALL_ALIAS_PAIRS,
  ];

  it.each(allAliasPairs)('NLU_TO_REGISTRY_ID["%s"] → %s', (alias, canonical) => {
    expect(NLU_TO_REGISTRY_ID[alias]).toBe(canonical);
    expect(resolveRegistryId(alias)).toBe(canonical);
  });

  it.each(PR5_REQUIRED_NLU_ALIAS_PAIRS)(
    'phrase "%s" matches phq9 or gad7 backend keywords',
    (phrase, canonical) => {
      const keywords = BACKEND_KEYWORDS_BY_TOOL[canonical];
      expect(messageMatchesToolKeywords(phrase, keywords)).toBe(true);
    }
  );

  it.each(PR6_REQUIRED_NLU_ALIAS_PAIRS)(
    'phrase "%s" matches copd-gold backend keywords',
    (phrase) => {
      expect(messageMatchesToolKeywords(phrase, BACKEND_KEYWORDS_BY_TOOL['copd-gold'])).toBe(true);
    }
  );

  it.each(PR7_REQUIRED_NLU_ALIAS_PAIRS)(
    'phrase "%s" matches rome-iv-ibs backend keywords',
    (phrase) => {
      expect(messageMatchesToolKeywords(phrase, BACKEND_KEYWORDS_BY_TOOL['rome-iv-ibs'])).toBe(true);
    }
  );

  it.each(WIRING_AUDIT_ALL_IDS)('%s has tool.patterns.ts entry and disambiguation helper', (id) => {
    const spec = WIRING_AUDIT_TOOL_SPECS[id];
    expect(patternsSource).toContain(`toolId: '${id}'`);
    expect(patternsSource).toContain(spec.backendHelper);
    expect(BACKEND_KEYWORDS_BY_TOOL[id].length).toBeGreaterThan(3);
  });

  it.each([
    ['phq9', 'run phq-9 depression screen'],
    ['gad7', 'gad 7 anxiety screen'],
    ['copd-gold', 'copd gold classification'],
    ['rome-iv-ibs', 'rome iv ibs criteria'],
  ])('disambiguation triggers for %s on representative message', (toolId, message) => {
    expect(messageTriggersBackendDisambiguation(message, toolId)).toBe(true);
  });

  it.each(WIRING_AUDIT_ALL_IDS)('parsed backend keywords align with tool.patterns for %s', (id) => {
    const parsed = parseClinicalToolPatterns(patternsSource).find((p) => p.toolId === id);
    expect(parsed?.keywords).toEqual(BACKEND_KEYWORDS_BY_TOOL[id]);
  });

  it.each([
    ['phq9', 'copd gold classification', 'copd-gold'],
    ['gad7', 'rome iv ibs criteria', 'rome-iv-ibs'],
    ['copd-gold', 'depression screen phq9', 'phq9'],
    ['rome-iv-ibs', 'gad 7 anxiety screen', 'gad7'],
  ])(
    'phrase for %s does not match %s backend keywords alone',
    (intendedTool, phrase, otherTool) => {
      expect(messageTriggersBackendDisambiguation(phrase, intendedTool)).toBe(false);
      expect(messageMatchesToolKeywords(phrase, BACKEND_KEYWORDS_BY_TOOL[otherTool])).toBe(true);
    }
  );
});
