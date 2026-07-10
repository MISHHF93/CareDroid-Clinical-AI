/**
 * Tool orchestrator registry — canonical executor IDs, aliases, and frontend contract maps.
 *
 * Drift tests in frontend `clinicalToolIdContract.test.js` parse this file.
 * Do not register tools here; only `tool-orchestrator.service.ts` calls registerTool().
 */

export const REGISTERED_EXECUTOR_TOOL_IDS = [
  'sofa-calculator',
  'drug-interactions',
  'lab-interpreter',
  'heart-score',
  'cha2ds2vasc-calculator',
  'wells-pe',
  'shock-index',
  'apache2-calculator',
  'anion-gap',
  'aa-gradient',
  'news2',
  'abcd2',
  'canadian-c-spine',
  'nexus-cspine',
  'gcs-calculator',
] as const;

export type RegisteredExecutorToolId = (typeof REGISTERED_EXECUTOR_TOOL_IDS)[number];

/** Legacy / NLU aliases accepted at POST /tools/:id/execute (resolved to canonical ids). */
export const EXECUTOR_ID_ALIASES: Readonly<Record<string, RegisteredExecutorToolId>> = {
  'drug-interaction-checker': 'drug-interactions',
};

/** Legacy LLM function names retained only for old tool_use payload normalization. */
export const LEGACY_LLM_TOOL_NAME_TO_EXECUTOR: Readonly<Record<string, RegisteredExecutorToolId>> =
  {
    sofa_calculator: 'sofa-calculator',
    drug_checker: 'drug-interactions',
    lab_interpreter: 'lab-interpreter',
  };

/**
 * Sidebar registry id → canonical executor id (mirrors frontend REGISTRY_ID_TO_ORCHESTRATOR_TOOL).
 */
export const REGISTRY_ID_TO_EXECUTOR_TOOL_ID: Readonly<Record<string, RegisteredExecutorToolId>> = {
  'drug-check': 'drug-interactions',
  'lab-interp': 'lab-interpreter',
  'sofa-score': 'sofa-calculator',
};

export enum ToolExecutionErrorCode {
  TOOL_NOT_FOUND = 'TOOL_NOT_FOUND',
  UNSUPPORTED_TOOL = 'UNSUPPORTED_TOOL',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  INVALID_REQUEST = 'INVALID_REQUEST',
  EXECUTION_FAILED = 'EXECUTION_FAILED',
}

/**
 * NLU tool ids that appear in intent routing but have no registerTool() executor.
 * Used for structured UNSUPPORTED_TOOL responses (not fake executors).
 */
export const NLU_TOOL_IDS_WITHOUT_EXECUTOR = [
  'abg-interpreter',
  'acls-protocol',
  'acs-workflow-assistant',
  'adjusted-body-weight',
  'ai-artifacts',
  'ai-command-center',
  'ai-cost-optimization',
  'ai-evaluation',
  'ai-gateway',
  'ai-governance',
  'ai-memory',
  'ai-rag',
  'ai-security',
  'ai-tool-calling',
  'ai-training',
  'aki-staging-assistant',
  'antibiotic-guide',
  'apgar-score',
  'apri',
  'arrhythmia-risk-classifier',
  'ascvd-risk',
  'asthma-exacerbation-assistant',
  'asthma-severity-score',
  'atls-protocol',
  'atrial-fibrillation-assistant',
  'audit-c',
  'bed-occupancy-calculator',
  'behavioral-analytics-dashboard',
  'bisap-score',
  'bishop-score',
  'bode-index',
  'braden-scale',
  'bsa',
  'bun-creatinine-ratio',
  'cage',
  'calculator-recommender-ai',
  'cardiac-telemetry-analyzer',
  'cardiology-command-center',
  'competency-dashboard',
  'centor-mcisaac',
  'chads2',
  'child-pugh',
  'cirrhosis-monitoring-engine',
  'clinical-decision-support',
  'clinical-documentation-assistant',
  'clinical-knowledge-graph',
  'ckd-progression-predictor',
  'ckd-staging',
  'cognitive-screening-assistant',
  'columbia-suicide-severity-workflow',
  'continuous-glucose-command-center',
  'copd-gold',
  'copd-gold-assessment',
  'copd-workflow-assistant',
  'competency-platform',
  'corrected-calcium',
  'corrected-sodium',
  'creatinine-clearance-cg',
  'credentialing-platform',
  'crisis-escalation-audit-log',
  'curb65-calculator',
  'device-recommendation-assistant',
  'diabetes-care-assistant',
  'dialysis-readiness-helper',
  'dialysis-utilization-tracker',
  'differential-ai',
  'differential-diagnosis',
  'debrief-dashboard',
  'dispatch-ai',
  'dka-pathway-assistant',
  'dose-calculator',
  'duke-treadmill-score',
  'ecg-interpretation-assistant',
  'ecg-trend-engine',
  'eeg-trend-dashboard',
  'egfr-ckd-epi',
  'electrolyte-disorder-assistant',
  'electrolyte-trend-engine',
  'endocrine-monitoring-system',
  'endoscopy-workflow-assistant',
  'epworth-sleepiness-scale',
  'fena',
  'fenton-growth-chart-helper',
  'feurea',
  'fib4',
  'digital-operations-center',
  'fleet-command',
  'fluid-balance-monitor',
  'four-score',
  'framingham-risk',
  'free-water-deficit',
  'gad7',
  'gestational-age-calculator',
  'gi-bleed-workflow-assistant',
  'gi-command-center',
  'gi-surveillance-dashboard',
  'glasgow-blatchford-score',
  'glucose-telemetry-dashboard',
  'grace-acs',
  'growth-trend-analytics',
  'has-bled',
  'hcm-sudden-death-risk',
  'headache-red-flag-assistant',
  'heart-failure-assistant',
  'heart-failure-staging',
  'hepatic-trend-analytics',
  'homa-ir',
  'hospital-command-assistant',
  'hunt-hess-scale',
  'ich-score',
  'ideal-body-weight',
  'insulin-trend-engine',
  'kfre',
  'laboratory-dashboard',
  'liver-disease-assistant',
  'maddrey-discriminant-function',
  'maternal-monitoring-dashboard',
  'mdq',
  'medical-3d-viewer',
  'meld',
  'meld-na',
  'mental-health-screening-assistant',
  'metabolic-analytics',
  'metabolic-syndrome-assistant',
  'mews',
  'mmse',
  'moca-placeholder-workflow',
  'modified-rankin-scale',
  'moe-router',
  'morse-fall-scale',
  'neonatal-assessment-assistant',
  'neonatal-bilirubin-risk-helper',
  'neonatal-dashboard',
  'neuro-exam-assistant',
  'neuro-monitoring-engine',
  'neuro-telemetry-dashboard',
  'neurology-timeline-ai',
  'nihss',
  'nihss-summary-view',
  'ob-triage-assistant',
  'osmolal-gap',
  'ottawa-ankle',
  'oxygen-escalation-helper',
  'pancreatitis-workflow-assistant',
  'pao2-fio2-ratio',
  'pcl5',
  'pecarn-head',
  'pediatric-bp-percentile',
  'pediatric-command-center',
  'pediatric-dose-safety-checker',
  'pediatric-gcs',
  'pediatric-sepsis-assistant',
  'perc',
  'perinatal-risk-dashboard',
  'pews',
  'phq9',
  'pneumonia-severity-index',
  'population-screening-dashboard',
  'predictive-analytics-dashboard',
  'predictive-maintenance',
  'pregnancy-due-date-calculator',
  'pregnancy-workflow-assistant',
  'procedures',
  'protocol-lookup',
  'psychiatry-monitoring-dashboard',
  'pulmonary-trend-engine',
  'qsofa',
  'ranson-criteria',
  'rass',
  'remote-cardiology-monitoring-dashboard',
  'renal-monitoring-dashboard',
  'research-evidence-hub',
  'resource-allocation-assistant',
  'resource-utilization-index',
  'respiratory-command-center',
  'respiratory-telemetry-dashboard',
  'revised-trauma-score',
  'reynolds-risk-score',
  'rockall-score',
  'rome-iv-ibs',
  'route-optimizer',
  'rox-index',
  'screening-trend-engine',
  'seizure-assistant',
  'serum-osmolality',
  'scenario-player',
  'simulation-outcomes',
  'simulation-suite',
  'sleep-apnea-analytics',
  'staffing-ratio-calculator',
  'stemi-pathway-assistant',
  'stop-bang',
  'stroke-command-center',
  'stroke-workflow-assistant',
  'substance-use-screening-assistant',
  'suicide-risk-workflow-assistant',
  'thyroid-disorder-assistant',
  'timi-ua-nstemi',
  'turnaround-time-calculator',
  'ventilator-monitoring-dashboard',
  'ventilator-support-assistant',
  'vertigo-hints-assistant',
  'waist-hip-ratio',
  'wells-dvt-calculator',
] as const;

export interface ExecutorRequestContract {
  toolId: RegisteredExecutorToolId;
  requiredParameters: string[];
  optionalParameters: string[];
  responseDataKeys: string[];
  deterministic: boolean;
}

export const EXECUTOR_PARAMETER_ALIASES: Readonly<
  Record<RegisteredExecutorToolId, Readonly<Record<string, string>>>
> = {
  'sofa-calculator': {
    mechanical_ventilation: 'mechanicalVentilation',
    urine_output: 'urineOutput',
  },
  'drug-interactions': {
    severity_filter: 'severityFilter',
  },
  'lab-interpreter': {
    lab_values: 'labValues',
    patient_age: 'patientAge',
    patient_sex: 'patientSex',
    clinical_context: 'clinicalContext',
  },
  'heart-score': {},
  'cha2ds2vasc-calculator': {},
  'wells-pe': {},
  'shock-index': {
    heart_rate: 'heartRate',
    systolic_bp: 'systolicBp',
  },
  'apache2-calculator': {
    acute_renal_failure: 'acuteRenalFailure',
  },
  'anion-gap': {},
  'aa-gradient': {
    age_years: 'ageYears',
    fio2_pct: 'fio2Pct',
    pao2_mm_hg: 'pao2MmHg',
    paco2_mm_hg: 'paco2MmHg',
    atmospheric_pressure_mm_hg: 'atmosphericPressureMmHg',
    respiratory_quotient: 'respiratoryQuotient',
  },
  news2: {
    respiratory_rate: 'respiratoryRate',
    spo2_scale: 'spo2Scale',
    supplemental_oxygen: 'supplementalOxygen',
    systolic_bp: 'systolicBp',
    new_confusion: 'newConfusion',
  },
  abcd2: {
    age60_or_older: 'age60OrOlder',
    systolic_bp_mm_hg: 'systolicBpMmHg',
    diastolic_bp_mm_hg: 'diastolicBpMmHg',
    clinical_feature: 'clinicalFeature',
    duration_band: 'durationBand',
  },
  'canadian-c-spine': {
    age65_or_older: 'age65OrOlder',
    dangerous_mechanism: 'dangerousMechanism',
    paresthesias_in_extremities: 'paresthesiasInExtremities',
    simple_rear_end_mvc: 'simpleRearEndMvc',
    sitting_in_ed: 'sittingInEd',
    ambulatory_at_any_time: 'ambulatoryAtAnyTime',
    delayed_neck_pain_onset: 'delayedNeckPainOnset',
    no_midline_cervical_tenderness: 'noMidlineCervicalTenderness',
    no_distracting_painful_injury: 'noDistractingPainfulInjury',
    active_rotation_left45: 'activeRotationLeft45',
    active_rotation_right45: 'activeRotationRight45',
  },
  'nexus-cspine': {
    midline_tenderness: 'midlineTenderness',
    neurologic_deficit: 'neurologicDeficit',
    distracting_injury: 'distractingInjury',
    normal_alertness: 'normalAlertness',
  },
  'gcs-calculator': {},
};

/** Request/response contracts for registered executors (documentation + validation hints). */
export const EXECUTOR_REQUEST_CONTRACTS: Readonly<
  Record<RegisteredExecutorToolId, ExecutorRequestContract>
> = {
  'sofa-calculator': {
    toolId: 'sofa-calculator',
    requiredParameters: [],
    optionalParameters: [
      'pao2',
      'fio2',
      'mechanicalVentilation',
      'platelets',
      'bilirubin',
      'map',
      'dopamine',
      'dobutamine',
      'epinephrine',
      'norepinephrine',
      'gcs',
      'creatinine',
      'urineOutput',
    ],
    responseDataKeys: [
      'totalScore',
      'respirationScore',
      'coagulationScore',
      'liverScore',
      'cardiovascularScore',
      'cnsScore',
      'renalScore',
      'mortalityEstimate',
    ],
    deterministic: true,
  },
  'drug-interactions': {
    toolId: 'drug-interactions',
    requiredParameters: ['medications'],
    optionalParameters: ['severityFilter'],
    responseDataKeys: ['interactions', 'summary'],
    deterministic: false,
  },
  'lab-interpreter': {
    toolId: 'lab-interpreter',
    requiredParameters: ['labValues'],
    optionalParameters: ['patientAge', 'patientSex', 'clinicalContext'],
    responseDataKeys: ['summary', 'criticalValues', 'interpretations'],
    deterministic: false,
  },
  'heart-score': {
    toolId: 'heart-score',
    requiredParameters: ['history', 'ecg', 'age', 'riskFactors', 'troponin'],
    optionalParameters: [],
    responseDataKeys: [
      'totalScore',
      'riskCategory',
      'riskCategoryLabel',
      'riskBand',
      'maceContext',
    ],
    deterministic: true,
  },
  'cha2ds2vasc-calculator': {
    toolId: 'cha2ds2vasc-calculator',
    requiredParameters: ['age', 'sex'],
    optionalParameters: ['chf', 'hypertension', 'diabetes', 'stroke', 'vascular'],
    responseDataKeys: ['score', 'severity', 'recommendation'],
    deterministic: true,
  },
  'wells-pe': {
    toolId: 'wells-pe',
    requiredParameters: [
      'clinicalDvtSigns',
      'peMostLikelyDiagnosis',
      'heartRateOver100',
      'immobilizationOrSurgery',
      'previousDvtOrPe',
      'hemoptysis',
      'malignancy',
    ],
    optionalParameters: [],
    responseDataKeys: ['score', 'breakdown', 'probabilityBand'],
    deterministic: true,
  },
  'shock-index': {
    toolId: 'shock-index',
    requiredParameters: ['heartRate', 'systolicBp'],
    optionalParameters: [],
    responseDataKeys: ['index', 'riskCategory', 'label'],
    deterministic: true,
  },
  'apache2-calculator': {
    toolId: 'apache2-calculator',
    requiredParameters: [
      'temperature',
      'map',
      'heartRate',
      'respiratoryRate',
      'oxygenation',
      'acidBase',
      'sodium',
      'potassium',
      'creatinine',
      'hematocrit',
      'wbc',
      'age',
      'chronicHealth',
      'gcs',
    ],
    optionalParameters: ['acuteRenalFailure'],
    responseDataKeys: [
      'total',
      'acutePhysiology',
      'gcsContribution',
      'renalAdjustment',
      'riskCategory',
    ],
    deterministic: true,
  },
  'anion-gap': {
    toolId: 'anion-gap',
    requiredParameters: ['sodium', 'chloride', 'bicarbonate'],
    optionalParameters: ['albumin'],
    responseDataKeys: ['anionGap', 'correctedAnionGap', 'riskCategory'],
    deterministic: true,
  },
  'aa-gradient': {
    toolId: 'aa-gradient',
    requiredParameters: ['ageYears', 'fio2Pct', 'pao2MmHg', 'paco2MmHg'],
    optionalParameters: ['atmosphericPressureMmHg', 'respiratoryQuotient'],
    responseDataKeys: ['alveolarOxygen', 'gradient', 'expectedUpperLimit', 'elevated'],
    deterministic: true,
  },
  news2: {
    toolId: 'news2',
    requiredParameters: [
      'respiratoryRate',
      'spo2',
      'spo2Scale',
      'systolicBp',
      'pulse',
      'temperature',
    ],
    optionalParameters: ['supplementalOxygen', 'newConfusion'],
    responseDataKeys: ['total', 'breakdown', 'spo2ScaleUsed', 'riskBand', 'hasRed'],
    deterministic: true,
  },
  abcd2: {
    toolId: 'abcd2',
    requiredParameters: ['systolicBpMmHg', 'diastolicBpMmHg', 'clinicalFeature', 'durationBand'],
    optionalParameters: ['age60OrOlder', 'diabetes'],
    responseDataKeys: ['score', 'riskCategory', 'strokeRiskContext'],
    deterministic: true,
  },
  'canadian-c-spine': {
    toolId: 'canadian-c-spine',
    requiredParameters: [],
    optionalParameters: [
      'age65OrOlder',
      'dangerousMechanism',
      'paresthesiasInExtremities',
      'simpleRearEndMvc',
      'sittingInEd',
      'ambulatoryAtAnyTime',
      'delayedNeckPainOnset',
      'noMidlineCervicalTenderness',
      'noDistractingPainfulInjury',
      'activeRotationLeft45',
      'activeRotationRight45',
    ],
    responseDataKeys: ['imagingIndicatedByRule', 'branch', 'romAssessed'],
    deterministic: true,
  },
  'nexus-cspine': {
    toolId: 'nexus-cspine',
    requiredParameters: [],
    optionalParameters: [
      'midlineTenderness',
      'intoxication',
      'neurologicDeficit',
      'distractingInjury',
      'normalAlertness',
    ],
    responseDataKeys: ['imagingIndicatedByRule', 'lowRiskByRule', 'triggeredCriteria'],
    deterministic: true,
  },
  'gcs-calculator': {
    toolId: 'gcs-calculator',
    requiredParameters: ['eye', 'verbal', 'motor'],
    optionalParameters: [],
    responseDataKeys: ['score', 'riskCategory', 'label'],
    deterministic: true,
  },
};

export interface UnsupportedOrchestratorToolDoc {
  nluToolId: string;
  registryId?: string;
  reason: string;
  frontendSurface: 'chat-assisted' | 'calculator-form' | 'clinical-page' | 'fleet';
}

/** Documented frontend-only / chat-only tools (no backend registerTool). */
export const UNSUPPORTED_ORCHESTRATOR_TOOL_DOCS: readonly UnsupportedOrchestratorToolDoc[] =
  NLU_TOOL_IDS_WITHOUT_EXECUTOR.map((nluToolId) => ({
    nluToolId,
    reason:
      nluToolId === 'dispatch-ai'
        ? 'Chat/NLU routing only; no POST /tools/:id/execute handler.'
        : 'Client-side calculator or chat-assisted workflow; no tool-orchestrator executor.',
    frontendSurface:
      nluToolId === 'dispatch-ai'
        ? ('chat-assisted' as const)
        : nluToolId.includes('fleet') ||
            nluToolId === 'route-optimizer' ||
            nluToolId === 'predictive-maintenance' ||
            nluToolId.includes('resource-allocation') ||
            nluToolId.includes('hospital-command') ||
            nluToolId.includes('device-recommendation')
          ? ('fleet' as const)
          : nluToolId.includes('protocol') ||
              nluToolId.includes('diagnosis') ||
              nluToolId.includes('antibiotic')
            ? ('clinical-page' as const)
            : ('calculator-form' as const),
  }));

const REGISTERED_SET = new Set<string>(REGISTERED_EXECUTOR_TOOL_IDS);
const UNSUPPORTED_SET = new Set<string>(NLU_TOOL_IDS_WITHOUT_EXECUTOR);

export function resolveExecutorToolId(toolId: string): {
  resolvedId: RegisteredExecutorToolId;
  aliased: boolean;
  requestedId: string;
} | null {
  if (!toolId || typeof toolId !== 'string') {
    return null;
  }
  const requestedId = toolId.trim();
  if (!requestedId) {
    return null;
  }

  if (REGISTERED_SET.has(requestedId)) {
    return {
      requestedId,
      resolvedId: requestedId as RegisteredExecutorToolId,
      aliased: false,
    };
  }

  const aliasTarget = EXECUTOR_ID_ALIASES[requestedId];
  if (aliasTarget) {
    return { requestedId, resolvedId: aliasTarget, aliased: true };
  }

  const fromRegistry = REGISTRY_ID_TO_EXECUTOR_TOOL_ID[requestedId];
  if (fromRegistry) {
    return { requestedId, resolvedId: fromRegistry, aliased: true };
  }

  return null;
}

export function resolveLegacyLlmToolName(toolName: string): RegisteredExecutorToolId | null {
  return LEGACY_LLM_TOOL_NAME_TO_EXECUTOR[String(toolName || '').trim()] ?? null;
}

export function classifyToolExecutionError(toolId: string): ToolExecutionErrorCode {
  const id = toolId?.trim() ?? '';
  if (UNSUPPORTED_SET.has(id)) {
    return ToolExecutionErrorCode.UNSUPPORTED_TOOL;
  }
  if (id in EXECUTOR_ID_ALIASES || id in REGISTRY_ID_TO_EXECUTOR_TOOL_ID) {
    return ToolExecutionErrorCode.TOOL_NOT_FOUND;
  }
  return ToolExecutionErrorCode.TOOL_NOT_FOUND;
}

/**
 * Executor mapping audit (2026-05) — single source for drift tests and ops reference.
 */
export const EXECUTOR_MAPPING_AUDIT = {
  registeredExecutorCount: REGISTERED_EXECUTOR_TOOL_IDS.length,
  registeredExecutorToolIds: [...REGISTERED_EXECUTOR_TOOL_IDS],
  registryIdToExecutor: { ...REGISTRY_ID_TO_EXECUTOR_TOOL_ID },
  executorAliases: { ...EXECUTOR_ID_ALIASES },
  frontendContract: 'src/data/clinicalToolIdContract.js REGISTRY_ID_TO_ORCHESTRATOR_TOOL',
  unsupportedDoc: 'src/data/unsupportedOrchestratorTools.js',
} as const;

export function validateExecutorRequestPayload(parameters: unknown): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (parameters === null || parameters === undefined) {
    errors.push('parameters is required');
  } else if (typeof parameters !== 'object' || Array.isArray(parameters)) {
    errors.push('parameters must be a plain object');
  }
  return { valid: errors.length === 0, errors };
}

function hasRequiredParameterValue(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string' && !value.trim()) return false;
  if (Array.isArray(value) && value.length === 0) return false;
  return true;
}

export function normalizeExecutorParameters(
  resolvedId: RegisteredExecutorToolId,
  parameters: Record<string, unknown>,
): Record<string, unknown> {
  const aliases = EXECUTOR_PARAMETER_ALIASES[resolvedId] || {};
  const normalized = { ...parameters };

  for (const [alias, canonical] of Object.entries(aliases)) {
    if (alias in normalized && !(canonical in normalized)) {
      normalized[canonical] = normalized[alias];
    }
    delete normalized[alias];
  }

  return normalized;
}

/**
 * Contract-level validation before tool-specific validate() (deterministic SOFA + required fields).
 */
export function validateExecutorContractParameters(
  resolvedId: RegisteredExecutorToolId,
  parameters: Record<string, unknown>,
): { valid: boolean; errors: string[] } {
  const contract = EXECUTOR_REQUEST_CONTRACTS[resolvedId];
  const normalizedParameters = normalizeExecutorParameters(resolvedId, parameters);
  const errors: string[] = [];

  for (const key of contract.requiredParameters) {
    if (!hasRequiredParameterValue(normalizedParameters[key])) {
      errors.push(`Missing required parameter: ${key}`);
    }
  }

  if (resolvedId === 'drug-interactions' && Array.isArray(normalizedParameters.medications)) {
    const meds = normalizedParameters.medications as unknown[];
    if (meds.some((m) => typeof m !== 'string' || !String(m).trim())) {
      errors.push('medications must be an array of non-empty drug name strings');
    }
  }

  if (resolvedId === 'lab-interpreter' && Array.isArray(normalizedParameters.labValues)) {
    const labs = normalizedParameters.labValues as unknown[];
    if (labs.length === 0) {
      errors.push('labValues must be a non-empty array');
    }
  }

  return { valid: errors.length === 0, errors };
}

export function isKnownUnsupportedNluTool(toolId: string): boolean {
  return UNSUPPORTED_SET.has(String(toolId || '').trim());
}

export function getExecutorCatalogSnapshot() {
  return {
    audit: EXECUTOR_MAPPING_AUDIT,
    contracts: EXECUTOR_REQUEST_CONTRACTS,
    parameterAliases: EXECUTOR_PARAMETER_ALIASES,
    registeredExecutorToolIds: [...REGISTERED_EXECUTOR_TOOL_IDS],
    registryIdToExecutor: { ...REGISTRY_ID_TO_EXECUTOR_TOOL_ID },
    executorAliases: { ...EXECUTOR_ID_ALIASES },
    unsupportedTools: [...UNSUPPORTED_ORCHESTRATOR_TOOL_DOCS],
  };
}
