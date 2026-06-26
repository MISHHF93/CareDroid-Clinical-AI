// TypeScript replacement for config.py

export const SERVICE_CONFIG = {
  host: process.env.NLU_HOST ?? '0.0.0.0',
  port: Number(process.env.NLU_PORT ?? 8001),
  workers: Number(process.env.NLU_WORKERS ?? 1),
  reload: process.env.NODE_ENV === 'development',
  logLevel: process.env.LOG_LEVEL ?? 'info',
} as const;

export const MODEL_CONFIG = {
  modelName: process.env.NLU_MODEL_NAME ?? 'distilbert-base-uncased',
  modelPath: process.env.NLU_MODEL_PATH ?? './models/nlu',
  maxLength: 512,
  confidenceThreshold: 0.5,
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
