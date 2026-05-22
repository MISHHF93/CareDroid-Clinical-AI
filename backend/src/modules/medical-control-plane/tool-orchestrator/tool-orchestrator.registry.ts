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
] as const;

export type RegisteredExecutorToolId = (typeof REGISTERED_EXECUTOR_TOOL_IDS)[number];

/** Legacy / NLU aliases accepted at POST /tools/:id/execute (resolved to canonical ids). */
export const EXECUTOR_ID_ALIASES: Readonly<Record<string, RegisteredExecutorToolId>> = {
  'drug-interaction-checker': 'drug-interactions',
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
  'dispatch-ai',
  'calculator-recommender-ai',
  'qsofa',
  'news2',
  'child-pugh',
  'has-bled',
  'meld',
  'meld-na',
  'timi-ua-nstemi',
  'ascvd-risk',
  'ckd-staging',
  'stop-bang',
  'audit-c',
  'phq9',
  'gad7',
  'heart-score',
  'centor-mcisaac',
  'bishop-score',
  'apgar-score',
  'braden-scale',
  'morse-fall-scale',
  'ranson-criteria',
  'bisap-score',
  'fib4',
  'framingham-risk',
  'apache2-calculator',
  'cha2ds2vasc-calculator',
  'curb65-calculator',
  'gcs-calculator',
  'wells-dvt-calculator',
  'wells-pe',
  'perc',
  /** Tier-B chat; deterministic scoring in `graceAcsCalculator.js` — Tier C candidate if execute API required */
  'grace-acs',
  'nihss',
  'canadian-c-spine',
  'ottawa-ankle',
  'pecarn-head',
  'nexus-cspine',
  'abcd2',
  'shock-index',
  'anion-gap',
  'rass',
  'copd-gold',
  'rome-iv-ibs',
  'dose-calculator',
  'abg-interpreter',
  'protocol-lookup',
  'acls-protocol',
  'atls-protocol',
  'route-optimizer',
  'predictive-maintenance',
  'fleet-command',
  'differential-diagnosis',
  'differential-ai',
  'antibiotic-guide',
  'procedures',
] as const;

export interface ExecutorRequestContract {
  toolId: RegisteredExecutorToolId;
  requiredParameters: string[];
  optionalParameters: string[];
  responseDataKeys: string[];
  deterministic: boolean;
}

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
            nluToolId === 'predictive-maintenance'
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

/**
 * Contract-level validation before tool-specific validate() (deterministic SOFA + required fields).
 */
export function validateExecutorContractParameters(
  resolvedId: RegisteredExecutorToolId,
  parameters: Record<string, unknown>,
): { valid: boolean; errors: string[] } {
  const contract = EXECUTOR_REQUEST_CONTRACTS[resolvedId];
  const errors: string[] = [];

  for (const key of contract.requiredParameters) {
    if (!hasRequiredParameterValue(parameters[key])) {
      errors.push(`Missing required parameter: ${key}`);
    }
  }

  if (resolvedId === 'drug-interactions' && Array.isArray(parameters.medications)) {
    const meds = parameters.medications as unknown[];
    if (meds.some((m) => typeof m !== 'string' || !String(m).trim())) {
      errors.push('medications must be an array of non-empty drug name strings');
    }
  }

  if (resolvedId === 'lab-interpreter' && Array.isArray(parameters.labValues)) {
    const labs = parameters.labValues as unknown[];
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
    registeredExecutorToolIds: [...REGISTERED_EXECUTOR_TOOL_IDS],
    registryIdToExecutor: { ...REGISTRY_ID_TO_EXECUTOR_TOOL_ID },
    executorAliases: { ...EXECUTOR_ID_ALIASES },
    unsupportedTools: [...UNSUPPORTED_ORCHESTRATOR_TOOL_DOCS],
  };
}
