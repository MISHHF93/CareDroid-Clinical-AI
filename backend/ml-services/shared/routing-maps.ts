/**
 * Canonical maps between unified ML heads and runtime tool execution.
 * Single source of truth for NLU intent labels → executor tool IDs.
 */

/** Full NLU taxonomy (nlu.config INTENT_CLASSES) → MCP/tool-orchestrator ids. */
export const NLU_INTENT_TO_EXECUTOR_TOOL: Readonly<Record<string, string>> = {
  sofa_score_calculation: 'sofa-calculator',
  drug_interaction_check: 'drug-interactions',
  lab_interpretation: 'lab-interpreter',
  clinical_guideline_lookup: 'protocol-lookup',
  medication_order: 'dose-calculator',
  diagnosis_support: 'differential-diagnosis',
  discharge_planning: 'protocol-lookup',
  patient_status_update: 'protocol-lookup',
  emergency_alert: 'protocol-lookup',
  general_clinical_query: '',
};

const EXECUTOR_ALIAS: Readonly<Record<string, string>> = {
  'drug-interaction-checker': 'drug-interactions',
  'sofa-score': 'sofa-calculator',
  'lab-interp': 'lab-interpreter',
  'lab-interpretation': 'lab-interpreter',
  'dose-calc': 'dose-calculator',
  'differential': 'differential-diagnosis',
  'protocol': 'protocol-lookup',
  'guidelines': 'protocol-lookup',
};

/** Message patterns → executor when NLU label alone is too coarse. */
function inferExecutorFromMessage(message: string, artifactType?: string): string | undefined {
  const lower = message.toLowerCase();

  // Calculators (high precision name/score patterns)
  if (/sofa|qsofa|organ failure|sepsis score/i.test(lower)) return 'sofa-calculator';
  if (/apache|apache.?ii|apache-2/i.test(lower)) return 'apache2-calculator';
  if (/cha2ds2|chads2|chadsvasc|afib.*stroke|stroke risk.*afib/i.test(lower)) {
    return 'cha2ds2vasc-calculator';
  }
  if (/curb-?65|pneumonia severity/i.test(lower)) return 'curb65-calculator';
  if (/\bgcs\b|glasgow coma/i.test(lower)) return 'gcs-calculator';
  if (/wells.*dvt|dvt.*wells|deep vein/i.test(lower)) return 'wells-dvt-calculator';
  if (/wells.*pe|pe.*wells|pulmonary embolism.*wells/i.test(lower)) return 'wells-pe';
  if (/\bperc\b|perc rule/i.test(lower)) return 'perc';
  if (/\bgrace\b|acs mortality/i.test(lower)) return 'grace-acs';
  if (/\bnihss\b|nih stroke/i.test(lower)) return 'nihss';
  if (/c-?spine|canadian c.?spine/i.test(lower)) return 'canadian-c-spine';
  if (/ottawa.*ankle|ankle.*ottawa/i.test(lower)) return 'ottawa-ankle';
  if (/\bnews2?\b|early warning score/i.test(lower)) return 'news2-calculator';
  if (/\bheart score\b|heart pathway/i.test(lower)) return 'heart-score-calculator';

  if (/drug|interaction|warfarin|medication.*combine|polypharmacy/i.test(lower)) {
    return 'drug-interactions';
  }
  if (/lab|creatinine|hemoglobin|wbc|platelet|abnormal result|interpret.*result/i.test(lower)) {
    return 'lab-interpreter';
  }
  if (/\babg\b|arterial blood gas|blood gas/i.test(lower)) return 'abg-interpreter';
  if (/dose|dosing|prescribe|mg\/kg|renally adjust/i.test(lower)) return 'dose-calculator';
  if (/antibiotic|antimicrobial|empiric therapy/i.test(lower)) return 'antibiotic-guide';
  if (/differential|what could cause|ddx/i.test(lower)) return 'differential-diagnosis';
  if (/guideline|protocol|bundle|pathway/i.test(lower)) return 'protocol-lookup';

  // Soft calculator fallback only when artifact head already says calculator
  // and the user is clearly asking to compute something.
  if (artifactType === 'calculator' && /score|calculate|calculation|compute/i.test(lower)) {
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

  if (raw && NLU_INTENT_TO_EXECUTOR_TOOL[raw] !== undefined) {
    const mapped = NLU_INTENT_TO_EXECUTOR_TOOL[raw];
    if (mapped) return mapped;
    // empty string mapping means "no tool" — fall through to message inference
  }
  if (EXECUTOR_ALIAS[raw]) return EXECUTOR_ALIAS[raw];
  if (Object.values(NLU_INTENT_TO_EXECUTOR_TOOL).includes(raw) && raw) return raw;

  if (message) {
    const inferred = inferExecutorFromMessage(message, artifactType);
    if (inferred) return inferred;
  }

  if (!raw && artifactType === 'executor') {
    return inferExecutorFromMessage(message || '', artifactType);
  }

  // Don't return bare NLU class names as tool ids when they map to empty.
  if (raw && NLU_INTENT_TO_EXECUTOR_TOOL[raw] === '') return undefined;

  return raw || undefined;
}

/**
 * When both unified heads fire, boost confidence if they agree on a clinical-tool story.
 * Caps at 0.98 so we never claim certainty.
 */
export function fuseUnifiedHeadConfidence(input: {
  intentConfidence: number;
  artifactType?: string;
  artifactConfidence?: number;
  primaryIsClinicalTool: boolean;
}): number {
  let conf = input.intentConfidence;
  const artConf = input.artifactConfidence ?? 0;
  const art = input.artifactType;

  if (input.primaryIsClinicalTool && art === 'calculator' && artConf >= 0.6) {
    conf = Math.max(conf, Math.min(0.98, (conf + artConf) / 2 + 0.08));
  }
  if (input.primaryIsClinicalTool && (art === 'tool' || art === 'prompt') && artConf >= 0.7) {
    conf = Math.max(conf, Math.min(0.95, conf + 0.05));
  }
  if (art === 'document' && artConf >= 0.75 && !input.primaryIsClinicalTool) {
    conf = Math.max(conf, Math.min(0.92, conf + 0.04));
  }
  return Math.round(conf * 1000) / 1000;
}

/** Accept Phase-2 node result without falling through to LLM. */
export function shouldAcceptUnifiedNodeResult(input: {
  intentConfidence: number;
  artifactType?: string;
  artifactConfidence?: number;
  primaryIsClinicalTool: boolean;
}): boolean {
  if (input.intentConfidence >= 0.7) return true;
  // Dual-head agreement: slightly lower intent bar when artifact head is strong
  if (
    input.intentConfidence >= 0.55 &&
    (input.artifactConfidence ?? 0) >= 0.75 &&
    (input.primaryIsClinicalTool ||
      input.artifactType === 'document' ||
      input.artifactType === 'calculator')
  ) {
    return true;
  }
  return false;
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
