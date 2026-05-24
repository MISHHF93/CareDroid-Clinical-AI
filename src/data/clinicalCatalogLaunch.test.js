/**
 * Launch path coverage: resolveCatalogLaunch for Tier A/B/C calculators and chat-assisted tools.
 */

import { describe, it, expect } from 'vitest';
import toolRegistry, { toolRegistryById } from './toolRegistry';
import { clinicalIntentTools, clinicalIntentToolsById, builtinUiCalculators } from './clinicalIntentToolCatalog';
import {
  resolveCatalogLaunch,
  resolveCatalogLaunchFallback,
  resolveNavigationPathForLaunch,
  resolveRegistryId,
  resolveOrchestratorToolForLaunch,
  findClinicalIntentProfile,
  CATALOG_EMPTY_LAUNCH,
  CATALOG_UNKNOWN_TOOL_LAUNCH,
  NLU_HUB_ONLY_TOOL_IDS,
} from './clinicalCatalogWiring';
import {
  CLINICAL_TIER_A_CALCULATOR_REGISTRY_IDS,
  TIER_B_CHAT_CALCULATOR_REGISTRY_IDS,
  ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS,
  REGISTRY_ID_TO_ORCHESTRATOR_TOOL,
  NLU_PROFILE_TOOL_IDS,
  KEYWORD_ROUTED_REGISTRY_IDS,
  REGISTRY,
  NLU,
  PR_FLEET_TIER_A_REGISTRY_IDS,
  PR_FLEET_TIER_B_CHAT_REGISTRY_IDS,
  PR2_TIER_B_CHAT_CALCULATOR_IDS,
  PR3_CALCULATOR_REGISTRY_IDS,
  PR6_CALCULATOR_REGISTRY_IDS,
  PR7_CALCULATOR_REGISTRY_IDS,
  CARDIOLOGY_TIER_B_CHAT_REGISTRY_IDS,
} from './clinicalToolIdContract';
import { runClinicalSafetyComplianceAudit } from './clinicalSafetyGuardrails';
import { PR5_ALL_ALIAS_PAIRS } from './pr5TestConstants';

const HUB = '/tools/calculators';

const TIER_B_ALL = [
  ...TIER_B_CHAT_CALCULATOR_REGISTRY_IDS,
  ...PR_FLEET_TIER_B_CHAT_REGISTRY_IDS,
];

const TIER_B_HUB_TOOLS = TIER_B_ALL.filter(
  (registryId) => !CARDIOLOGY_TIER_B_CHAT_REGISTRY_IDS.includes(registryId)
);

/** Substrings chat seeds for clinical tools should include (safety / scope). */
const CLINICAL_CHAT_SEED_GUARDRAILS = [
  /decision support|screening only|does not diagnose|do not diagnose|informational only|clinical decision support|does not recommend|not a substitute|not a diagnosis|must not be used|do not recommend/i,
];

const PE_CHAT_SEED_FORBIDDEN = [
  /PE is (confirmed|ruled out|excluded)/i,
  /rule(s)? out PE with certainty/i,
];

describe('resolveCatalogLaunch — empty / unknown', () => {
  it('returns empty launch for falsy ids', () => {
    expect(resolveCatalogLaunch('')).toEqual(CATALOG_EMPTY_LAUNCH);
    expect(resolveCatalogLaunch(null)).toEqual(CATALOG_EMPTY_LAUNCH);
    expect(resolveCatalogLaunch('   ')).toEqual(CATALOG_EMPTY_LAUNCH);
  });

  it('returns guarded chat fallback for unknown tool-shaped ids', () => {
    const launch = resolveCatalogLaunch('not-a-shipped-tool-xyz-999');
    expect(launch.path).toBe('/assistant');
    expect(launch.registryId).toBeNull();
    expect(launch.chatSeed).toMatch(/decision support|does not establish a diagnosis/i);
    expect(launch.orchestratorTool).toBeNull();
    expect(resolveNavigationPathForLaunch(launch)).toBe('/assistant');
  });

  it('resolveCatalogLaunchFallback matches unknown launch shape', () => {
    const launch = resolveCatalogLaunchFallback('unknown-nlu-profile');
    expect(launch.path).toBe(CATALOG_UNKNOWN_TOOL_LAUNCH.path);
    expect(launch.chatSeed?.length).toBeGreaterThan(40);
  });

  it('rejects invalid id strings without navigation', () => {
    expect(resolveCatalogLaunchFallback('bad id with spaces!')).toEqual(CATALOG_EMPTY_LAUNCH);
  });
});

describe('resolveCatalogLaunch — every NLU profile', () => {
  it.each(NLU_PROFILE_TOOL_IDS)('NLU toolId %s resolves path or chat', (toolId) => {
    const launch = resolveCatalogLaunch(toolId);
    expect(launch).not.toEqual(CATALOG_EMPTY_LAUNCH);
    expect(launch.path || launch.chatSeed).toBeTruthy();
    if (launch.chatSeed) {
      expect(launch.chatSeed.length).toBeGreaterThan(20);
    }
  });

  it.each(KEYWORD_ROUTED_REGISTRY_IDS)('keyword-routed registry %s launches', (registryId) => {
    const launch = resolveCatalogLaunch(registryId);
    expect(launch.registryId).toBe(registryId);
    expect(launch.path).toBe(toolRegistryById[registryId]?.path);
    expect(launch.chatSeed).toMatch(/decision support/i);
  });

  it('launches calc-gfr via registry alias gfr', () => {
    const launch = resolveCatalogLaunch('gfr');
    expect(launch.registryId).toBe(REGISTRY.calcGfr);
    expect(launch.path).toBe('/tools/calculators/gfr');
    expect(launch.orchestratorTool).toBeNull();
  });
});

describe('resolveCatalogLaunch — Tier A dedicated calculator routes', () => {
  it.each(CLINICAL_TIER_A_CALCULATOR_REGISTRY_IDS)(
    '%s deep-links to dedicated calculator page',
    (registryId) => {
      const launch = resolveCatalogLaunch(registryId);
      const reg = toolRegistryById[registryId];
      expect(launch.registryId).toBe(registryId);
      expect(launch.path).toBe(reg?.path);
      expect(launch.path).toMatch(/^\/tools\/calculator(s)?\//);
      expect(launch.path).not.toBe(HUB);
      expect(launch.chatSeed?.length).toBeGreaterThan(20);
      const expectedOrchestrator = REGISTRY_ID_TO_ORCHESTRATOR_TOOL[registryId];
      if (expectedOrchestrator) {
        expect(launch.orchestratorTool).toBe(expectedOrchestrator);
      } else {
        expect(launch.orchestratorTool).toBeNull();
      }
    }
  );

  it.each(['sofa', 'gfr', 'bmi', 'chads2vasc'])('builtin slug %s resolves to registry path', (slug) => {
    const launch = resolveCatalogLaunch(slug);
    expect(launch.path).toBeTruthy();
    expect(launch.registryId).toBeTruthy();
  });
});

describe('resolveNavigationPathForLaunch — chat visibility', () => {
  it.each(PR3_CALCULATOR_REGISTRY_IDS)(
    'PR3 %s navigates to chat after hub chat launch',
    (registryId) => {
      const launch = resolveCatalogLaunch(registryId);
      expect(launch.path).toBe(HUB);
      expect(resolveNavigationPathForLaunch(launch)).toBe('/assistant');
    }
  );

  it.each(PR2_TIER_B_CHAT_CALCULATOR_IDS)(
    'PR2 Tier-B %s navigates to chat for guided chat',
    (registryId) => {
      const launch = resolveCatalogLaunch(registryId);
      expect(resolveNavigationPathForLaunch(launch)).toBe('/assistant');
    }
  );

  it.each(CLINICAL_TIER_A_CALCULATOR_REGISTRY_IDS)(
    'Tier-A %s keeps dedicated calculator navigation path',
    (registryId) => {
      const launch = resolveCatalogLaunch(registryId);
      expect(resolveNavigationPathForLaunch(launch)).toBe(launch.path);
      expect(resolveNavigationPathForLaunch(launch)).not.toBe('/dashboard');
    }
  );
});

describe('resolveCatalogLaunch — Tier B chat-assisted (calculators hub)', () => {
  it.each(TIER_B_HUB_TOOLS)('%s launches via calculators hub with guided chat seed', (registryId) => {
    const launch = resolveCatalogLaunch(registryId);
    const nlu = clinicalIntentTools.find(
      (t) => t.toolId === registryId || t.sidebarToolId === registryId
    );
    expect(launch.path).toBe(HUB);
    expect(launch.registryId).toBe(registryId);
    expect(launch.chatSeed).toBe(nlu?.chatSeed);
    expect(launch.chatSeed?.length).toBeGreaterThan(40);
    expect(launch.openLabel).toMatch(/guided chat|Try in chat/i);
    expect(launch.orchestratorTool).toBeNull();
  });

  it.each(CARDIOLOGY_TIER_B_CHAT_REGISTRY_IDS)(
    '%s uses a cardiology route with guided chat seed',
    (registryId) => {
      const launch = resolveCatalogLaunch(registryId);
      const nlu = clinicalIntentTools.find(
        (t) => t.toolId === registryId || t.sidebarToolId === registryId
      );
      expect(launch.path).toMatch(/^\/tools\/cardiology\//);
      expect(launch.registryId).toBe(registryId);
      expect(launch.chatSeed).toBe(nlu?.chatSeed);
      expect(launch.openLabel).toMatch(/guided chat/i);
      expect(launch.orchestratorTool).toBeNull();
    }
  );

  it.each(PR2_TIER_B_CHAT_CALCULATOR_IDS)('alias launch for %s matches hub path', (registryId) => {
    const aliasLaunch = resolveCatalogLaunch('pe-score');
    if (registryId === 'wells-pe') {
      expect(aliasLaunch.registryId).toBe('wells-pe');
      expect(aliasLaunch.path).toBe(HUB);
    }
    const percAlias = resolveCatalogLaunch('pe-rule-out');
    if (registryId === 'perc') {
      expect(percAlias.registryId).toBe('perc');
      expect(percAlias.path).toBe(HUB);
    }
  });
});

describe('resolveCatalogLaunch — NLU hub-only scores', () => {
  it.each(NLU_HUB_ONLY_TOOL_IDS)('%s uses hub path and NLU chatSeed', (toolId) => {
    const launch = resolveCatalogLaunch(toolId);
    const nlu = clinicalIntentToolsById[toolId];
    expect(launch.path).toBe(HUB);
    expect(launch.chatSeed).toBe(nlu?.chatSeed);
    expect(launch.orchestratorTool).toBeNull();
  });

  it('resolves apache2 alias via the dedicated calculator route', () => {
    const launch = resolveCatalogLaunch('apache2-calculator');
    expect(launch.path).toBe('/tools/calculators/apache-ii');
    expect(launch.chatSeed).toMatch(/APACHE/i);
    expect(launch.registryId).toBe(REGISTRY.apache2Calculator);
  });
});

describe('resolveCatalogLaunch — invalid orchestrator requests', () => {
  it('never assigns orchestratorTool for invalid POST ids', () => {
    expect(resolveCatalogLaunch('qsofa').orchestratorTool).toBeNull();
    expect(resolveCatalogLaunch('wells-pe').orchestratorTool).toBeNull();
    expect(resolveOrchestratorToolForLaunch('qsofa', 'qsofa', true)).toBeNull();
  });
});

describe('resolveCatalogLaunch — Tier C orchestrator (registered executors only)', () => {
  it('maps only registered NLU ids through REGISTRY_ID_TO_ORCHESTRATOR_TOOL', () => {
    expect(Object.values(REGISTRY_ID_TO_ORCHESTRATOR_TOOL).sort()).toEqual(
      [...ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS].sort()
    );
  });

  it.each([
    [REGISTRY.drugCheck, NLU.drugInteractions],
    [REGISTRY.labInterp, NLU.labInterpreter],
    [REGISTRY.sofaScore, NLU.sofaCalculator],
  ])('registry %s → orchestrator %s', (registryId, nluId) => {
    const launch = resolveCatalogLaunch(registryId);
    expect(launch.orchestratorTool).toBe(nluId);
    expect(resolveOrchestratorToolForLaunch(nluId, registryId, true)).toBe(nluId);
  });

  it('does not assign orchestrator tool for dispatch-ai (NLU intent only)', () => {
    const launch = resolveCatalogLaunch('dispatch-ai');
    expect(launch.path).toBe(HUB);
    expect(launch.chatSeed?.length).toBeGreaterThan(30);
    expect(launch.orchestratorTool).toBeNull();
    expect(resolveOrchestratorToolForLaunch(NLU.dispatchAi, REGISTRY.dispatchAi, true)).toBeNull();
  });

  it('does not assign orchestrator for Tier B clinical calculators', () => {
    for (const id of [...PR3_CALCULATOR_REGISTRY_IDS, ...PR6_CALCULATOR_REGISTRY_IDS, ...PR7_CALCULATOR_REGISTRY_IDS]) {
      expect(resolveCatalogLaunch(id).orchestratorTool).toBeNull();
    }
  });
});

describe('resolveCatalogLaunch — fleet Tier A pages', () => {
  it.each(PR_FLEET_TIER_A_REGISTRY_IDS)('%s opens dedicated fleet route', (registryId) => {
    const launch = resolveCatalogLaunch(registryId);
    expect(launch.path).toBe(toolRegistryById[registryId]?.path);
    expect(launch.path).toMatch(/^\/fleet\//);
    expect(launch.orchestratorTool).toBeNull();
  });
});

describe('resolveCatalogLaunch — fleet Tier B dispatch hub', () => {
  it('dispatch-ai launches calculators hub and navigates to chat', () => {
    const launch = resolveCatalogLaunch('dispatch-ai');
    expect(launch.path).toBe('/tools/calculators');
    expect(launch.openLabel).toBe('Start guided chat');
    expect(resolveNavigationPathForLaunch(launch)).toBe('/assistant');
    expect(launch.orchestratorTool).toBeNull();
  });

  it.each([
    'dispatch',
    'dispatch assistant',
    'vehicle dispatch',
    'fleet dispatch',
  ])('alias "%s" resolves same dispatch-ai launch', (alias) => {
    const fromAlias = resolveCatalogLaunch(alias);
    const fromCanonical = resolveCatalogLaunch('dispatch-ai');
    expect(fromAlias.registryId).toBe('dispatch-ai');
    expect(fromAlias.chatSeed).toBe(fromCanonical.chatSeed);
    expect(resolveNavigationPathForLaunch(fromAlias)).toBe('/assistant');
  });
});

describe('resolveCatalogLaunch — NLU alias resolution', () => {
  it.each(PR5_ALL_ALIAS_PAIRS)('alias "%s" → %s', (alias, canonical) => {
    const launch = resolveCatalogLaunch(alias);
    expect(launch.registryId).toBe(canonical);
    expect(launch.path).toBe(`/tools/calculators/${canonical}`);
    expect(launch.chatSeed).toBe(clinicalIntentToolsById[canonical]?.chatSeed);
  });

  it('findClinicalIntentProfile resolves sofa-calculator NLU id to sofa-score sidebar', () => {
    const profile = findClinicalIntentProfile({
      toolId: 'sofa-calculator',
      registryId: resolveRegistryId('sofa-calculator'),
    });
    expect(profile?.toolId).toBe('sofa-calculator');
    expect(profile?.sidebarToolId).toBe('sofa-score');
  });
});

describe('resolveCatalogLaunch — clinical safety compliance', () => {
  it('passes chat seed audit for all clinicalIntentTools with chatSeed', () => {
    const audit = runClinicalSafetyComplianceAudit(clinicalIntentTools);
    if (audit.summary.failing > 0) {
      console.log('chat seed audit failures:', audit.risks);
    }
    expect(audit.summary.failing).toBe(0);
    expect(audit.summary.criticalIssues).toBe(0);
  });

  it('applies guardrails to synthesized registry-only launches', () => {
    const launch = resolveCatalogLaunch(REGISTRY.calcGfr);
    expect(launch.chatSeed).toMatch(/decision support/i);
  });
});

describe('resolveCatalogLaunch — clinically safe chat seeds', () => {
  it.each(TIER_B_ALL)('%s chat seed includes decision-support guardrails', (registryId) => {
    const launch = resolveCatalogLaunch(registryId);
    const seed = launch.chatSeed || '';
    expect(CLINICAL_CHAT_SEED_GUARDRAILS.some((re) => re.test(seed))).toBe(true);
  });

  it.each(['wells-pe', 'perc'])('%s PE chat seed forbids false rule-out language', (registryId) => {
    const seed = resolveCatalogLaunch(registryId).chatSeed || '';
    expect(PE_CHAT_SEED_FORBIDDEN.some((re) => re.test(seed))).toBe(false);
    expect(seed).toMatch(/does not rule|do not state|never say|not definitively rule out/i);
  });

  it('PHQ-9 seed references screening-only and crisis pathways', () => {
    const seed = resolveCatalogLaunch('phq9').chatSeed || '';
    expect(seed).toMatch(/screening only/i);
    expect(seed).toMatch(/988|suicidal|question 9/i);
  });

  it('GAD-7 seed references screening-only without diagnosing', () => {
    const seed = resolveCatalogLaunch('gad7').chatSeed || '';
    expect(seed).toMatch(/screening only/i);
    expect(seed).toMatch(/do not diagnose/i);
    expect(seed).toMatch(/STEP 0/i);
    expect(seed).toMatch(/988|suicidal/i);
  });

  it('dispatch-ai seed requires human approval', () => {
    const seed = resolveCatalogLaunch('dispatch-ai').chatSeed || '';
    expect(seed).toMatch(/human approval|do not auto-dispatch/i);
  });
});

describe('resolveCatalogLaunch — builtinUiCalculators alignment', () => {
  it('every builtin calculator slug resolves with path and registry', () => {
    for (const calc of builtinUiCalculators) {
      const launch = resolveCatalogLaunch(calc.id);
      expect(launch.path).toBeTruthy();
      expect(launch.registryId).toBeTruthy();
    }
  });
});

describe('resolveCatalogLaunch — secondary NLU sidebar tools', () => {
  const secondaryIds = [
    'dose-calculator',
    'abg-interpreter',
    'acls-protocol',
    'atls-protocol',
    'antibiotic-guide',
    'procedures',
    'apache2-calculator',
    'curb65-calculator',
    'gcs-calculator',
    'wells-dvt-calculator',
  ];

  it.each(secondaryIds)('%s resolves non-null path and registry', (id) => {
    const launch = resolveCatalogLaunch(id);
    expect(launch.path).toBeTruthy();
    expect(launch.registryId).toBeTruthy();
    expect(resolveNavigationPathForLaunch(launch)).toBeTruthy();
  });

  it('procedures NLU profile resolves to procedure guide path', () => {
    const launch = resolveCatalogLaunch('procedures');
    expect(launch.path).toBe('/tools/procedures');
    expect(launch.registryId).toBe('procedures');
    expect(launch.chatSeed).toMatch(/step-by-step/i);
  });
});
