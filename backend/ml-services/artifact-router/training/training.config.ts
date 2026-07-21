import { existsSync } from 'fs';
import path from 'path';
import { classifierDir, metricsPath } from '../../shared/paths';

function resolveArtifactRouterRoot(): string {
  const fromCwd = path.resolve(process.cwd(), 'ml-services', 'artifact-router');
  if (existsSync(path.join(fromCwd, 'data'))) return fromCwd;
  return path.resolve(__dirname, '..');
}

const ROUTER_ROOT = resolveArtifactRouterRoot();
const REPO_ROOT = path.resolve(ROUTER_ROOT, '..', '..', '..');

export type ArtifactTargetMode = 'category' | 'artifact' | 'artifact-type';

export const MODEL_CONFIG = {
  embeddingModelName: process.env.ARTIFACT_EMBEDDING_MODEL ?? process.env.NLU_EMBEDDING_MODEL ?? 'Xenova/all-mpnet-base-v2',
} as const;

function parseCsvEnv(name: string, fallback: string[]): string[] {
  const raw = process.env[name];
  if (!raw?.trim()) return fallback;
  return raw.split(',').map((v) => v.trim()).filter(Boolean);
}

export const TRAINING_CONFIG = {
  learningRate: Number(process.env.ARTIFACT_LEARNING_RATE ?? 0.25),
  l2Reg: Number(process.env.ARTIFACT_L2_REG ?? 0.0003),
  seed: Number(process.env.ARTIFACT_SEED ?? 42),
  minConfidence: Number(process.env.ARTIFACT_MIN_CONFIDENCE ?? 0.85),
  labelTypes: parseCsvEnv('ARTIFACT_LABEL_TYPES', ['name', 'route']),
  /** `artifact-type` (~20 classes) scores highest; `category` is fine-grained; `artifact` is full ID. */
  targetMode: (process.env.ARTIFACT_TARGET_MODE ?? 'artifact-type') as ArtifactTargetMode,
  minExamplesPerClass: Number(process.env.ARTIFACT_MIN_CLASS_EXAMPLES ?? 8),
  /** NLU corpus rows are not runtime artifact targets — exclude from router training. */
  excludeArtifactTypes: parseCsvEnv('ARTIFACT_EXCLUDE_TYPES', ['nlu-example']),
  /**
   * Optional majority-class cap. Default 0 (off) preserves the natural catalog
   * distribution used for the shipped accuracy metric. Set ARTIFACT_MAX_PER_CLASS
   * (e.g. 220) only when deliberately rebalancing for macro-F1 experiments.
   */
  maxExamplesPerClass: Number(process.env.ARTIFACT_MAX_PER_CLASS ?? 0),
  /** Merge low-support artifact types into platform (improves accuracy on routable classes). */
  collapseRareTypes: process.env.ARTIFACT_COLLAPSE_RARE !== 'false',
  minNativeExamples: Number(process.env.ARTIFACT_MIN_NATIVE_EXAMPLES ?? 40),
  /**
   * Oversample residual-error classes — never majority api-endpoint (that used
   * to be listed here and amplified imbalance, diluting minority gradients).
   */
  oversampleWeakTypes: parseCsvEnv('ARTIFACT_OVERSAMPLE_TYPES', [
    'tool',
    'document',
    'prompt',
    'route',
    'platform',
    'calculator',
    'registry',
  ]),
  oversampleMultiplier: Number(process.env.ARTIFACT_OVERSAMPLE_MULTIPLIER ?? 4),
  numEpochs: Number(process.env.ARTIFACT_EPOCHS ?? 2500),
  collapsedRareLabel: process.env.ARTIFACT_COLLAPSED_LABEL ?? 'platform',
  useClassWeights: process.env.ARTIFACT_CLASS_WEIGHTS !== 'false',
} as const;

export const MODEL_PATHS = {
  trainingDataset:
    process.env.ARTIFACT_TRAINING_DATASET ??
    path.join(REPO_ROOT, 'data', 'ml', 'artifact_training_dataset.csv'),
  trainData: path.join(ROUTER_ROOT, 'data', 'train.jsonl'),
  validationData: path.join(ROUTER_ROOT, 'data', 'val.jsonl'),
  testData: path.join(ROUTER_ROOT, 'data', 'test.jsonl'),
  bestModelDir: process.env.ARTIFACT_BEST_MODEL_DIR ?? classifierDir('artifact-router'),
  metricsOutput: process.env.ARTIFACT_METRICS_OUTPUT ?? metricsPath('artifact-router'),
} as const;