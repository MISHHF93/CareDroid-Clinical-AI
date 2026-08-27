/**
 * Capability Registry smoke test.
 *
 * Converted from `capabilityRegistry.smoke.check.ts` (2026-08-26) -- that file
 * was a plain script, deliberately named `.check.ts` rather than `.test.ts` so
 * vitest's default glob would not pick it up, and it only ever ran via a
 * manual `npx tsx lib/ai/capabilityRegistry.smoke.check.ts`. It never ran in
 * CI or the normal `npm test` suite, so its assertions -- including "zero
 * capabilities use failureMode: 'silent_failure'" and "zero capabilities have
 * evidence.fabricatesWhenInsufficient === true" -- were unenforced. Rewritten
 * here as real describe/it/expect blocks so vitest picks it up and CI
 * actually enforces these invariants. Assertions are preserved as-is; nothing
 * about what is checked has changed, only how it is expressed and that it now
 * runs automatically.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import {
  registerCapability,
  queryCapabilities,
  getCapability,
  getCapabilities,
  resetRegistry,
  AUTONOMY_LEVELS,
  AGENT_STATES,
  RISK_CLASSES,
  WRITE_CATEGORIES,
  MODALITIES,
  CAPABILITY_TYPES,
  FAILURE_MODES,
} from './capabilityRegistry';

describe('Capability Registry smoke test — clean registry', () => {
  beforeAll(() => {
    resetRegistry();
    expect(getCapabilities().length).toBe(0);

    registerCapability({
      id: 'test:echo',
      capabilityType: 'service',
      name: 'Test Echo',
      purpose: 'A test capability for smoke testing the registry.',
      version: '1.0',
      intendedUse: 'Smoke testing.',
      notIntendedFor: [],
      limitations: [],
      modalities: ['retrieval'],
      riskClass: 'none',
      writeCategory: 'none',
      maxAutonomyLevel: 'ANALYZE',
      minAutonomyLevel: 'OBSERVE',
      requiredContext: { patientRequired: false, encounterRequired: false, tenantRequired: true, userRequired: true, crossPatient: false },
      inputSchema: {},
      outputSchema: {},
      dataSources: ['test'],
      evidence: {
        expectedSources: [],
        requiresEvidence: false,
        supportsProvenance: true,
        reportsMissingData: false,
        reportsUncertainty: false,
        fabricatesWhenInsufficient: false,
      },
      responseSourceCategory: 'DETERMINISTIC_RULE',
      requiresHumanApproval: false,
      permittedRoles: [],
      tenantScope: 'platform',
      patientBinding: 'none',
      authorizationRequirements: [],
      failureMode: 'explicit_error',
      failureBehavior: 'Returns echo.',
      approved: true,
      lastVerified: '2026-08-23',
      accountable: 'test',
      implementationRef: 'test',
      usageNotes: [],
    });
  });

  it('registers a single capability with correct id and name', () => {
    const caps = getCapabilities();
    expect(caps.length).toBe(1);
    expect(caps[0].id).toBe('test:echo');
    expect(caps[0].name).toBe('Test Echo');
  });

  it('getCapability returns the capability by id, and undefined for a missing id', () => {
    const found = getCapability('test:echo');
    expect(found).not.toBeUndefined();
    expect(found?.id).toBe('test:echo');
    expect(getCapability('nonexistent')).toBeUndefined();
  });

  it('query by capabilityType returns the matching service', () => {
    const services = queryCapabilities({ capabilityType: 'service' });
    expect(services.length).toBe(1);
    expect(services[0].capability.id).toBe('test:echo');
  });

  it('query by maxRiskClass:low includes the none-risk capability', () => {
    const safe = queryCapabilities({ maxRiskClass: 'low' });
    expect(safe.length).toBe(1);
  });

  it('query by modality returns the matching capability', () => {
    const retrieval = queryCapabilities({ modality: 'retrieval' });
    expect(retrieval.length).toBe(1);
  });

  it('query approved:true returns the approved capability', () => {
    const approved = queryCapabilities({ approved: true });
    expect(approved.length).toBe(1);
  });

  it('query by task keywords matches, with exact match scored strong and partial match scored moderate', () => {
    const echo = queryCapabilities({ taskKeywords: ['echo'] });
    expect(echo.length).toBe(1);
    expect(echo[0].fit).toBe('strong');

    const partial = queryCapabilities({ taskKeywords: ['test', 'nonexistent'] });
    expect(partial.length).toBe(1);
    expect(partial[0].fit).toBe('moderate');

    const none = queryCapabilities({ taskKeywords: ['completely-unrelated'] });
    expect(none.length).toBe(0);
  });

  it('query by autonomy level only returns capabilities reachable at that level', () => {
    const observe = queryCapabilities({ availableAtAutonomyLevel: 'OBSERVE' });
    expect(observe.length).toBe(1);

    const execute = queryCapabilities({ availableAtAutonomyLevel: 'EXECUTE' });
    expect(execute.length).toBe(0);
  });

  it('query by patient binding filters correctly', () => {
    const patientRequired = queryCapabilities({ patientBinding: 'required' });
    expect(patientRequired.length).toBe(0);
  });

  it('query by write category returns the read-only capability', () => {
    const noWrite = queryCapabilities({ writeCategory: 'none' });
    expect(noWrite.length).toBe(1);
  });

  it('query by context match respects tenant-bound and patient-bound context', () => {
    const ctxMatch = queryCapabilities({
      contextMatch: { patientBound: false, encounterBound: false, tenantBound: true },
    });
    expect(ctxMatch.length).toBe(1);

    const ctxPatient = queryCapabilities({
      contextMatch: { patientBound: true, encounterBound: false, tenantBound: true },
    });
    expect(ctxPatient.length).toBe(1);
  });

  it('declares the expected vocabulary sizes and members (independent of registrations)', () => {
    expect(AUTONOMY_LEVELS.length).toBe(5);
    expect(AUTONOMY_LEVELS[0]).toBe('OBSERVE');
    expect(AUTONOMY_LEVELS[4]).toBe('EXECUTE');

    expect(AGENT_STATES.length).toBe(10);
    expect(AGENT_STATES).toContain('LIVE');
    expect(AGENT_STATES).toContain('STALE');
    expect(AGENT_STATES).toContain('INSUFFICIENT_DATA');
    expect(AGENT_STATES).toContain('CONFLICTING_EVIDENCE');
    expect(AGENT_STATES).toContain('REQUIRES_HUMAN_REVIEW');

    expect(RISK_CLASSES.length).toBe(7);
    expect(RISK_CLASSES).toContain('none');
    expect(RISK_CLASSES).toContain('critical');

    expect(WRITE_CATEGORIES.length).toBe(8);
    expect(WRITE_CATEGORIES).toContain('none');
    expect(WRITE_CATEGORIES).toContain('device_command');
    expect(WRITE_CATEGORIES).toContain('authoritative');

    expect(MODALITIES).toContain('retrieval');
    expect(MODALITIES).toContain('llm_generation');
    expect(MODALITIES).toContain('calculator');
    expect(MODALITIES).toContain('deterministic_rule');
    expect(MODALITIES).toContain('rag_assisted');
    expect(MODALITIES).toContain('device_iot');
    expect(MODALITIES).toContain('FHIR_interop');

    expect(CAPABILITY_TYPES).toContain('model');
    expect(CAPABILITY_TYPES).toContain('agent');
    expect(CAPABILITY_TYPES).toContain('calculator');
    expect(CAPABILITY_TYPES).toContain('service');
    expect(CAPABILITY_TYPES).toContain('api');
    expect(CAPABILITY_TYPES).toContain('data_source');
    expect(CAPABILITY_TYPES).toContain('device_iot');
    expect(CAPABILITY_TYPES).toContain('human_review');
    expect(CAPABILITY_TYPES).toContain('audit');

    expect(FAILURE_MODES).toContain('circuit_breaks');
    expect(FAILURE_MODES).toContain('explicit_error');
    expect(FAILURE_MODES).toContain('graceful_degradation');
  });
});

describe('Capability Registry smoke test — real registrations', () => {
  let all: ReturnType<typeof getCapabilities>;

  beforeAll(async () => {
    // Loading capabilityRegistrations re-registers every real capability into
    // whatever the module-level registry currently holds. registerCapability
    // is idempotent per id (see capabilityRegistry.ts), so this is safe to run
    // after the clean-registry block above without resetting first -- exactly
    // as the original smoke-check script did.
    await import('./capabilityRegistrations');
    all = getCapabilities();
  });

  it('registers at least 20 capabilities', () => {
    expect(all.length).toBeGreaterThan(20);
  });

  it('registers the NEWS2 calculator as a read-only, non-approval-gated deterministic tool result', () => {
    const news2 = getCapability('calculator:news2');
    expect(news2).not.toBeUndefined();
    expect(news2?.capabilityType).toBe('calculator');
    expect(news2?.modalities[0]).toBe('calculator');
    expect(news2?.riskClass).toBe('moderate');
    expect(news2?.writeCategory).toBe('none');
    expect(news2?.responseSourceCategory).toBe('TOOL_RESULT');
    expect(news2?.evidence.fabricatesWhenInsufficient).toBe(false);
    expect(news2?.requiresHumanApproval).toBe(false);
  });

  it('registers the Chief Investigation Runner as a patient-bound agent that requires human approval', () => {
    const chief = getCapability('agent:chief-investigation');
    expect(chief).not.toBeUndefined();
    expect(chief?.capabilityType).toBe('agent');
    expect(chief?.maxAutonomyLevel).toBe('PREPARE');
    expect(chief?.writeCategory).toBe('task');
    expect(chief?.requiresHumanApproval).toBe(true);
    expect(chief?.patientBinding).toBe('required');
    expect(chief?.evidence.fabricatesWhenInsufficient).toBe(false);
  });

  it('registers the Copilot Chat Pipeline as elevated risk, patient-bound, non-fabricating', () => {
    const copilot = getCapability('agent:copilot-chat-pipeline');
    expect(copilot).not.toBeUndefined();
    expect(copilot?.riskClass).toBe('elevated');
    expect(copilot?.patientBinding).toBe('required');
    expect(copilot?.evidence.fabricatesWhenInsufficient).toBe(false);
  });

  it('registers the RAG pipeline as RAG-assisted and tenant-scoped', () => {
    const rag = getCapability('service:rag-pipeline');
    expect(rag).not.toBeUndefined();
    expect(rag?.responseSourceCategory).toBe('RAG_ASSISTED');
    expect(rag?.tenantScope).toBe('tenant_only');
  });

  it('registers the heuristic node as DETERMINISTIC_RULE, never as an LLM', () => {
    const heuristic = getCapability('model:careDroidAI-heuristic-node');
    expect(heuristic).not.toBeUndefined();
    expect(heuristic?.responseSourceCategory).toBe('DETERMINISTIC_RULE');
    expect(heuristic?.modalities[0]).toBe('deterministic_rule');
  });

  it('registers the Anthropic adapter as LLM-generated with circuit breaking', () => {
    const anthropic = getCapability('model:anthropic');
    expect(anthropic).not.toBeUndefined();
    expect(anthropic?.responseSourceCategory).toBe('LLM_GENERATED');
    expect(anthropic?.failureMode).toBe('circuit_breaks');
  });

  it('no capability uses the forbidden silent_failure mode', () => {
    const forbidden = all.filter((cap) => cap.failureMode === 'silent_failure');
    expect(forbidden).toEqual([]);
  });

  it('no capability declares that it fabricates when evidence is insufficient', () => {
    const forbidden = all.filter((cap) => cap.evidence.fabricatesWhenInsufficient === true);
    expect(forbidden).toEqual([]);
  });

  it('every capability whose writeCategory is patient_state or higher requires human approval', () => {
    // Encodes safetyPolicy.ts's DISALLOWED_AUTONOMOUS_AI_ACTIONS (no
    // auto-triage, no auto-prescribe, no auto-disposition, no auto-merge) as
    // an automatically-enforced registry-level invariant: nothing may write
    // patient-journey/operational state, clinical data, device commands, or
    // fully authoritative mutations without requiring a human to approve the
    // output first. writeCategory is ordered (see WRITE_CATEGORIES in
    // capabilityRegistry.ts):
    //   none < draft < task < communication < patient_state <
    //   clinical_mutation < device_command < authoritative
    const highWriteRank = WRITE_CATEGORIES.indexOf('patient_state');
    const violations = all.filter((cap) => {
      const rank = WRITE_CATEGORIES.indexOf(cap.writeCategory);
      return rank >= highWriteRank && cap.requiresHumanApproval !== true;
    });
    expect(
      violations.map((cap) => ({ id: cap.id, writeCategory: cap.writeCategory, requiresHumanApproval: cap.requiresHumanApproval })),
    ).toEqual([]);
  });

  it('deterioration investigation capabilities are discoverable by keyword, including Chief Investigation', () => {
    const deterioration = queryCapabilities({ taskKeywords: ['deterioration', 'investigation'] });
    expect(deterioration.length).toBeGreaterThan(0);
    const ids = deterioration.map((m) => m.capability.id);
    expect(ids).toContain('agent:chief-investigation');
  });

  it('the NEWS2 calculator is discoverable by keyword', () => {
    const calculator = queryCapabilities({ taskKeywords: ['news2'] });
    expect(calculator.length).toBeGreaterThan(0);
    expect(calculator[0].capability.id).toBe('calculator:news2');
  });

  it('triage-related capabilities are discoverable by keyword', () => {
    const triage = queryCapabilities({ taskKeywords: ['triage'] });
    expect(triage.length).toBeGreaterThan(0);
  });

  it('low-risk queries never surface a capability above low risk', () => {
    const lowRiskOnly = queryCapabilities({ maxRiskClass: 'low' });
    for (const match of lowRiskOnly) {
      expect(RISK_CLASSES.indexOf(match.capability.riskClass)).toBeLessThanOrEqual(RISK_CLASSES.indexOf('low'));
    }
  });

  it('a moderate-risk query returns at least as many results as a low-risk query', () => {
    const lowRiskOnly = queryCapabilities({ maxRiskClass: 'low' });
    const moderateRisk = queryCapabilities({ maxRiskClass: 'moderate' });
    expect(moderateRisk.length).toBeGreaterThan(lowRiskOnly.length);
  });

  it('the capability registry fabric and tool registry fabric are self-registered', () => {
    expect(getCapability('fabric:capability-registry')).not.toBeUndefined();
    expect(getCapability('fabric:tool-registry')).not.toBeUndefined();
  });

  it('the context engine is registered and requires patient binding', () => {
    const contextEngine = getCapability('service:context-engine');
    expect(contextEngine).not.toBeUndefined();
    expect(contextEngine?.patientBinding).toBe('required');
  });
});
