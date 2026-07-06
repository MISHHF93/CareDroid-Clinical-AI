/**
 * Canonical maps between unified ML heads and runtime tool execution.
 * Single source of truth for NLU intent labels → executor tool IDs.
 */

export const NLU_INTENT_TO_EXECUTOR_TOOL: Readonly<Record<string, string>> = {
  sofa_score_calculation: 'sofa-calculator',
  drug_interaction_check: 'drug-interactions',
  lab_interpretation: 'lab-interpreter',
};

const EXECUTOR_ALIAS: Readonly<Record<string, string>> = {
  'drug-interaction-checker': 'drug-interactions',
  'sofa-score': 'sofa-calculator',
  'lab-interp': 'lab-interpreter',
};

function inferExecutorFromMessage(message: string, artifactType?: string): string | undefined {
  const lower = message.toLowerCase();
  if (/sofa|qsofa|organ failure|sepsis score/i.test(lower)) return 'sofa-calculator';
  if (/drug|interaction|warfarin|medication.*combine|polypharmacy/i.test(lower)) {
    return 'drug-interactions';
  }
  if (/lab|creatinine|hemoglobin|wbc|platelet|abnormal result|interpret.*result/i.test(lower)) {
    return 'lab-interpreter';
  }
  if (artifactType === 'calculator' && /score|calculate|calculation/i.test(lower)) {
    return 'sofa-calculator';
  }
  return undefined;
}

export function resolveExecutorToolId(
  toolOrIntentId?: string,
  artifactType?: string,
  message?: string,
): string | undefined {
  const raw = String(toolOrIntentId || '').trim();

  if (NLU_INTENT_TO_EXECUTOR_TOOL[raw]) return NLU_INTENT_TO_EXECUTOR_TOOL[raw];
  if (EXECUTOR_ALIAS[raw]) return EXECUTOR_ALIAS[raw];
  if (Object.values(NLU_INTENT_TO_EXECUTOR_TOOL).includes(raw)) return raw;

  if (message) {
    const inferred = inferExecutorFromMessage(message, artifactType);
    if (inferred) return inferred;
  }

  if (!raw && artifactType === 'executor') {
    return inferExecutorFromMessage(message || '', artifactType);
  }

  return raw || undefined;
}

export function mapRouterArtifactTypeToArtifactEntity(
  routerType?: string,
): 'calculator' | 'workflow' | 'prompt' | 'protocol' | 'ai_output' {
  switch (routerType) {
    case 'calculator':
      return 'calculator';
    case 'route':
    case 'page':
      return 'workflow';
    case 'prompt':
      return 'prompt';
    case 'document':
    case 'medical-knowledge':
      return 'protocol';
    default:
      return 'ai_output';
  }
}

export const UNIFIED_MODEL_PATHS = {
  root: 'backend/ml-services/models',
  manifest: 'backend/ml-services/models/manifest.json',
  nluClassifier: 'backend/ml-services/models/nlu/classifier.json',
  artifactRouterClassifier: 'backend/ml-services/models/artifact-router/classifier.json',
} as const;

export function extractClassifiableText(input?: Record<string, unknown>): string {
  if (!input || typeof input !== 'object') return '';
  const candidates = [
    input.message,
    input.query,
    input.chiefComplaint,
    input.complaint,
    input.summary,
    input.notes,
    input.text,
    input.description,
  ];
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim().length >= 8) return value.trim();
  }
  return '';
}