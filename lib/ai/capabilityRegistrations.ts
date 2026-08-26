/**
 * Existing capability registrations.
 *
 * Every model, agent, calculator, service, API, data source and device that
 * exists in the current CareDroid codebase declares itself here. This is the
 * living inventory the Chief queries before delegating work.
 *
 * Registrations are grouped by capability family. Each group documents the
 * actual implementation path the registration points to, so the registry is
 * verifiable against source rather than being decorative.
 *
 * === Principle ===
 * A deterministic calculator never registers as a model. A keyword matcher
 * never registers as an AI agent. A fixture never registers as a live service.
 * The registry enforces honest classification; the capability's modality,
 * responseSourceCategory, and limitations fields make the classification
 * checkable by tests.
 */

import {
  registerCapability,
  type CapabilityRecord,
  type CapabilityType,
  type Modality,
  type RiskClass,
  type WriteCategory,
  type AutonomyLevel,
  type AIResponseSourceCategory,
} from './capabilityRegistry';

// ---------------------------------------------------------------------------
// Sharing the honest source-category vocabulary from provenanceContract.
// These are re-exported through capabilityRegistry's import of
// AIResponseSourceCategory; here we use the literal arrays for clarity.
// ---------------------------------------------------------------------------

const SOURCE = {
  LLM_GENERATED: 'LLM_GENERATED' as AIResponseSourceCategory,
  MODEL_PREDICTION: 'MODEL_PREDICTION' as AIResponseSourceCategory,
  RAG_ASSISTED: 'RAG_ASSISTED' as AIResponseSourceCategory,
  TOOL_RESULT: 'TOOL_RESULT' as AIResponseSourceCategory,
  DETERMINISTIC_RULE: 'DETERMINISTIC_RULE' as AIResponseSourceCategory,
  STATIC_CONTENT: 'STATIC_CONTENT' as AIResponseSourceCategory,
  FIXTURE_DEMO: 'FIXTURE_DEMO' as AIResponseSourceCategory,
  UNAVAILABLE: 'UNAVAILABLE' as AIResponseSourceCategory,
};

// ---------------------------------------------------------------------------
// Calculator capabilities (39 deterministic tools, tool-orchestrator-backed)
//
// Source:
//   backend/src/modules/medical-control-plane/tool-orchestrator/
//     services/*.service.ts    — executor implementations
//     tool-orchestrator.registry.ts — REGISTERED_EXECUTOR_TOOL_IDS (44 entries)
//
// These are DETERMINISTIC_RULE / TOOL_RESULT outputs. They must NEVER be
// represented as LLMs performing arithmetic. The Chief invokes them through
// the tool-orchestrator, not through a model.
// ---------------------------------------------------------------------------

const CALCULATOR_BASE: Omit<CapabilityRecord, 'id' | 'name' | 'purpose' | 'version' | 'intendedUse' | 'responseSourceCategory' | 'dataSources' | 'implementationRef'> = {
  capabilityType: 'calculator',
  notIntendedFor: [], // overridden per-item below
  limitations: [], // overridden per-item below
  permittedRoles: [], // policy layer decides
  modalities: ['calculator'],
  riskClass: 'moderate',
  writeCategory: 'none',
  maxAutonomyLevel: 'ANALYZE',
  minAutonomyLevel: 'OBSERVE',
  requiredContext: { patientRequired: false, encounterRequired: false, tenantRequired: true, userRequired: true, crossPatient: false },
  inputSchema: { type: 'object', description: 'Calculator-specific parameters; see the tool orchestrator input schema for this tool id.' },
  outputSchema: { type: 'object', description: 'Deterministic score/interpretation result; see the tool orchestrator output schema for this tool id.' },
  evidence: {
    expectedSources: ['patient vitals', 'lab results', 'medication list', 'patient demographics'],
    requiresEvidence: true,
    supportsProvenance: true,
    reportsMissingData: true,
    reportsUncertainty: true,
    fabricatesWhenInsufficient: false,
  },
  requiresHumanApproval: false,
  tenantScope: 'tenant_only',
  patientBinding: 'optional',
  authorizationRequirements: ['clinical-read'],
  failureMode: 'explicit_error',
  failureBehavior: 'Returns a typed error; the Chief surfaces the failure and does not present a fabricated score.',
  approved: true,
  lastVerified: '2026-08-23',
  accountable: 'CareDroid clinical calculator maintainers',
  usageNotes: [
    'Input must match the calculator\'s declared input schema exactly.',
    'Output is a deterministic score/interpretation — not a diagnosis.',
    'Missing required inputs produce an explicit error, not a guessed score.',
    'The Chief must not re-run a calculator with fabricated inputs to force a result.',
  ],
};

const calculatorRegistrations: Array<{ id: string; name: string; purpose: string; intendedUse: string; serviceFile: string; outcomeLabel: string }> = [
  { id: 'calculator:news2', name: 'NEWS2', purpose: 'National Early Warning Score 2 — aggregate vital-sign deterioration score with escalation band', intendedUse: 'Early warning for physiological deterioration in acute care', serviceFile: 'backend/src/modules/medical-control-plane/tool-orchestrator/services/news2.service.ts', outcomeLabel: 'total score + risk band' },
  { id: 'calculator:sofa', name: 'SOFA', purpose: 'Sequential Organ Failure Assessment — multi-organ dysfunction score', intendedUse: 'ICU severity stratification and trend tracking', serviceFile: 'backend/src/modules/medical-control-plane/tool-orchestrator/services/sofa-calculator.service.ts', outcomeLabel: 'SOFA total' },
  { id: 'calculator:drug-interactions', name: 'Drug Interaction Checker', purpose: 'Screen a medication list for known interactions and contraindications', intendedUse: 'Medication safety review during ordering and reconciliation', serviceFile: 'backend/src/modules/medical-control-plane/tool-orchestrator/services/drug-checker.service.ts', outcomeLabel: 'interaction list' },
  { id: 'calculator:lab-interpreter', name: 'Lab Interpreter', purpose: 'Interpret lab values against reference ranges and flag abnormals', intendedUse: 'Rapid lab result interpretation with reference-range context', serviceFile: 'backend/src/modules/medical-control-plane/tool-orchestrator/services/lab-interpreter.service.ts', outcomeLabel: 'interpreted results' },
  { id: 'calculator:heart-score', name: 'HEART Score', purpose: 'HEART score for chest-pain risk stratification', intendedUse: 'Chest pain risk stratification (low/intermediate/high)', serviceFile: 'backend/src/modules/medical-control-plane/tool-orchestrator/services/heart-score.service.ts', outcomeLabel: 'HEART total + risk category' },
  { id: 'calculator:cha2ds2vasc', name: 'CHA2DS2-VASc', purpose: 'Stroke risk score for atrial fibrillation', intendedUse: 'Anticoagulation decision support in AF', serviceFile: 'backend/src/modules/medical-control-plane/tool-orchestrator/services/cha2ds2vasc-calculator.service.ts', outcomeLabel: 'CHA2DS2-VASc total' },
  { id: 'calculator:chads2', name: 'CHADS2', purpose: 'Older stroke risk score for atrial fibrillation', intendedUse: 'Historical stroke risk context where CHA2DS2-VASc is not used', serviceFile: 'backend/src/modules/medical-control-plane/tool-orchestrator/services/chads2.service.ts', outcomeLabel: 'CHADS2 total' },
  { id: 'calculator:gcs-calculator', name: 'GCS Calculator', purpose: 'Glasgow Coma Scale total from eye, verbal, motor components', intendedUse: 'Level-of-consciousness quantification', serviceFile: 'backend/src/modules/medical-control-plane/tool-orchestrator/services/gcs-calculator.service.ts', outcomeLabel: 'GCS total (3-15)' },
  { id: 'calculator:wells-pe', name: 'Wells PE', purpose: 'Wells criteria for pulmonary embolism pre-test probability', intendedUse: 'PE risk stratification to guide D-dimer/CT decision', serviceFile: 'backend/src/modules/medical-control-plane/tool-orchestrator/services/wells-pe.service.ts', outcomeLabel: 'Wells PE score + probability' },
  { id: 'calculator:apache2', name: 'APACHE II', purpose: 'Acute Physiology and Chronic Health Evaluation II — ICU severity score', intendedUse: 'ICU mortality risk stratification', serviceFile: 'backend/src/modules/medical-control-plane/tool-orchestrator/services/apache2-calculator.service.ts', outcomeLabel: 'APACHE II total' },
  { id: 'calculator:anion-gap', name: 'Anion Gap', purpose: 'Anion gap calculation from Na, Cl, HCO3', intendedUse: 'Metabolic acidosis classification', serviceFile: 'backend/src/modules/medical-control-plane/tool-orchestrator/services/anion-gap.service.ts', outcomeLabel: 'anion gap value' },
  { id: 'calculator:aa-gradient', name: 'A-a Gradient', purpose: 'Alveolar-arterial oxygen gradient', intendedUse: 'Hypoxemia mechanism assessment', serviceFile: 'backend/src/modules/medical-control-plane/tool-orchestrator/services/aa-gradient.service.ts', outcomeLabel: 'A-a gradient value' },
  { id: 'calculator:corrected-calcium', name: 'Corrected Calcium', purpose: 'Correct serum calcium for albumin', intendedUse: 'Hypo/hypercalcemia assessment when albumin is abnormal', serviceFile: 'backend/src/modules/medical-control-plane/tool-orchestrator/services/corrected-calcium.service.ts', outcomeLabel: 'corrected calcium' },
  { id: 'calculator:corrected-sodium', name: 'Corrected Sodium', purpose: 'Correct serum sodium for hyperglycemia', intendedUse: 'Hyperglycemia-adjusted sodium assessment', serviceFile: 'backend/src/modules/medical-control-plane/tool-orchestrator/services/corrected-sodium.service.ts', outcomeLabel: 'corrected sodium' },
  { id: 'calculator:fena', name: 'FeNa', purpose: 'Fractional excretion of sodium — renal failure classification', intendedUse: 'Prerenal vs intrinsic AKI differentiation', serviceFile: 'backend/src/modules/medical-control-plane/tool-orchestrator/services/fena.service.ts', outcomeLabel: 'FeNa percentage' },
  { id: 'calculator:feurea', name: 'FeUrea', purpose: 'Fractional excretion of urea — renal failure classification when FeNa is unreliable', intendedUse: 'AKI differentiation in patients on diuretics', serviceFile: 'backend/src/modules/medical-control-plane/tool-orchestrator/services/feurea.service.ts', outcomeLabel: 'FeUrea percentage' },
  { id: 'calculator:osmolal-gap', name: 'Osmolal Gap', purpose: ' Osmolal gap from measured and calculated osmolality', intendedUse: 'Toxic alcohol ingestion screening', serviceFile: 'backend/src/modules/medical-control-plane/tool-orchestrator/services/osmolal-gap.service.ts', outcomeLabel: 'osmolal gap' },
  { id: 'calculator:serum-osmolality', name: 'Serum Osmolality', purpose: 'Calculated serum osmolality', intendedUse: 'Osmolality estimation when measured value is unavailable', serviceFile: 'backend/src/modules/medical-control-plane/tool-orchestrator/services/serum-osmolality.service.ts', outcomeLabel: 'calculated osmolality' },
  { id: 'calculator:pao2-fio2-ratio', name: 'PaO2/FiO2 Ratio', purpose: 'P/F ratio for ARDS severity', intendedUse: 'ARDS severity stratification', serviceFile: 'backend/src/modules/medical-control-plane/tool-orchestrator/services/pao2-fio2-ratio.service.ts', outcomeLabel: 'P/F ratio' },
  { id: 'calculator:rox-index', name: 'ROX Index', purpose: 'ROX index for hypoxemic respiratory failure outcome prediction', intendedUse: 'HFNC/MLOS outcome risk assessment', serviceFile: 'backend/src/modules/medical-control-plane/tool-orchestrator/services/rox-index.service.ts', outcomeLabel: 'ROX index' },
  { id: 'calculator:mews', name: 'MEWS', purpose: 'Modified Early Warning Score', intendedUse: 'Early warning alternative where NEWS2 is not used', serviceFile: 'backend/src/modules/medical-control-plane/tool-orchestrator/services/mews.service.ts', outcomeLabel: 'MEWS total' },
  { id: 'calculator:revised-trauma-score', name: 'Revised Trauma Score', purpose: 'Trauma severity from GCS, systolic BP, respiratory rate', intendedUse: 'Trauma patient severity stratification', serviceFile: 'backend/src/modules/medical-control-plane/tool-orchestrator/services/revised-trauma-score.service.ts', outcomeLabel: 'RTS total' },
  { id: 'calculator:hunt-hess-scale', name: 'Hunt & Hess', purpose: 'Subarachnoid hemorrhage grade', intendedUse: 'SAH severity classification', serviceFile: 'backend/src/modules/medical-control-plane/tool-orchestrator/services/hunt-hess-scale.service.ts', outcomeLabel: 'Hunt & Hess grade' },
  { id: 'calculator:ich-score', name: 'ICH Score', purpose: 'Intracerebral hemorrhage outcome score', intendedUse: 'ICH mortality/functional outcome prediction', serviceFile: 'backend/src/modules/medical-control-plane/tool-orchestrator/services/ich-score.service.ts', outcomeLabel: 'ICH score' },
  { id: 'calculator:four-score', name: 'FOUR Score', purpose: 'Full Outline of UnResponsiveness — coma scale alternative to GCS', intendedUse: 'Coma assessment including brainstem function', serviceFile: 'backend/src/modules/medical-control-plane/tool-orchestrator/services/four-score.service.ts', outcomeLabel: 'FOUR total' },
  { id: 'calculator:modified-rankin-scale', name: 'Modified Rankin Scale', purpose: 'Post-stroke functional outcome scale', intendedUse: 'Stroke outcome assessment', serviceFile: 'backend/src/modules/medical-control-plane/tool-orchestrator/services/modified-rankin-scale.service.ts', outcomeLabel: 'mRS grade' },
  { id: 'calculator:pecarn-head', name: 'PECARN Head', purpose: 'Pediatric head-trauma rule for clinically important TBI', intendedUse: 'Pediatric head-CT decision support', serviceFile: 'backend/src/modules/medical-control-plane/tool-orchestrator/services/pecarn-head.service.ts', outcomeLabel: 'PECARN risk level' },
  { id: 'calculator:wells-dvt', name: 'Wells DVT', purpose: 'Wells criteria for DVT pre-test probability', intendedUse: 'DVT risk stratification', serviceFile: 'backend/src/modules/medical-control-plane/tool-orchestrator/services/wells-dvt-calculator.service.ts', outcomeLabel: 'Wells DVT score' },
  { id: 'calculator:abg-interpreter', name: 'ABG Interpreter', purpose: 'Arterial blood gas interpretation — acid/base, oxygenation', intendedUse: 'ABG result interpretation', serviceFile: 'backend/src/modules/medical-control-plane/tool-orchestrator/services/abg-interpreter.service.ts', outcomeLabel: 'ABG interpretation' },
  { id: 'calculator:duke-treadmill', name: 'Duke Treadmill Score', purpose: 'Exercise stress test risk score', intendedUse: 'CAD risk stratification after stress testing', serviceFile: 'backend/src/modules/medical-control-plane/tool-orchestrator/services/duke-treadmill-score.service.ts', outcomeLabel: 'Duke score + risk' },
  { id: 'calculator:framingham-risk', name: 'Framingham Risk', purpose: '10-year cardiovascular risk estimate', intendedUse: 'Cardiovascular risk estimation', serviceFile: 'backend/src/modules/medical-control-plane/tool-orchestrator/services/framingham-risk.service.ts', outcomeLabel: '10-year CVD risk' },
  { id: 'calculator:grace-acs', name: 'GRACE ACS', purpose: 'Global Registry of Acute Coronary Events score for ACS mortality risk', intendedUse: 'ACS risk stratification', serviceFile: 'backend/src/modules/medical-control-plane/tool-orchestrator/services/grace-acs.service.ts', outcomeLabel: 'GRACE score + risk' },
  { id: 'calculator:has-bled', name: 'HAS-BLED', purpose: 'Bleeding risk score for anticoagulation in AF', intendedUse: 'Bleeding risk assessment before anticoagulation', serviceFile: 'backend/src/modules/medical-control-plane/tool-orchestrator/services/has-bled.service.ts', outcomeLabel: 'HAS-BLED total' },
  { id: 'calculator:timi-ua-nstemi', name: 'TIMI UA/NSTEMI', purpose: 'TIMI risk score for unstable angina / NSTEMI', intendedUse: 'UA/NSTEMI risk stratification', serviceFile: 'backend/src/modules/medical-control-plane/tool-orchestrator/services/timi-ua-nstemi.service.ts', outcomeLabel: 'TIMI score + risk' },
  { id: 'calculator:reynolds-risk', name: 'Reynolds Risk', purpose: 'Reynolds cardiovascular risk score', intendedUse: 'Cardiovascular risk estimation with novel markers', serviceFile: 'backend/src/modules/medical-control-plane/tool-orchestrator/services/reynolds-risk-score.service.ts', outcomeLabel: 'Reynolds risk' },
  { id: 'calculator:nexus-cspine', name: 'Nexus C-Spine', purpose: 'NEXUS criteria for cervical spine imaging', intendedUse: 'C-spine clearance decision support', serviceFile: 'backend/src/modules/medical-control-plane/tool-orchestrator/services/nexus-cspine.service.ts', outcomeLabel: 'NEXUS clearance' },
  { id: 'calculator:canadian-cspine', name: 'Canadian C-Spine', purpose: 'Canadian C-spine rule for imaging decision', intendedUse: 'C-spine imaging decision support', serviceFile: 'backend/src/modules/medical-control-plane/tool-orchestrator/services/canadian-c-spine.service.ts', outcomeLabel: 'Canadian C-spine decision' },
  { id: 'calculator:abcd2', name: 'ABCD2', purpose: 'ABCD2 score for transient ischemic attack risk', intendedUse: 'TIA risk stratification for outpatient vs admission', serviceFile: 'backend/src/modules/medical-control-plane/tool-orchestrator/services/abcd2.service.ts', outcomeLabel: 'ABCD2 total' },
];

for (const calc of calculatorRegistrations) {
  registerCapability({
    ...CALCULATOR_BASE,
    id: calc.id,
    name: calc.name,
    purpose: calc.purpose,
    version: '1.0',
    intendedUse: calc.intendedUse,
    notIntendedFor: [
      'Establishing a definitive diagnosis',
      'Replacing clinical judgment or local protocol',
      'Prescribing or ordering medication',
      'Determining disposition without clinician review',
    ],
    limitations: [
      'Requires all inputs declared in the calculator\'s input schema; missing fields produce an explicit error.',
      'Scores are decision support, not diagnosis or treatment orders.',
      'Population and threshold validity depends on the underlying clinical rule source (e.g., RCP for NEWS2).',
      'Some calculators assume benign defaults for fields the board does not capture (documented per-calculator).',
    ],
    responseSourceCategory: SOURCE.TOOL_RESULT,
    dataSources: ['tool-orchestrator', 'clinical-input-from-Chief'],
    implementationRef: calc.serviceFile,
  });
}

// ---------------------------------------------------------------------------
// Emergency-tool capabilities (lib/ai/toolRegistry.ts — the 10 tools)
//
// Source:
//   lib/ai/toolRegistry.ts — TOOL_BY_NAME, MUTATING_TOOLS, executeEmergencyTool()
//
// These are the tools the copilot uses today. They split into read-only tools
// (OBSERVE/ANALYZE) and mutating tools that produce pending actions requiring
// confirmation (PREPARE → EXECUTE after human approval).
// ---------------------------------------------------------------------------

const EM_TOOLS: Array<{ id: string; name: string; purpose: string; toolName: string; readOnly: boolean; modality: Modality; sourceCat: AIResponseSourceCategory; writeCategory: WriteCategory; maxAutonomy: AutonomyLevel; crossPatient: boolean }> = [
  { id: 'tool:get_patient_details', name: 'Get Patient Details', purpose: 'Read the full CareDroid patient object for a patient id', toolName: 'get_patient_details', readOnly: true, modality: 'retrieval', sourceCat: SOURCE.TOOL_RESULT, writeCategory: 'none', maxAutonomy: 'ANALYZE', crossPatient: false },
  { id: 'tool:get_queue_status', name: 'Get Queue Status', purpose: 'Read queue statistics for one queue or all CareDroid queues', toolName: 'get_queue_status', readOnly: true, modality: 'retrieval', sourceCat: SOURCE.TOOL_RESULT, writeCategory: 'none', maxAutonomy: 'ANALYZE', crossPatient: true },
  { id: 'tool:get_capacity_status', name: 'Get Capacity Status', purpose: 'Read the full current CareDroid CapacitySnapshot', toolName: 'get_capacity_status', readOnly: true, modality: 'retrieval', sourceCat: SOURCE.TOOL_RESULT, writeCategory: 'none', maxAutonomy: 'ANALYZE', crossPatient: true },
  { id: 'tool:search_patients', name: 'Search Patients', purpose: 'Search CareDroid patients by query and optional partial patient fields; returns summary fields only', toolName: 'search_patients', readOnly: true, modality: 'retrieval', sourceCat: SOURCE.TOOL_RESULT, writeCategory: 'none', maxAutonomy: 'ANALYZE', crossPatient: true },
  { id: 'tool:flag_patient', name: 'Flag Patient', purpose: 'Propose adding a clinical/operational flag to a patient; requires human confirmation before applying', toolName: 'flag_patient', readOnly: false, modality: 'workflow', sourceCat: SOURCE.TOOL_RESULT, writeCategory: 'patient_state', maxAutonomy: 'PREPARE', crossPatient: false },
  { id: 'tool:move_patient_state', name: 'Move Patient State', purpose: 'Propose moving a patient to a different journey state; requires human confirmation and validates transition legality', toolName: 'move_patient_state', readOnly: false, modality: 'workflow', sourceCat: SOURCE.TOOL_RESULT, writeCategory: 'patient_state', maxAutonomy: 'PREPARE', crossPatient: false },
  { id: 'tool:launch_calculator', name: 'Launch Calculator', purpose: 'Propose opening a clinical calculator for a patient; requires human confirmation before opening UI', toolName: 'launch_calculator', readOnly: false, modality: 'workflow', sourceCat: SOURCE.TOOL_RESULT, writeCategory: 'draft', maxAutonomy: 'PREPARE', crossPatient: false },
  { id: 'tool:create_referral', name: 'Create Referral', purpose: 'Propose creating a draft referral for a patient; requires human confirmation before saving', toolName: 'create_referral', readOnly: false, modality: 'workflow', sourceCat: SOURCE.TOOL_RESULT, writeCategory: 'draft', maxAutonomy: 'PREPARE', crossPatient: false },
  { id: 'tool:dispatch_alert', name: 'Dispatch Alert', purpose: 'Propose dispatching a CareDroid alert; requires human confirmation before adding it', toolName: 'dispatch_alert', readOnly: false, modality: 'communication', sourceCat: SOURCE.TOOL_RESULT, writeCategory: 'communication', maxAutonomy: 'PREPARE', crossPatient: false },
];

for (const em of EM_TOOLS) {
  registerCapability({
    id: em.id,
    capabilityType: em.readOnly ? 'service' : 'service',
    name: em.name,
    purpose: em.purpose,
    version: '1.0',
    intendedUse: `CareDroid ${em.toolName} — ${em.purpose}`,
    notIntendedFor: em.readOnly
      ? []
      : ['Automatic execution without human confirmation; the tool returns a pending action, not a mutation'],
    limitations: em.readOnly
      ? ['Read-only — reflects the current CareDroid store snapshot; may not include a write that just happened elsewhere.']
      : ['Returns a pending action only; the confirming user\'s authorization is re-checked at confirmation, not assumed from this call.'],
    modalities: [em.modality],
    riskClass: em.readOnly ? 'none' : 'moderate',
    writeCategory: em.writeCategory,
    maxAutonomyLevel: em.maxAutonomy,
    minAutonomyLevel: 'OBSERVE',
    requiredContext: { patientRequired: !em.readOnly, encounterRequired: false, tenantRequired: true, userRequired: true, crossPatient: em.crossPatient },
    inputSchema: { type: 'object', description: `Arguments for the ${em.toolName} tool; see lib/ai/toolRegistry.ts TOOL_BY_NAME for the exact parameter contract.` },
    outputSchema: { type: 'object', description: em.readOnly ? 'Requested read-only data.' : 'A pending action requiring human confirmation via applyConfirmedToolAction() — never a direct mutation.' },
    dataSources: ['CareDroid store (frontend state)'],
    evidence: {
      expectedSources: em.readOnly ? ['CareDroid store'] : ['CareDroid store', 'human-confirmation'],
      requiresEvidence: false,
      supportsProvenance: false,
      reportsMissingData: false,
      reportsUncertainty: false,
      fabricatesWhenInsufficient: false,
    },
    responseSourceCategory: em.sourceCat,
    requiresHumanApproval: !em.readOnly,
    permittedRoles: [], // policy layer decides
    tenantScope: 'tenant_only',
    patientBinding: em.readOnly ? 'optional' : 'required',
    authorizationRequirements: em.readOnly ? ['clinical-read'] : ['clinical-write', 'human-approval-gate'],
    failureMode: 'explicit_error',
    failureBehavior: 'Returns a typed error; mutating tools return a pending action rather than a silent mutation.',
    approved: true,
    lastVerified: '2026-08-23',
    accountable: 'CareDroid copilot tooling maintainers',
    implementationRef: 'lib/ai/toolRegistry.ts',
    usageNotes: em.readOnly
      ? ['Read-only tool — no state change.']
      : ['This tool returns a pending action, NOT a mutation. The action must be confirmed via applyConfirmedToolAction() and human approval before any state changes.'],
  });
}

// ---------------------------------------------------------------------------
// Chief Investigation runner (the first vertical slice)
//
// Source:
//   backend/src/modules/chief-investigation/chief-investigation.service.ts
//   backend/src/modules/chief-investigation/investigation-plan.lib.ts
//   backend/src/modules/chief-investigation/chief-investigation.types.ts
//
// Deterministic plan runner. LEVEL_0_OBSERVE + LEVEL_2_PREPARE. No LLM planning,
// no autonomous mutation. Every suggested action becomes an AiActionProposal.
// ---------------------------------------------------------------------------

registerCapability({
  id: 'agent:chief-investigation',
  capabilityType: 'agent',
  name: 'Chief Investigation Runner',
  purpose: 'Execute a deterministic "investigate this patient" plan: verify patient, retrieve vitals, run NEWS2, assess trend, synthesize with truthful states, prepare approval-required proposals.',
  version: 'deterioration@1',
  intendedUse: 'On-demand deterioration investigation for a bound patient, producing a transparent step trace and prepared (not executed) action proposals.',
  notIntendedFor: [
    'Autonomous diagnosis or treatment',
    'Silent mutation of clinical state',
    'Running without a bound patient context',
    'Acting as a system of record',
  ],
  limitations: [
    'v1 uses a FIXED deterministic plan — no LLM planning; only deterioration investigation is supported today.',
    'NEWS2 is the only calculator currently wired into the plan; other calculators are not yet invoked by this runner.',
    'Requires a bound patient with at least one vitals recording to produce a NEWS2 score — otherwise the step is skipped, not fabricated.',
  ],
  modalities: ['deterministic_rule', 'calculator', 'analysis'],
  riskClass: 'elevated',
  writeCategory: 'task', // only creates approval-required proposals, never mutates clinical state
  maxAutonomyLevel: 'PREPARE',
  minAutonomyLevel: 'OBSERVE',
  requiredContext: { patientRequired: true, encounterRequired: false, tenantRequired: true, userRequired: true, crossPatient: false },
  inputSchema: { type: 'object', properties: { patientId: { type: 'string' } }, required: ['patientId'], description: 'Bound patient id to investigate.' },
  outputSchema: { type: 'object', description: 'An InvestigationRunResult: step trace, truthful-state findings, and PREPARE-only proposed actions (see chief-investigation.types.ts).' },
  dataSources: ['emergency-os patient registry', 'emergency-os vitals', 'tool-orchestrator (NEWS2)'],
  evidence: {
    expectedSources: ['patient vitals', 'NEWS2 calculator output', 'trend notes'],
    requiresEvidence: true,
    supportsProvenance: true,
    reportsMissingData: true,
    reportsUncertainty: true,
    fabricatesWhenInsufficient: false,
  },
  responseSourceCategory: SOURCE.DETERMINISTIC_RULE,
  requiresHumanApproval: true,
  permittedRoles: [],
  tenantScope: 'tenant_only',
  patientBinding: 'required',
  authorizationRequirements: ['clinical-read', 'clinical-write:task', 'object-level-authorization'],
  failureMode: 'explicit_error',
  failureBehavior: 'Each step reports its own status (completed/warning/failed/skipped). The synthesis uses truthful states (SUPPORTED, PARTIALLY_SUPPORTED, INSUFFICIENT_DATA, STALE_DATA, TOOL_FAILURE, OUTSIDE_SCOPE, REQUIRES_HUMAN_REVIEW). No step failing silently produces a fabricated conclusion.',
  approved: true,
  lastVerified: '2026-08-23',
  accountable: 'CareDroid Chief investigation maintainers',
  implementationRef: 'backend/src/modules/chief-investigation/chief-investigation.service.ts',
  usageNotes: [
    'This is the first vertical slice of the Clinical Agent Command Platform — it traverses the full chain: context verification → planning → capability discovery → deterministic tool invocation → evidence/provenance → synthesis → human approval gate → audit.',
    'The runner never executes a consequential action. Every prepared action is an AiActionProposal that requires human approval.',
    'The overallState is the MOST HONEST state, not the best-case state — OUTSIDE_SCOPE > TOOL_FAILURE > REQUIRES_HUMAN_REVIEW > STALE_DATA > INSUFFICIENT_DATA > PARTIALLY_SUPPORTED > SUPPORTED.',
  ],
  childIds: calculatorRegistrations.map((c) => c.id).filter((id) => id === 'calculator:news2'),
});

// ---------------------------------------------------------------------------
// Unified AI Node / heuristic structured node
//
// Source:
//   lib/ai/careDroidAI.ts — 18-intent structured heuristic node
//   lib/ai/careDroidAISchemas.ts
//   lib/ai/careDroidAITypes.ts
//
// A structured, deterministic heuristic node — NOT an LLM. Classifies requests
// into intents and produces structured responses. Must be classified as
// DETERMINISTIC_RULE / heuristic, not as a model.
// ---------------------------------------------------------------------------

registerCapability({
  id: 'model:careDroidAI-heuristic-node',
  capabilityType: 'model',
  name: 'CareDroid AI Structured Heuristic Node',
  purpose: 'Structured 18-intent classification and response node — deterministic heuristic, not an LLM. Routes free-text clinical/operational queries to structured outputs.',
  version: 'careDroidAI-heuristic-node@1',
  intendedUse: 'Intent classification and structured response generation for clinical/operational queries where a deterministic heuristic is safer and faster than an LLM.',
  notIntendedFor: [
    'Free-form narrative generation',
    'Evidence synthesis requiring retrieval',
    'Complex clinical reasoning beyond its declared intent set',
    'Representing itself as an LLM or trained model',
  ],
  limitations: [
    'Covers exactly 18 declared intents; anything outside that set returns unrecognized-intent, not a best-guess.',
    'Confidence is deterministic heuristic confidence, not a trained model probability.',
  ],
  modalities: ['deterministic_rule', 'heuristic'],
  riskClass: 'moderate',
  writeCategory: 'none',
  maxAutonomyLevel: 'ANALYZE',
  minAutonomyLevel: 'OBSERVE',
  requiredContext: { patientRequired: false, encounterRequired: false, tenantRequired: true, userRequired: true, crossPatient: false },
  inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'], description: 'Free-text clinical/operational query to classify and route.' },
  outputSchema: { type: 'object', description: 'A structured response for the matched intent, or an explicit unrecognized-intent result.' },
  dataSources: ['query input', 'prompt registry'],
  evidence: {
    expectedSources: ['query input'],
    requiresEvidence: false,
    supportsProvenance: true,
    reportsMissingData: true,
    reportsUncertainty: true,
    fabricatesWhenInsufficient: false,
  },
  responseSourceCategory: SOURCE.DETERMINISTIC_RULE,
  requiresHumanApproval: false,
  permittedRoles: [],
  tenantScope: 'tenant_only',
  patientBinding: 'optional',
  authorizationRequirements: ['clinical-read'],
  failureMode: 'explicit_error',
  failureBehavior: 'Returns an intent-not-matched or error result; does not fabricate a response for an unrecognized intent.',
  approved: true,
  lastVerified: '2026-08-23',
  accountable: 'CareDroid AI node maintainers',
  implementationRef: 'lib/ai/careDroidAI.ts',
  usageNotes: [
    'This is a heuristic node — it must be classified as DETERMINISTIC_RULE, never as an LLM or trained model.',
    'The 18-intent set is the node\'s scope boundary; intents outside that set must not be forced into a best-guess response.',
    'Confidence is deterministic heuristic confidence, not a model probability — do not present as model certainty.',
  ],
});

// ---------------------------------------------------------------------------
// LLM provider adapters
//
// Source:
//   lib/ai/providers/ — adapters (anthropic, openai, azure-openai, gemini, groq, local)
//   lib/ai/egress.ts — egress with transport safety
//   lib/ai/registry.ts — provider registry
//   lib/ai/transportSafety.ts — timeouts + circuit breakers
//
// These are the actual language-model egress paths. They are MODEL_PREDICTION /
// LLM_GENERATED sources. They are NOT deterministic rules. They require provider
// authorization, tenant isolation, safety policy, and human-review gating for
// high-risk outputs.
// ---------------------------------------------------------------------------

const LLM_ADAPTERS: Array<{ id: string; name: string; provider: string; modelVariable: string; intendedUse: string; limitations: string[] }> = [
  { id: 'model:anthropic', name: 'Anthropic Adapter', provider: 'anthropic', modelVariable: 'ANTHROPIC_MODEL', intendedUse: 'General-purpose LLM generation for conversational copilot, summarization, drafting, and explanation where a capable model is needed and clinician review applies', limitations: ['Requires ANTHROPIC_API_KEY configured; unconfigured = UNAVAILABLE', 'Streaming supported; non-streaming fallback exists', 'Subject to provider rate limits and timeouts via transportSafety', 'Output is decision support only — requires clinician review for clinical use'] },
  { id: 'model:openai', name: 'OpenAI Adapter', provider: 'openai', modelVariable: 'OPENAI_MODEL', intendedUse: 'General-purpose LLM generation as an alternative provider to Anthropic', limitations: ['Requires OPENAI_API_KEY configured; unconfigured = UNAVAILABLE', 'Streaming not supported by this adapter — returns complete response', 'Subject to provider rate limits and timeouts'] },
  { id: 'model:azure-openai', name: 'Azure OpenAI Adapter', provider: 'azure-openai', modelVariable: 'AZURE_OPENAI_MODEL', intendedUse: 'Enterprise Azure OpenAI deployment as an LLM provider', limitations: ['Requires Azure endpoint and key configured; unconfigured = UNAVAILABLE', 'Streaming not supported by this adapter', 'Subject to Azure deployment limits'] },
  { id: 'model:gemini', name: 'Gemini Adapter', provider: 'gemini', modelVariable: 'GEMINI_MODEL', intendedUse: 'Google Gemini as an LLM provider', limitations: ['Requires GEMINI_API_KEY configured; unconfigured = UNAVAILABLE', 'Streaming not supported by this adapter', 'Subject to provider rate limits and timeouts'] },
  { id: 'model:groq', name: 'Groq Adapter', provider: 'groq', modelVariable: 'GROQ_MODEL', intendedUse: 'Fast inference via Groq as an LLM provider (demo/env-based, not in CI)', limitations: ['Requires GROQ_API_KEY configured; unconfigured = UNAVAILABLE', 'Streaming not supported by this adapter', 'Operational, not CI-gated — live demo record required before promotion'] },
  { id: 'model:local-deterministic', name: 'Local Deterministic Adapter', provider: 'local', modelVariable: 'LOCAL_MODEL', intendedUse: 'Deterministic local fallback when no LLM provider is available — always configured, never requires secrets', limitations: ['Deterministic, not generative — does not produce free-form narrative', 'Used as a safety fallback, not as the primary generation path for creative tasks'] },
];

for (const adapter of LLM_ADAPTERS) {
  registerCapability({
    id: adapter.id,
    capabilityType: 'model',
    name: adapter.name,
    purpose: `LLM egress adapter for ${adapter.provider} — routes generation requests through the ${adapter.provider} provider with transport safety, timeouts, and circuit breaking.`,
    version: `${adapter.provider}-adapter@1`,
    intendedUse: adapter.intendedUse,
    notIntendedFor: [
      'Autonomous diagnosis, prescription, or disposition',
      'Silent mutation of clinical state',
      'Bypassing safety policy or human-review gates',
      'Running without a configured provider key (unconfigured = UNAVAILABLE)',
    ],
    limitations: adapter.limitations,
    modalities: ['llm_generation'],
    riskClass: 'elevated',
    writeCategory: 'none',
    maxAutonomyLevel: 'RECOMMEND',
    minAutonomyLevel: 'OBSERVE',
    requiredContext: { patientRequired: false, encounterRequired: false, tenantRequired: true, userRequired: true, crossPatient: false },
    inputSchema: { type: 'object', properties: { prompt: { type: 'string' } }, required: ['prompt'], description: `Prompt/messages for the ${adapter.provider} provider, plus optional tool/context config.` },
    outputSchema: { type: 'object', description: 'Generated text (streaming where supported) or an explicit UNAVAILABLE/error result when the provider is unconfigured or the circuit is open.' },
    dataSources: ['provider API', 'prompt registry', 'RAG retrieval (when applicable)'],
    evidence: {
      expectedSources: ['prompt input', 'RAG-retrieved evidence (when grounded)'],
      requiresEvidence: true,
      supportsProvenance: true,
      reportsMissingData: true,
      reportsUncertainty: true,
      fabricatesWhenInsufficient: false, // safety policy must prevent this
    },
    responseSourceCategory: SOURCE.LLM_GENERATED,
    requiresHumanApproval: false, // approval gating is separate — the model itself doesn't decide
    permittedRoles: [],
    tenantScope: 'tenant_only',
    patientBinding: 'optional',
    authorizationRequirements: ['llm-egress-authorized', 'tenant-isolation', 'safety-policy-gated'],
    failureMode: 'circuit_breaks',
    failureBehavior: 'Transport safety enforces timeouts and circuit breaking. When the provider is unavailable, the system degrades to deterministic fallback or returns UNAVAILABLE — it never fabricates a response.',
    approved: true,
    lastVerified: '2026-08-23',
    accountable: 'CareDroid AI provider maintainers',
    implementationRef: `lib/ai/providers/${adapter.provider}Adapter.ts`,
    usageNotes: [
      'This adapter is an egress path, not a capability on its own — it must be invoked within a higher-level workflow (copilot, clinical intelligence, RAG-grounded query) that applies safety policy, context binding, and human-review gating.',
      'When the provider key is not configured, this capability is UNAVAILABLE — the Chief must not route critical tasks to it.',
      'Streaming is adapter-dependent; do not assume streaming is available on every provider.',
    ],
  });
}

// ---------------------------------------------------------------------------
// RAG pipeline
//
// Source:
//   backend/src/modules/rag/ — retrieval, reranking, embeddings, vector-db, citations
//   backend/src/modules/rag/rag.service.ts
//   backend/src/modules/rag/retrieval.tenant-adversarial.spec.ts
//
// RAG is a retrieval + reranking + citation pipeline. Its output source category
// is RAG_ASSISTED when grounded, or retrieval-only when used as a pure lookup.
// Tenant isolation is unit-tested; adversarial HTTP/Postgres integration is open.
// ---------------------------------------------------------------------------

registerCapability({
  id: 'service:rag-pipeline',
  capabilityType: 'service',
  name: 'RAG Clinical Evidence Pipeline',
  purpose: 'Retrieve, embed, cache, rerank, and cite clinical and operational knowledge in response to a query, with tenant isolation.',
  version: 'rag-pipeline@1',
  intendedUse: 'Evidence-grounded retrieval for clinical questions, policy lookup, and operational knowledge queries where cited sources matter.',
  notIntendedFor: [
    'Autonomous diagnosis or treatment',
    'Replacing direct patient-data retrieval with external knowledge',
    'Cross-tenant data access (tenant isolation enforced at the query level)',
  ],
  limitations: [
    'Adversarial HTTP/Postgres tenant-isolation integration is open; only unit-level isolation is verified.',
    'Retrieval quality depends on the underlying knowledge base coverage for the query domain.',
  ],
  modalities: ['rag_assisted', 'retrieval'],
  riskClass: 'low',
  writeCategory: 'none',
  maxAutonomyLevel: 'ANALYZE',
  minAutonomyLevel: 'OBSERVE',
  requiredContext: { patientRequired: false, encounterRequired: false, tenantRequired: true, userRequired: true, crossPatient: false },
  inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'], description: 'A clinical/operational question to retrieve and cite evidence for.' },
  outputSchema: { type: 'object', description: 'Retrieved, reranked chunks with citations — evidence, not a synthesized conclusion.' },
  dataSources: ['clinical knowledge base (vector store)', 'retrieval cache'],
  evidence: {
    expectedSources: ['retrieved chunks', 'knowledge registry'],
    requiresEvidence: true,
    supportsProvenance: true,
    reportsMissingData: true,
    reportsUncertainty: true,
    fabricatesWhenInsufficient: false,
  },
  responseSourceCategory: SOURCE.RAG_ASSISTED,
  requiresHumanApproval: false,
  permittedRoles: [],
  tenantScope: 'tenant_only',
  patientBinding: 'none',
  authorizationRequirements: ['tenant-isolation', 'clinical-read'],
  failureMode: 'explicit_error',
  failureBehavior: 'Returns retrieved/citation results or an explicit error. Tenant-isolation filters are applied at query time. When the vector backend is unavailable, the pipeline degrades explicitly — it does not fabricate sources.',
  approved: true,
  lastVerified: '2026-08-23',
  accountable: 'CareDroid RAG maintainers',
  implementationRef: 'backend/src/modules/rag/rag.service.ts',
  usageNotes: [
    'Tenant isolation is verified at the unit level; adversarial HTTP/Postgres integration is an open task — do not assume cross-tenant denial is proven end-to-end in production yet.',
    'Citations are real and traceable to retrieved chunks — do not present RAG output without citing the sources.',
    'RAG returns EVIDENCE, not CONCLUSIONS — the Chief or a downstream workflow must synthesize findings.',
  ],
});

// ---------------------------------------------------------------------------
// OCR pipeline
//
// Source:
//   backend/src/modules/emergency-os/ocr-providers.ts — Tesseract.js OCR
//   backend/src/modules/emergency-os/ — OCR orchestrator
//
// OCR extracts text from images/PDFs. It is a document-understanding capability,
// not an LLM. Accuracy on messy handwriting and PDF rasterization is open.
// ---------------------------------------------------------------------------

registerCapability({
  id: 'service:ocr-pipeline',
  capabilityType: 'service',
  name: 'OCR Document Understanding Pipeline',
  purpose: 'Extract text from patient documents, forms, and images using Tesseract.js, with field validation before authoritative use.',
  version: 'ocr-pipeline@1',
  intendedUse: 'Document intake and text extraction for reception intake, referral documents, and external records where text must be pulled from images/PDFs.',
  notIntendedFor: [
    'Clinical interpretation of extracted text (that is a downstream task)',
    'Authoritative data entry without field validation',
    'Reliance on OCR output as ground truth without clinician verification',
  ],
  limitations: [
    'Accuracy on messy handwriting and PDF rasterization is an open, unverified task.',
    'Extracted text requires field validation before it enters authoritative patient data.',
  ],
  modalities: ['document_understanding'],
  riskClass: 'low',
  writeCategory: 'none',
  maxAutonomyLevel: 'ANALYZE',
  minAutonomyLevel: 'OBSERVE',
  requiredContext: { patientRequired: false, encounterRequired: false, tenantRequired: true, userRequired: true, crossPatient: false },
  inputSchema: { type: 'object', properties: { document: { type: 'string', description: 'Image or PDF input reference.' } }, required: ['document'], description: 'Source document/image to extract text from.' },
  outputSchema: { type: 'object', description: 'Extracted raw text plus per-field confidence; not authoritative until field-validated.' },
  dataSources: ['image/document input', 'Tesseract.js engine'],
  evidence: {
    expectedSources: ['source document image/PDF'],
    requiresEvidence: true,
    supportsProvenance: true,
    reportsMissingData: true,
    reportsUncertainty: true,
    fabricatesWhenInsufficient: false,
  },
  responseSourceCategory: SOURCE.DETERMINISTIC_RULE, // OCR is deterministic extraction, not a model
  requiresHumanApproval: false,
  permittedRoles: [],
  tenantScope: 'tenant_only',
  patientBinding: 'optional',
  authorizationRequirements: ['clinical-read', 'document-access'],
  failureMode: 'graceful_degradation',
  failureBehavior: 'When Tesseract fails or the image is unreadable, OCR returns an explicit error or partial extraction with a warning — it does not fabricate text. PDFs fall back to manual text entry with a warning.',
  approved: true,
  lastVerified: '2026-08-23',
  accountable: 'CareDroid OCR maintainers',
  implementationRef: 'backend/src/modules/emergency-os/ocr-providers.ts',
  usageNotes: [
    'OCR accuracy on clean images is verified; accuracy on messy handwriting and PDF rasterization is an open task and must not be assumed.',
    'Extracted text is raw data, not interpreted clinical facts — downstream interpretation must apply field validation before authoritative use.',
    'OCR field validation gates must be applied before any extracted value enters authoritative patient data.',
  ],
});

// ---------------------------------------------------------------------------
// Chat pipeline (the real, live copilot path)
//
// Source:
//   backend/src/modules/chat/chat.service.ts — POST /api/chat/message
//   backend/src/modules/chat/ — IntentClassifier, MoERouter, ContextBuilder,
//     RoutingOptimizer, RAG, toolOrchestrator, ResponseComposer, memory
//
// This is the real, working AI pipeline end to end. It is the primary copilot
// path real traffic uses. It is NOT a fake or duplicate — the duplicate ED
// copilot (EDCopilotService) was deleted in 2026-08-08.
//
// Known gaps (documented, not fixed here):
//   - 4 independent model/expert-selection systems; only 2 agree
//   - Streaming fully built, zero consumers
//   - Artifacts write-side working, read-side dead
//   - Approval gate advisory-only (does not block)
// ---------------------------------------------------------------------------

registerCapability({
  id: 'agent:copilot-chat-pipeline',
  capabilityType: 'agent',
  name: 'CareDroid Copilot Chat Pipeline',
  purpose: 'End-to-end conversational AI pipeline: intent classification → MoERouter expert selection → context assembly → routing optimization → RAG retrieval → LLM invocation with tools → tool execution → response composition → memory → artifact → evaluation. The real, live copilot path real traffic uses.',
  version: 'chat-pipeline@1',
  intendedUse: 'Conversational clinical and operational decision support across Reception, EMS, Triage, Nursing, Physician, and Operations channels, with evidence grounding, tool use, and human-review gating where required.',
  notIntendedFor: [
    'Autonomous diagnosis, prescription, ordering, disposition, or admission',
    'Silent mutation of clinical state',
    'Representing the duplicate ED copilot (that was deleted) — this is the one real path',
    'Running without a bound user, tenant, and channel context',
  ],
  limitations: [
    '4 independent model/expert-selection systems remain live; only 2 agree (MoERouter + RoutingOptimizer).',
    'Streaming is built but has zero consumers — responses are always returned complete, never streamed.',
    'The approval gate is advisory-only at 3 of 4 call sites — it does not block execution.',
  ],
  modalities: ['llm_generation', 'rag_assisted', 'deterministic_rule', 'heuristic'],
  riskClass: 'elevated',
  writeCategory: 'none', // the pipeline composes responses; mutations go through tool-orchestrator or action proposals
  maxAutonomyLevel: 'RECOMMEND',
  minAutonomyLevel: 'OBSERVE',
  requiredContext: { patientRequired: true, encounterRequired: false, tenantRequired: true, userRequired: true, crossPatient: false },
  inputSchema: { type: 'object', properties: { message: { type: 'string' } }, required: ['message'], description: 'User message plus bound patient/encounter/channel context (see POST /api/chat/message).' },
  outputSchema: { type: 'object', description: 'Composed assistant response with citations/tool results where applicable; a complete response, not a stream (streaming is built but has zero consumers).' },
  dataSources: ['chat service', 'RAG pipeline', 'tool orchestrator', 'memory service', 'intent classifier', 'MoE router'],
  evidence: {
    expectedSources: ['RAG-retrieved evidence', 'tool execution results', 'conversation context'],
    requiresEvidence: true,
    supportsProvenance: true,
    reportsMissingData: true,
    reportsUncertainty: true,
    fabricatesWhenInsufficient: false, // safety policy must enforce this
  },
  responseSourceCategory: SOURCE.LLM_GENERATED, // primary generation is LLM; may include RAG_ASSISTED and TOOL_RESULT as sub-components
  requiresHumanApproval: false, // gating is per-output, not per-pipeline
  permittedRoles: [],
  tenantScope: 'tenant_only',
  patientBinding: 'required',
  authorizationRequirements: ['clinical-read', 'llm-egress-authorized', 'tenant-isolation', 'safety-policy-gated', 'object-level-authorization'],
  failureMode: 'circuit_breaks',
  failureBehavior: 'Transport safety enforces timeouts and circuit breaking on LLM egress. When providers are unavailable, the pipeline degrades to deterministic fallback or returns an explicit unavailable response — it does not fabricate a copilot answer.',
  approved: true,
  lastVerified: '2026-08-23',
  accountable: 'CareDroid copilot maintainers',
  implementationRef: 'backend/src/modules/chat/chat.service.ts',
  usageNotes: [
    'This is the REAL copilot path — POST /api/chat/message. The duplicate ED copilot (EDCopilotService) was deleted in 2026-08-08. Any reference to a second copilot runtime is stale.',
    '4 independent model/expert-selection systems remain live; only 2 agree (MoERouter + RoutingOptimizer). The panelOfExpertsRouter is frontend-only and never reaches the backend. Reconciliation is an open task.',
    'Streaming is fully built (lib/ai/client.ts streamAI/streamAIResponse) but has zero consumers — the chat endpoint returns a complete response, never a stream.',
    'Artifacts are persisted server-side by ChatService.recordAssistantArtifact() but the frontend read path (src/services/artifactsApi.ts) is never called by any page — real generated artifacts are currently unrecoverable through the UI.',
    'The approval gate (tool-orchestrator evaluateGate) is advisory-only at 3 of 4 call sites — it does not block execution. A separate, working human-approval loop exists under workflow-orchestration/review but is unconnected to AI-generated output.',
    'Memory reads/writes are skipped silently unless userId matches a UUID pattern — the real functional coverage of assistant memory in production is unverified.',
  ],
});

// ---------------------------------------------------------------------------
// Clinical Intelligence Service
//
// Source:
//   backend/src/modules/clinical-intelligence/ — clinical-intelligence.service.ts
//
// RAG-grounded clinical intelligence — separate from the chat pipeline. Used for
// structured clinical queries that need retrieval plus synthesis. Integrates RAG
// at its call site.
// ---------------------------------------------------------------------------

registerCapability({
  id: 'service:clinical-intelligence',
  capabilityType: 'service',
  name: 'Clinical Intelligence Service',
  purpose: 'RAG-grounded clinical intelligence — structured clinical queries with retrieval and synthesis, separate from the conversational copilot path.',
  version: 'clinical-intelligence@1',
  intendedUse: 'Structured clinical queries requiring evidence retrieval and synthesis — e.g., "what is the evidence for this protocol?", "summarize this patient\'s clinical context with citations".',
  notIntendedFor: [
    'Conversational chat (use the copilot pipeline instead)',
    'Autonomous diagnosis or treatment',
    'Silent mutation of clinical state',
  ],
  limitations: [
    'Shares RAG\'s open adversarial tenant-isolation integration caveat.',
    'Synthesis quality depends on the LLM provider selected and the retrieved evidence coverage.',
  ],
  modalities: ['rag_assisted', 'llm_generation', 'analysis'],
  riskClass: 'moderate',
  writeCategory: 'none',
  maxAutonomyLevel: 'RECOMMEND',
  minAutonomyLevel: 'OBSERVE',
  requiredContext: { patientRequired: true, encounterRequired: false, tenantRequired: true, userRequired: true, crossPatient: false },
  inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'], description: 'A structured clinical query requiring evidence retrieval plus synthesis for a bound patient.' },
  outputSchema: { type: 'object', description: 'Synthesized, cited clinical intelligence response.' },
  dataSources: ['RAG pipeline', 'clinical data sources', 'LLM provider'],
  evidence: {
    expectedSources: ['RAG-retrieved evidence', 'clinical data'],
    requiresEvidence: true,
    supportsProvenance: true,
    reportsMissingData: true,
    reportsUncertainty: true,
    fabricatesWhenInsufficient: false,
  },
  responseSourceCategory: SOURCE.RAG_ASSISTED,
  requiresHumanApproval: false,
  permittedRoles: [],
  tenantScope: 'tenant_only',
  patientBinding: 'required',
  authorizationRequirements: ['clinical-read', 'llm-egress-authorized', 'tenant-isolation', 'safety-policy-gated'],
  failureMode: 'circuit_breaks',
  failureBehavior: 'Degrades gracefully when RAG or LLM is unavailable; returns an explicit error or deterministic fallback rather than a fabricated clinical finding.',
  approved: true,
  lastVerified: '2026-08-23',
  accountable: 'CareDroid clinical intelligence maintainers',
  implementationRef: 'backend/src/modules/clinical-intelligence/clinical-intelligence.service.ts',
  usageNotes: [
    'This service integrates RAG at its call site (clinical-intelligence.service.ts:142). It is not a replacement for the copilot pipeline — it is a parallel, query-oriented intelligence surface.',
    'RAG tenant isolation applies here too — same open adversarial integration caveat as the RAG capability itself.',
  ],
});

// ---------------------------------------------------------------------------
// Human Review capability
//
// Source:
//   backend/src/modules/human-review/ — human-review service
//   backend/src/modules/platform-governance/ — review item creation
//
// Human review is the gate between AI preparation and clinical action. It is a
// real capability the Chief uses to route high-risk outputs to clinician review.
// ---------------------------------------------------------------------------

registerCapability({
  id: 'human_review:governance-review-items',
  capabilityType: 'human_review',
  name: 'Platform Governance Human Review',
  purpose: 'Create and manage human-review items for high-risk AI outputs — the gate that separates AI preparation from clinical action.',
  version: 'governance-review@1',
  intendedUse: 'Route high-risk AI outputs (elevated NEWS2, suggested actions, critical findings) to clinician review before any consequential action proceeds.',
  notIntendedFor: [
    'Automatically approving or acting on review items',
    'Bypassing the review item creation step for high-risk outputs',
    'Treating review-item creation as equivalent to clinical action',
  ],
  limitations: [
    'The downstream approval gate is advisory-only at 3 of 4 call sites — creating a review item does not by itself block action.',
    'Full HTTP/Postgres integration coverage is open; creation is asserted at the unit level.',
  ],
  modalities: ['human_review', 'workflow'],
  riskClass: 'high',
  writeCategory: 'task', // creates review items, not clinical mutations
  maxAutonomyLevel: 'PREPARE',
  minAutonomyLevel: 'RECOMMEND',
  requiredContext: { patientRequired: true, encounterRequired: false, tenantRequired: true, userRequired: true, crossPatient: false },
  inputSchema: { type: 'object', description: 'The high-risk AI output plus clinical context requiring review.' },
  outputSchema: { type: 'object', description: 'A created review item id and status — creation only, never an approval decision.' },
  dataSources: ['AI output', 'governance service'],
  evidence: {
    expectedSources: ['AI output requiring review', 'clinical context'],
    requiresEvidence: true,
    supportsProvenance: true,
    reportsMissingData: true,
    reportsUncertainty: true,
    fabricatesWhenInsufficient: false,
  },
  responseSourceCategory: SOURCE.DETERMINISTIC_RULE, // review item creation is a deterministic workflow action
  requiresHumanApproval: true, // the whole point
  permittedRoles: [],
  tenantScope: 'tenant_only',
  patientBinding: 'required',
  authorizationRequirements: ['clinical-write:task', 'object-level-authorization', 'human-approval-gate'],
  failureMode: 'explicit_error',
  failureBehavior: 'Fails explicitly if review item creation fails; does not silently drop a high-risk output that requires review.',
  approved: true,
  lastVerified: '2026-08-23',
  accountable: 'CareDroid governance maintainers',
  implementationRef: 'backend/src/modules/platform-governance/',
  usageNotes: [
    'The approval gate that is SUPPOSED to block on review items is currently advisory-only at 3 of 4 call sites — review items are created but not acted on by any SPA page. This is documented as an open gap.',
    'A separate, working human-approval loop exists under workflow-orchestration/review but is unconnected to AI-generated output.',
    'Human review item creation is asserted at the unit level (ai.service.spec.ts); full HTTP/Postgres integration is open.',
  ],
});

// ---------------------------------------------------------------------------
// Audit capability
//
// Source:
//   backend/src/modules/audit/ — audit service
//   backend/src/modules/chat/ — recordEvaluationRun
//
// Audit records every AI action with human initiator, agent identity, task,
// context, capabilities invoked, authorization decisions, outputs, approvals,
// mutations, failures, and outcomes. The Chief uses audit to produce the
// execution trace the clinician sees.
// ---------------------------------------------------------------------------

registerCapability({
  id: 'service:audit',
  capabilityType: 'audit',
  name: 'CareDroid AI Audit Service',
  purpose: 'Record every AI action with full provenance: human initiator, agent identity, task, context, capabilities invoked, authorization decisions, relevant data/resource identifiers, outputs, approvals, mutations, failures, and outcomes — without indiscriminately logging sensitive payloads.',
  version: 'audit@1',
  intendedUse: 'Comprehensive agent auditability for every consequential AI action. Every action is attributable to both the human initiating authority and the software agent performing it.',
  notIntendedFor: [
    'Logging sensitive payloads or secrets indiscriminately',
    'Replacing clinical record-keeping',
    'Silent suppression of audit events',
  ],
  limitations: [
    'Audit writes are best-effort against the synchronous workflow — a failed write is logged as a warning, not surfaced to the clinician in real time.',
  ],
  modalities: ['audit', 'deterministic_rule'],
  riskClass: 'low',
  writeCategory: 'none',
  maxAutonomyLevel: 'ANALYZE',
  minAutonomyLevel: 'OBSERVE',
  requiredContext: { patientRequired: false, encounterRequired: false, tenantRequired: true, userRequired: true, crossPatient: false },
  inputSchema: { type: 'object', description: 'An AI action event: initiator, agent identity, task, context, capability invoked, outcome.' },
  outputSchema: { type: 'object', description: 'A persisted audit log entry id.' },
  dataSources: ['AI action events'],
  evidence: {
    expectedSources: ['action event payload'],
    requiresEvidence: true,
    supportsProvenance: true,
    reportsMissingData: false,
    reportsUncertainty: false,
    fabricatesWhenInsufficient: false,
  },
  responseSourceCategory: SOURCE.DETERMINISTIC_RULE,
  requiresHumanApproval: false,
  permittedRoles: [],
  tenantScope: 'platform',
  patientBinding: 'none',
  authorizationRequirements: ['audit-write'],
  failureMode: 'graceful_degradation',
  failureBehavior: 'Audit write failures are caught and logged as warnings — they must never break the synchronous workflow they are auditing. The Chief investigation runner uses auditAsync for exactly this reason.',
  approved: true,
  lastVerified: '2026-08-23',
  accountable: 'CareDroid audit maintainers',
  implementationRef: 'backend/src/modules/audit/audit.service.ts',
  usageNotes: [
    'Audit records the human initiator, agent identity, task, context, capabilities invoked, authorization decisions, outputs, approvals, mutations, failures, and outcomes.',
    'Sensitive payloads and secrets must not be logged indiscriminately — audit records identifiers and metadata, not full PHI where avoidable.',
    'Every consequential action is attributable to both the human initiating authority and the software agent performing it.',
  ],
});

// ---------------------------------------------------------------------------
// Domain context capability (the Chief's context engine)
//
// Source:
//   lib/ai/contextEngine.ts — DepartmentContext builder
//
// The context engine binds every Chief task to the correct user, patient,
// encounter, tenant, site, and workflow. It prevents stale global state from
// silently changing action ownership, handles patient switching and
// interruption/recovery, and ensures patient A's data can never leak into
// patient B's workflow.
// ---------------------------------------------------------------------------

registerCapability({
  id: 'service:context-engine',
  capabilityType: 'service',
  name: 'CareDroid Context Engine',
  purpose: 'Bind every agent task to the correct user, patient, encounter, tenant, site, and workflow. Prevent stale global state from silently changing action ownership. Handle patient switching and interruption/recovery. Ensure patient A\'s data, drafts, recommendations, tasks, or AI working memory can never leak into patient B\'s workflow.',
  version: 'context-engine@1',
  intendedUse: 'Context assembly for every Chief task — the trusted boundary between raw data and actionable, attributable, patient-bound work.',
  notIntendedFor: [
    'Serving as a global shared state that any agent can read without a bound context',
    'Caching context across patient switches without invalidation',
    'Mixing patient A and patient B context in a single task',
  ],
  limitations: [
    'Context must be re-assembled on every turn — it is not a long-lived cache the Chief can silently reuse across a patient switch.',
  ],
  modalities: ['deterministic_rule', 'retrieval'],
  riskClass: 'low',
  writeCategory: 'none',
  maxAutonomyLevel: 'ANALYZE',
  minAutonomyLevel: 'OBSERVE',
  requiredContext: { patientRequired: true, encounterRequired: false, tenantRequired: true, userRequired: true, crossPatient: false },
  inputSchema: { type: 'object', properties: { patientId: { type: 'string' } }, required: ['patientId'], description: 'Requested patient/encounter to bind context to.' },
  outputSchema: { type: 'object', description: 'A bound context object (user, patient, encounter, tenant, site, workflow) or an explicit failure if it cannot be assembled.' },
  dataSources: ['CareDroid store', 'EM context', 'department context'],
  evidence: {
    expectedSources: ['bound patient context', 'department/operational context'],
    requiresEvidence: true,
    supportsProvenance: true,
    reportsMissingData: true,
    reportsUncertainty: true,
    fabricatesWhenInsufficient: false,
  },
  responseSourceCategory: SOURCE.DETERMINISTIC_RULE,
  requiresHumanApproval: false,
  permittedRoles: [],
  tenantScope: 'tenant_only',
  patientBinding: 'required',
  authorizationRequirements: ['object-level-authorization', 'tenant-isolation', 'patient-binding'],
  failureMode: 'explicit_error',
  failureBehavior: 'When context cannot be assembled (no patient bound, stale context, missing tenant), the context engine returns an explicit failure — it does not fall back to a different patient\'s context or an uninitialized global state.',
  approved: true,
  lastVerified: '2026-08-23',
  accountable: 'CareDroid context engine maintainers',
  implementationRef: 'lib/ai/contextEngine.ts',
  usageNotes: [
    'The context engine is the FIRST capability the Chief must invoke for any patient-bound task. If context cannot be bound, the task cannot proceed.',
    'Context must be re-validated on every turn — a context assembled for patient A must not be reused for patient B after a switch without explicit re-assembly.',
    'Patient/encounter memory, operational memory, and agent working memory must be separated — the context engine does not create one uncontrolled memory store.',
  ],
});

// ---------------------------------------------------------------------------
// Intent Classifier (Nest + local MLP)
//
// Source:
//   backend/src/modules/emergency-os/intent-classifier/ — IntentClassifierService
//   backend/ml-services/unified-ai-node/ — NLU head (Xenova/all-mpnet-base-v2)
//
// Classifies free-text requests into intents. The real NLU head is a trained
// local model (NLU @ 100% on n=51 as of 2026-07-21). The keyword path enriches
// with the node. This is MODEL_PREDICTION for the trained head.
// ---------------------------------------------------------------------------

registerCapability({
  id: 'service:intent-classifier',
  capabilityType: 'service',
  name: 'CareDroid Intent Classifier',
  purpose: 'Classify free-text clinical/operational requests into structured intents so the Chief can route to the correct capability. Trained NLU head (local MLP) + keyword enrichment.',
  version: 'intent-classifier@1',
  intendedUse: 'Request classification for the copilot pipeline and Chief — turning a natural-language command into a structured intent the platform can act on.',
  notIntendedFor: [
    'Clinical diagnosis or treatment',
    'Free-form narrative generation',
    'Acting as the execution engine — classification only',
  ],
  limitations: [
    'Trained NLU head accuracy (100% on n=51 as of 2026-07-21) is measured on a small sample — not a production-scale evaluation.',
    'The keyword-enrichment path is a separate, deterministic mechanism and must not be conflated with the trained head\'s accuracy.',
  ],
  modalities: ['model_prediction'],
  riskClass: 'none',
  writeCategory: 'none',
  maxAutonomyLevel: 'ANALYZE',
  minAutonomyLevel: 'OBSERVE',
  requiredContext: { patientRequired: false, encounterRequired: false, tenantRequired: true, userRequired: true, crossPatient: false },
  inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'], description: 'Free-text request to classify into a structured intent.' },
  outputSchema: { type: 'object', description: 'A classified intent with confidence, or an explicit unrecognized-intent result.' },
  dataSources: ['query input', 'trained NLU model (local MLP)', 'keyword fixtures'],
  evidence: {
    expectedSources: ['query input'],
    requiresEvidence: false,
    supportsProvenance: true,
    reportsMissingData: false,
    reportsUncertainty: false,
    fabricatesWhenInsufficient: false,
  },
  responseSourceCategory: SOURCE.MODEL_PREDICTION, // trained NLU head
  requiresHumanApproval: false,
  permittedRoles: [],
  tenantScope: 'tenant_only',
  patientBinding: 'none',
  authorizationRequirements: ['clinical-read'],
  failureMode: 'explicit_error',
  failureBehavior: 'Returns an unrecognized-intent result when the input does not match any known intent — does not fabricate a best-guess intent.',
  approved: true,
  lastVerified: '2026-08-23',
  accountable: 'CareDroid AI node maintainers',
  implementationRef: 'backend/src/modules/emergency-os/intent-classifier/',
  usageNotes: [
    'The trained NLU head (local MLP) is MODEL_PREDICTION — it has a real, measured accuracy (100% on n=51 as of 2026-07-21). The keyword path is DETERMINISTIC_RULE.',
    'Intent classification is routing, not execution — the Chief must still invoke the appropriate capability for the classified intent.',
    'Intents outside the trained set must not be silently mapped to a nearest intent without explicit uncertainty labeling.',
  ],
});

// ---------------------------------------------------------------------------
// MoE Router / expert selector
//
// Source:
//   backend/src/modules/moe-router/ — MoERouterService.createRoutePlan()
//   lib/native-ai/panelOfExpertsRouter.ts — frontend-only, never reaches backend
//
// Real, wired expert selection. Note: 4 independent selection systems exist;
// only 2 agree (MoERouter + RoutingOptimizer). The panelOfExpertsRouter is
// frontend-only.
// ---------------------------------------------------------------------------

registerCapability({
  id: 'service:moe-router',
  capabilityType: 'service',
  name: 'MoE Router / Expert Selector',
  purpose: 'Select the appropriate expert/specialist for a given request — the real, wired expert-selection system the copilot pipeline uses.',
  version: 'moe-router@1',
  intendedUse: 'Expert selection for the copilot pipeline — choosing which model/specialist responds to a given request based on task type and context.',
  notIntendedFor: [
    'Acting as the sole model selection authority when RoutingOptimizer independently re-picks',
    'Representing the frontend-only panelOfExpertsRouter (which never reaches the backend)',
    'Bypassing the capability registry for discovery',
  ],
  limitations: [
    '4 independent model/expert-selection systems remain live; only MoERouter and RoutingOptimizer agree — reconciliation is an open task.',
  ],
  modalities: ['deterministic_rule', 'heuristic'],
  riskClass: 'none',
  writeCategory: 'none',
  maxAutonomyLevel: 'ANALYZE',
  minAutonomyLevel: 'OBSERVE',
  requiredContext: { patientRequired: false, encounterRequired: false, tenantRequired: true, userRequired: true, crossPatient: false },
  inputSchema: { type: 'object', description: 'Task type and context used to select an expert/specialist route.' },
  outputSchema: { type: 'object', description: 'A route plan naming the selected expert, or an explicit no-match.' },
  dataSources: ['request input', 'expert catalog'],
  evidence: {
    expectedSources: ['request input', 'expert catalog'],
    requiresEvidence: false,
    supportsProvenance: true,
    reportsMissingData: false,
    reportsUncertainty: true,
    fabricatesWhenInsufficient: false,
  },
  responseSourceCategory: SOURCE.DETERMINISTIC_RULE,
  requiresHumanApproval: false,
  permittedRoles: [],
  tenantScope: 'tenant_only',
  patientBinding: 'none',
  authorizationRequirements: ['clinical-read'],
  failureMode: 'explicit_error',
  failureBehavior: 'Returns a route plan or an explicit no-match — does not fabricate a specialist selection.',
  approved: true,
  lastVerified: '2026-08-23',
  accountable: 'CareDroid MoE router maintainers',
  implementationRef: 'backend/src/modules/moe-router/moe-router.service.ts',
  usageNotes: [
    'MoERouter is the real, wired expert selector. RoutingOptimizer independently re-picks a model AFTER MoE already chose — nothing reconciles the two.',
    'The panelOfExpertsRouter (lib/native-ai/panelOfExpertsRouter.ts) is frontend-only and never reaches the backend — it must not be treated as a live routing capability.',
    '4 independent selection systems remain live; reconciliation is an open task.',
  ],
});

// ---------------------------------------------------------------------------
// Registered tools inventory
//
// A convenience capability that aggregates the tool registry for the Chief's
// discovery — not a new tool, just a declaration that the tool fabric exists.
// ---------------------------------------------------------------------------

registerCapability({
  id: 'fabric:tool-registry',
  capabilityType: 'service',
  name: 'CareDroid Tool Registry Fabric',
  purpose: 'The live set of emergency tools (10 today) that the copilot and Chief can invoke — read-only tools and mutating tools that produce pending actions requiring confirmation.',
  version: 'tool-registry@1',
  intendedUse: 'Tool discovery and invocation for the copilot and Chief — the fabric behind the emergency-tool capabilities registered above.',
  notIntendedFor: [
    'Representing mutating tools as auto-executing',
    'Invoking tools without patient/context binding where required',
  ],
  limitations: [
    'This is an aggregate declaration — risk, write category, and autonomy vary per individual tool:* capability; consult those, not this fabric record, before invoking.',
  ],
  modalities: ['retrieval', 'workflow', 'communication'],
  riskClass: 'moderate',
  writeCategory: 'patient_state', // aggregate — individual tools vary
  maxAutonomyLevel: 'PREPARE',
  minAutonomyLevel: 'OBSERVE',
  requiredContext: { patientRequired: true, encounterRequired: false, tenantRequired: true, userRequired: true, crossPatient: false },
  inputSchema: { type: 'object', description: 'A tool id plus its declared arguments; see the individual tool:* capabilities.' },
  outputSchema: { type: 'object', description: 'Aggregate — see the individual tool:* capabilities for their specific output shape.' },
  dataSources: ['CareDroid store (frontend state)'],
  evidence: {
    expectedSources: ['tool input', 'store state'],
    requiresEvidence: false,
    supportsProvenance: true,
    reportsMissingData: false,
    reportsUncertainty: false,
    fabricatesWhenInsufficient: false,
  },
  responseSourceCategory: SOURCE.TOOL_RESULT,
  requiresHumanApproval: true,
  permittedRoles: [],
  tenantScope: 'tenant_only',
  patientBinding: 'required',
  authorizationRequirements: ['clinical-read', 'clinical-write', 'human-approval-gate'],
  failureMode: 'explicit_error',
  failureBehavior: 'Unknown tools return an explicit error. Mutating tools return pending actions, not mutations. Read-only tools return data or an explicit error.',
  approved: true,
  lastVerified: '2026-08-23',
  accountable: 'CareDroid tool registry maintainers',
  implementationRef: 'lib/ai/toolRegistry.ts',
  usageNotes: [
    'This fabric is the parent of the individual tool capabilities registered above. The Chief queries individual tools through their capability ids.',
    'Mutating tools NEVER execute automatically — they return a pending action that requires human confirmation via applyConfirmedToolAction().',
  ],
  childIds: EM_TOOLS.map((e) => e.id),
});

// ---------------------------------------------------------------------------
// Capability graph — the aggregate declaration
//
// This capability is the entry point for the Chief's discovery. It declares
// that the registry itself is a discoverable capability, and that the Chief
// should query through it rather than reaching into the backend directly.
// ---------------------------------------------------------------------------

registerCapability({
  id: 'fabric:capability-registry',
  capabilityType: 'service',
  name: 'CareDroid Capability Registry',
  purpose: 'The first-class Agent/Capability Registry — every model, agent, calculator, service, API, data source, and device declares its identity, purpose, version, modality, input/output schema, required context, data sources, provenance, reliability, limitations, risk class, permissions, reversibility, authorization requirements, patient/encounter requirements, tenant scope, human-approval requirement, audit requirements, and failure behavior here.',
  version: 'capability-registry@1',
  intendedUse: 'The Chief\'s discovery fabric — query by task, context, risk, and autonomy level to find available capabilities WITHOUT receiving arbitrary access to the backend.',
  notIntendedFor: [
    'Granting the model direct unrestricted database/API privileges',
    'Replacing authorization checks with registry lookups',
    'Allowing capabilities to be invoked without going through their declared contracts',
  ],
  limitations: [
    'The registry describes capabilities honestly but does not itself enforce authorization — invocation-time authorization checks remain the responsibility of each capability\'s own implementation.',
  ],
  modalities: ['deterministic_rule', 'retrieval'],
  riskClass: 'none',
  writeCategory: 'none',
  maxAutonomyLevel: 'ANALYZE',
  minAutonomyLevel: 'OBSERVE',
  requiredContext: { patientRequired: false, encounterRequired: false, tenantRequired: true, userRequired: true, crossPatient: false },
  inputSchema: { type: 'object', description: 'A RegistryQuery — task keywords, risk ceiling, autonomy level, context match, etc. (see queryCapabilities in capabilityRegistry.ts).' },
  outputSchema: { type: 'object', description: 'Matching CapabilityRecord entries ranked by fit — never arbitrary backend access.' },
  dataSources: ['registry records'],
  evidence: {
    expectedSources: ['registry query'],
    requiresEvidence: false,
    supportsProvenance: true,
    reportsMissingData: false,
    reportsUncertainty: false,
    fabricatesWhenInsufficient: false,
  },
  responseSourceCategory: SOURCE.DETERMINISTIC_RULE,
  requiresHumanApproval: false,
  permittedRoles: [],
  tenantScope: 'platform',
  patientBinding: 'none',
  authorizationRequirements: ['registry-read'],
  failureMode: 'explicit_error',
  failureBehavior: 'Returns the registered capabilities or an explicit error — the registry is always available (it is in-process), but individual capabilities it points to may be UNAVAILABLE.',
  approved: true,
  lastVerified: '2026-08-23',
  accountable: 'CareDroid platform maintainers',
  implementationRef: 'lib/ai/capabilityRegistry.ts',
  usageNotes: [
    'This is the PRIMARY interface between the Chief and the capability fabric. The Chief never reaches into the backend directly — it asks the registry what is available, then invokes through the selected capability\'s declared contract.',
    'Every invocation path through this registry must bind to the explicit context the Chief assembled for the current task, and must re-validate authorization on each call.',
    'The Chief does NOT get arbitrary access to the backend. It discovers available capabilities through this registry, filtered by task, context, risk, and policy.',
  ],
});
