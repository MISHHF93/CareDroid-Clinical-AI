/**
 * Smoke test: exercise the Capability Registry end to end.
 *
 * A plain script (asserts via console output, not describe/it blocks) —
 * named .check.ts rather than .test.ts on purpose so vitest's default glob
 * doesn't pick it up and fail the suite with "No test suite found in file".
 *
 * Run: npx tsx lib/ai/capabilityRegistry.smoke.check.ts
 */

import {
  registerCapability,
  queryCapabilities,
  getCapability,
  getCapabilities,
  resetRegistry,
  type RegistryQuery,
  AUTONOMY_LEVELS,
  AGENT_STATES,
  RISK_CLASSES,
  WRITE_CATEGORIES,
  MODALITIES,
  CAPABILITY_TYPES,
  FAILURE_MODES,
} from './capabilityRegistry';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`FAIL: ${message}`);
  }
}

function assertEq<T>(actual: T, expected: T, message: string): void {
  if (actual === expected) {
    passed++;
  } else {
    failed++;
    console.error(`FAIL: ${message} — expected ${expected}, got ${actual}`);
  }
}

console.log('=== Capability Registry Smoke Test ===\n');

// ---------------------------------------------------------------------------
// Part 1: Synchronous tests on a clean registry (no existing registrations)
// ---------------------------------------------------------------------------

resetRegistry();
assertEq(getCapabilities().length, 0, 'registry is empty after reset');

// Register a single test capability
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

const caps = getCapabilities();
assertEq(caps.length, 1, 'one capability registered');
assertEq(caps[0].id, 'test:echo', 'capability has correct id');
assertEq(caps[0].name, 'Test Echo', 'capability has correct name');

// getCapability by id
const found = getCapability('test:echo');
assert(found !== undefined, 'getCapability returns the capability');
assertEq(found?.id, 'test:echo', 'getCapability returns correct id');

const missing = getCapability('nonexistent');
assertEq(missing, undefined, 'getCapability returns undefined for missing id');

// Query: filter by capability type
const services = queryCapabilities({ capabilityType: 'service' });
assertEq(services.length, 1, 'query by capabilityType returns 1 service');
assertEq(services[0].capability.id, 'test:echo', 'query returns correct capability');

// Query: filter by risk class
const safe = queryCapabilities({ maxRiskClass: 'low' });
assertEq(safe.length, 1, 'query by maxRiskClass:low includes none-risk capability');

// Query: filter by modality
const retrieval = queryCapabilities({ modality: 'retrieval' });
assertEq(retrieval.length, 1, 'query by modality returns matching capability');

// Query: filter by approved
const approved = queryCapabilities({ approved: true });
assertEq(approved.length, 1, 'query approved:true returns approved capability');

// Query: filter by task keywords
const echo = queryCapabilities({ taskKeywords: ['echo'] });
assertEq(echo.length, 1, 'query by task keyword matches');
assertEq(echo[0].fit, 'strong', 'exact keyword match is strong fit');

const partial = queryCapabilities({ taskKeywords: ['test', 'nonexistent'] });
assertEq(partial.length, 1, 'partial keyword match still returns capability');
assertEq(partial[0].fit, 'moderate', 'partial keyword match is moderate fit');

const none = queryCapabilities({ taskKeywords: ['completely-unrelated'] });
assertEq(none.length, 0, 'no keyword match returns empty');

// Query: filter by autonomy level
const observe = queryCapabilities({ availableAtAutonomyLevel: 'OBSERVE' });
assertEq(observe.length, 1, 'OBSERVE level can reach OBSERVE-min capability');

const execute = queryCapabilities({ availableAtAutonomyLevel: 'EXECUTE' });
assertEq(execute.length, 0, 'EXECUTE level cannot reach ANALYZE-max capability that lacks EXECUTE maxAutonomy');

// Query: filter by patient binding
const patientRequired = queryCapabilities({ patientBinding: 'required' });
assertEq(patientRequired.length, 0, 'no patient-required capabilities in test set');

// Query: filter by write category
const noWrite = queryCapabilities({ writeCategory: 'none' });
assertEq(noWrite.length, 1, 'query writeCategory:none returns read-only capability');

// Query: filter by context match
const ctxMatch = queryCapabilities({
  contextMatch: { patientBound: false, encounterBound: false, tenantBound: true },
});
assertEq(ctxMatch.length, 1, 'context match with tenant bound returns capability');

const ctxPatient = queryCapabilities({
  contextMatch: { patientBound: true, encounterBound: false, tenantBound: true },
});
assertEq(ctxPatient.length, 1, 'context match with patient bound still surfaces non-patient-required capability (it can operate with patient context available)');

// Vocabulary checks (these don't depend on existing registrations)
assertEq(AUTONOMY_LEVELS.length, 5, '5 autonomy levels');
assertEq(AUTONOMY_LEVELS[0], 'OBSERVE', 'first level is OBSERVE');
assertEq(AUTONOMY_LEVELS[4], 'EXECUTE', 'last level is EXECUTE');

assertEq(AGENT_STATES.length, 10, '10 truthful agent states');
assert(AGENT_STATES.includes('LIVE'), 'LIVE state exists');
assert(AGENT_STATES.includes('STALE'), 'STALE state exists');
assert(AGENT_STATES.includes('INSUFFICIENT_DATA'), 'INSUFFICIENT_DATA state exists');
assert(AGENT_STATES.includes('CONFLICTING_EVIDENCE'), 'CONFLICTING_EVIDENCE state exists');
assert(AGENT_STATES.includes('REQUIRES_HUMAN_REVIEW'), 'REQUIRES_HUMAN_REVIEW state exists');

assertEq(RISK_CLASSES.length, 7, '7 risk classes');
assert(RISK_CLASSES.includes('none'), 'none risk exists');
assert(RISK_CLASSES.includes('critical'), 'critical risk exists');

assertEq(WRITE_CATEGORIES.length, 8, '8 write categories');
assert(WRITE_CATEGORIES.includes('none'), 'none write exists');
assert(WRITE_CATEGORIES.includes('device_command'), 'device_command write exists');
assert(WRITE_CATEGORIES.includes('authoritative'), 'authoritative write exists');

assert(MODALITIES.includes('retrieval'), 'retrieval modality exists');
assert(MODALITIES.includes('llm_generation'), 'llm_generation modality exists');
assert(MODALITIES.includes('calculator'), 'calculator modality exists');
assert(MODALITIES.includes('deterministic_rule'), 'deterministic_rule modality exists');
assert(MODALITIES.includes('rag_assisted'), 'rag_assisted modality exists');
assert(MODALITIES.includes('device_iot'), 'device_iot modality exists');
assert(MODALITIES.includes('FHIR_interop'), 'FHIR_interop modality exists');

assert(CAPABILITY_TYPES.includes('model'), 'model type exists');
assert(CAPABILITY_TYPES.includes('agent'), 'agent type exists');
assert(CAPABILITY_TYPES.includes('calculator'), 'calculator type exists');
assert(CAPABILITY_TYPES.includes('service'), 'service type exists');
assert(CAPABILITY_TYPES.includes('api'), 'api type exists');
assert(CAPABILITY_TYPES.includes('data_source'), 'data_source type exists');
assert(CAPABILITY_TYPES.includes('device_iot'), 'device_iot type exists');
assert(CAPABILITY_TYPES.includes('human_review'), 'human_review type exists');
assert(CAPABILITY_TYPES.includes('audit'), 'audit type exists');

assert(FAILURE_MODES.includes('circuit_breaks'), 'circuit_breaks failure mode exists');
assert(FAILURE_MODES.includes('explicit_error'), 'explicit_error failure mode exists');
assert(FAILURE_MODES.includes('graceful_degradation'), 'graceful_degradation failure mode exists');

console.log('Part 1 (synchronous): done. Loading existing registrations...\n');

// ---------------------------------------------------------------------------
// Part 2: Load existing registrations and run remaining tests
// ---------------------------------------------------------------------------

import('./capabilityRegistrations').then(() => {
  const all = getCapabilities();
  console.log(`Registered capabilities after loading existing: ${all.length}`);

  // 13. At least 20 capabilities
  assert(all.length > 20, `at least 20 capabilities registered (got ${all.length})`);

  // 14. Verify key capabilities exist
  const news2 = getCapability('calculator:news2');
  assert(news2 !== undefined, 'NEWS2 calculator is registered');
  if (news2) {
    assertEq(news2.capabilityType, 'calculator', 'NEWS2 is a calculator');
    assertEq(news2.modalities[0], 'calculator', 'NEWS2 modality is calculator');
    assertEq(news2.riskClass, 'moderate', 'NEWS2 risk class is moderate');
    assertEq(news2.writeCategory, 'none', 'NEWS2 is read-only');
    assertEq(news2.responseSourceCategory, 'TOOL_RESULT', 'NEWS2 is a tool result, not LLM');
    assertEq(news2.evidence.fabricatesWhenInsufficient, false, 'NEWS2 does not fabricate');
    assertEq(news2.requiresHumanApproval, false, 'NEWS2 does not require human approval');
  }

  const chief = getCapability('agent:chief-investigation');
  assert(chief !== undefined, 'Chief Investigation Runner is registered');
  if (chief) {
    assertEq(chief.capabilityType, 'agent', 'Chief is an agent');
    assertEq(chief.maxAutonomyLevel, 'PREPARE', 'Chief max autonomy is PREPARE');
    assertEq(chief.writeCategory, 'task', 'Chief writes tasks (proposals), not clinical mutations');
    assert((chief.requiresHumanApproval as boolean) === true, 'Chief requires human approval');
    assertEq(chief.patientBinding, 'required', 'Chief requires patient binding');
    assertEq(chief.evidence.fabricatesWhenInsufficient, false, 'Chief does not fabricate');
  }

  const copilot = getCapability('agent:copilot-chat-pipeline');
  assert(copilot !== undefined, 'Copilot Chat Pipeline is registered');
  if (copilot) {
    assertEq(copilot.riskClass, 'elevated', 'Copilot is elevated risk');
    assertEq(copilot.patientBinding, 'required', 'Copilot requires patient binding');
    assertEq(copilot.evidence.fabricatesWhenInsufficient, false, 'Copilot does not fabricate');
  }

  const rag = getCapability('service:rag-pipeline');
  assert(rag !== undefined, 'RAG pipeline is registered');
  if (rag) {
    assertEq(rag.responseSourceCategory, 'RAG_ASSISTED', 'RAG is RAG-assisted');
    assertEq(rag.tenantScope, 'tenant_only', 'RAG is tenant-scoped');
  }

  const heuristic = getCapability('model:careDroidAI-heuristic-node');
  assert(heuristic !== undefined, 'Heuristic node is registered');
  if (heuristic) {
    assertEq(heuristic.responseSourceCategory, 'DETERMINISTIC_RULE', 'Heuristic node is deterministic rule, NOT LLM');
    assertEq(heuristic.modalities[0], 'deterministic_rule', 'Heuristic node modality is deterministic_rule');
  }

  const anthropic = getCapability('model:anthropic');
  assert(anthropic !== undefined, 'Anthropic adapter is registered');
  if (anthropic) {
    assertEq(anthropic.responseSourceCategory, 'LLM_GENERATED', 'Anthropic is LLM generated');
    assertEq(anthropic.failureMode, 'circuit_breaks', 'Anthropic has circuit breaking');
  }

  // 15. No capability uses forbidden failure mode
  let forbidden = 0;
  for (const cap of all) {
    if (cap.failureMode === 'silent_failure') forbidden++;
  }
  assertEq(forbidden, 0, 'no capability uses forbidden silent_failure mode');

  // 16. No capability fabricates when insufficient
  forbidden = 0;
  for (const cap of all) {
    if (cap.evidence.fabricatesWhenInsufficient === true) forbidden++;
  }
  assertEq(forbidden, 0, 'no capability fabricates when insufficient');

  // 17. Query by clinical task keywords
  const deterioration = queryCapabilities({ taskKeywords: ['deterioration', 'investigation'] });
  assert(deterioration.length > 0, 'deterioration investigation capabilities found');
  if (deterioration.length > 0) {
    const ids = deterioration.map((m) => m.capability.id);
    assert(ids.includes('agent:chief-investigation'), 'Chief Investigation is among deterioration capabilities');
  }

  const calculator = queryCapabilities({ taskKeywords: ['news2'] });
  assert(calculator.length > 0, 'NEWS2 calculator found by keyword');
  if (calculator.length > 0) {
    assert(calculator[0].capability.id === 'calculator:news2', 'keyword search returns NEWS2');
  }

  const triage = queryCapabilities({ taskKeywords: ['triage'] });
  assert(triage.length > 0, 'triage-related capabilities found');

  // 25. Contextual query filtering by risk
  const lowRiskOnly = queryCapabilities({ maxRiskClass: 'low' });
  for (const match of lowRiskOnly) {
    assert(
      RISK_CLASSES.indexOf(match.capability.riskClass) <= RISK_CLASSES.indexOf('low'),
      `low-risk query excludes ${match.capability.id} (risk: ${match.capability.riskClass})`,
    );
  }

  const moderateRisk = queryCapabilities({ maxRiskClass: 'moderate' });
  assert(moderateRisk.length > lowRiskOnly.length, 'moderate-risk query returns more than low-risk query');

  // 26. Capability registry fabric
  const registryFabric = getCapability('fabric:capability-registry');
  assert(registryFabric !== undefined, 'capability registry fabric is registered');

  // 27. Tool registry fabric
  const toolFabric = getCapability('fabric:tool-registry');
  assert(toolFabric !== undefined, 'tool registry fabric is registered');

  // 28. Context engine
  const contextEngine = getCapability('service:context-engine');
  assert(contextEngine !== undefined, 'context engine is registered');
  if (contextEngine) {
    assertEq(contextEngine.patientBinding, 'required', 'context engine requires patient binding');
  }

  // Summary
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) {
    process.exit(1);
  }
});
