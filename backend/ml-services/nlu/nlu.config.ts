// Shared NLU taxonomy and inference defaults (TypeScript — no Python sidecar).

export const MODEL_CONFIG = {
  modelName: process.env.NLU_EMBEDDING_MODEL ?? 'Xenova/all-mpnet-base-v2',
  modelPath: process.env.NLU_BEST_MODEL_DIR ?? './models/best_model',
  maxLength: Number(process.env.NLU_MAX_LENGTH ?? 512),
  confidenceThreshold: Number(process.env.NLU_CONFIDENCE_THRESHOLD ?? 0.5),
} as const;

export const INTENT_CLASSES = [
  'drug_interaction_check',
  'lab_interpretation',
  'sofa_score_calculation',
  'clinical_guideline_lookup',
  'patient_status_update',
  'emergency_alert',
  'discharge_planning',
  'medication_order',
  'diagnosis_support',
  'general_clinical_query',
] as const;

export type IntentClass = (typeof INTENT_CLASSES)[number];

// Clinical keywords per intent class — shared by the rule-based inference
// fallback (nlu.service.ts) and the training-pipeline's baseline (scripts/evaluate.ts).
export const INTENT_KEYWORDS: Record<IntentClass, string[]> = {
  drug_interaction_check: ['drug', 'medication', 'interaction', 'contraindication', 'combine', 'take with'],
  lab_interpretation: ['lab', 'result', 'level', 'value', 'normal', 'abnormal', 'creatinine', 'glucose', 'hemoglobin'],
  sofa_score_calculation: ['sofa', 'score', 'organ', 'failure', 'sepsis', 'icu'],
  clinical_guideline_lookup: ['guideline', 'protocol', 'recommendation', 'evidence', 'treatment'],
  patient_status_update: ['patient', 'status', 'update', 'condition', 'stable', 'critical', 'improving'],
  emergency_alert: ['emergency', 'urgent', 'critical', 'code', 'alert', 'immediate', 'stat'],
  discharge_planning: ['discharge', 'home', 'follow-up', 'plan', 'instructions', 'release'],
  medication_order: ['order', 'prescribe', 'dose', 'mg', 'administer', 'give'],
  diagnosis_support: ['diagnosis', 'differential', 'symptom', 'present', 'assess', 'history'],
  general_clinical_query: ['question', 'what', 'how', 'why', 'when', 'clinical'],
};
