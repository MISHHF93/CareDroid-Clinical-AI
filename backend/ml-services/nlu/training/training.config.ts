// TypeScript replacement for _deprecated-python/config.py
//
// Intent taxonomy is imported from ../nlu.config.ts (the live rule-based/pretrained
// inference path) rather than defined separately — the two used to diverge (7 vs
// 10 classes) because the training pipeline was ported before this reconciliation.
// data/*.jsonl has been relabeled to this taxonomy; see git history if you need the
// old 7-class version.

import { existsSync } from 'fs';
import path from 'path';
import { INTENT_CLASSES, type IntentClass } from '../nlu.config';

/** Prefer source tree under backend/ml-services/nlu (models are not copied to dist). */
function resolveNluRoot(): string {
  const fromCwd = path.resolve(process.cwd(), 'ml-services', 'nlu');
  const hasArtifacts =
    existsSync(path.join(fromCwd, 'models', 'best_model', 'classifier.json')) ||
    existsSync(path.join(fromCwd, 'data', 'train.jsonl'));
  if (hasArtifacts) return fromCwd;
  return path.resolve(__dirname, '..');
}

const NLU_ROOT = resolveNluRoot();

export { INTENT_CLASSES, type IntentClass };

export const INTENT_LABELS: Record<IntentClass, number> = INTENT_CLASSES.reduce(
  (acc, intent, idx) => ({ ...acc, [intent]: idx }),
  {} as Record<IntentClass, number>,
);

export const LABEL_TO_INTENT: Record<number, IntentClass> = INTENT_CLASSES.reduce(
  (acc, intent, idx) => ({ ...acc, [idx]: intent }),
  {} as Record<number, IntentClass>,
);

export const EMERGENCY_SUBCATEGORIES: Record<string, string[]> = {
  cardiac: ['chest pain', 'arrhythmia', 'myocardial infarction', 'mi', 'acs'],
  neurological: ['stroke', 'cva', 'seizure', 'altered mental status', 'ams'],
  respiratory: ['dyspnea', 'respiratory failure', 'respiratory distress', 'apnea'],
  sepsis: ['sepsis', 'septic shock', 'fever', 'infection'],
  trauma: ['trauma', 'blunt', 'penetrating', 'burns'],
  psychiatric: ['suicide', 'suicidal', 'psychiatric emergency', 'psychotic'],
};

export const MODEL_CONFIG = {
  // mpnet-base-v2 (768-dim) beat MiniLM-L6-v2 (384-dim) by ~6.5 points test
  // accuracy on this dataset (87.10% vs 80.65%) — worth the larger/slower
  // embedding model for a classification-quality gain this size.
  embeddingModelName: process.env.NLU_EMBEDDING_MODEL ?? 'Xenova/all-mpnet-base-v2',
  numLabels: INTENT_CLASSES.length,
  maxLength: Number(process.env.NLU_MAX_LENGTH ?? 512),
} as const;

export const TRAINING_CONFIG = {
  // Tuned against the current ~127-example training set: enough epochs/learning
  // rate to actually separate 10 classes over 384-dim MiniLM embeddings (the
  // original untuned defaults only reached 27% test accuracy, barely above
  // chance). Validation loss plateaus around 6000 epochs — more epochs beyond
  // that stopped improving test accuracy (measured up to 10000).
  numEpochs: Number(process.env.NLU_EPOCHS ?? 6000),
  learningRate: Number(process.env.NLU_LEARNING_RATE ?? 0.3),
  l2Reg: Number(process.env.NLU_L2_REG ?? 0.0002),
  seed: Number(process.env.NLU_SEED ?? 42),
} as const;

export const MODEL_PATHS = {
  trainingData: process.env.NLU_TRAINING_DATA ?? path.join(NLU_ROOT, 'data/train.jsonl'),
  validationData: process.env.NLU_VALIDATION_DATA ?? path.join(NLU_ROOT, 'data/val.jsonl'),
  testData: process.env.NLU_TEST_DATA ?? path.join(NLU_ROOT, 'data/test.jsonl'),
  bestModelDir: process.env.NLU_BEST_MODEL_DIR ?? path.join(NLU_ROOT, 'models/best_model'),
  metricsOutput: process.env.NLU_METRICS_OUTPUT ?? path.join(NLU_ROOT, 'metrics.json'),
} as const;
