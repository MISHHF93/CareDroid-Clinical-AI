// K-fold stratified cross-validation over the FULL dataset (train+val+test
// recombined). A single train/val/test split on ~477 examples is noisy — one
// unlucky split can swing test accuracy by several points either way. This
// script trains K separate models (K folds x both architectures) and reports
// the mean +/- stddev accuracy, which is a far more trustworthy number than
// any single split's result.
//
// Usage: ts-node scripts/crossValidate.ts [--folds 5]

import { loadJsonlDataset, type NluExample } from '../training/dataset';
import { embedBatch } from '../training/embeddings';
import { trainClassifier, predictFromAny } from '../training/classifier';
import { trainMlpClassifier, predictFromMlpEmbedding } from '../training/mlpClassifier';
import { INTENT_LABELS, LABEL_TO_INTENT, MODEL_CONFIG, MODEL_PATHS, TRAINING_CONFIG } from '../training/training.config';

function parseFolds(argv: string[]): number {
  const idx = argv.indexOf('--folds');
  return idx >= 0 && argv[idx + 1] ? Number(argv[idx + 1]) : 5;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Assigns each example index to one of K folds, preserving per-class proportions. */
function stratifiedFoldAssignment(data: NluExample[], k: number, seed: number): number[] {
  const rng = mulberry32(seed);
  const byIntent = new Map<string, number[]>();
  data.forEach((item, idx) => {
    const group = byIntent.get(item.intent) ?? [];
    group.push(idx);
    byIntent.set(item.intent, group);
  });

  const fold = new Array<number>(data.length).fill(-1);
  for (const indices of byIntent.values()) {
    const shuffled = shuffle(indices, rng);
    shuffled.forEach((idx, i) => {
      fold[idx] = i % k;
    });
  }
  return fold;
}

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
}

function stddev(xs: number[]): number {
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
}

async function crossValidate(k: number): Promise<void> {
  const full: NluExample[] = [
    ...loadJsonlDataset(MODEL_PATHS.trainingData),
    ...loadJsonlDataset(MODEL_PATHS.validationData),
    ...loadJsonlDataset(MODEL_PATHS.testData),
  ];

  if (full.length === 0) {
    console.error('No data found across train/val/test files.');
    return;
  }

  console.log(`Loaded ${full.length} total examples (train+val+test combined)`);
  console.log(`Loading embedding model: ${MODEL_CONFIG.embeddingModelName}`);
  console.log('Computing embeddings once for the full dataset...');

  const embeddings = await embedBatch(full.map((d) => d.text));
  const labels = full.map((d) => INTENT_LABELS[d.intent as keyof typeof INTENT_LABELS]);
  const numClasses = Object.keys(INTENT_LABELS).length;

  const foldOf = stratifiedFoldAssignment(full, k, TRAINING_CONFIG.seed);

  const linearAccuracies: number[] = [];
  const mlpAccuracies: number[] = [];

  const mlpConfig = {
    numEpochs: TRAINING_CONFIG.numEpochs,
    learningRate: TRAINING_CONFIG.learningRate,
    l2Reg: TRAINING_CONFIG.l2Reg,
    hiddenDim: Number(process.env.NLU_MLP_HIDDEN_DIM ?? 64),
    seed: TRAINING_CONFIG.seed,
  };

  for (let fold = 0; fold < k; fold++) {
    const trainIdx: number[] = [];
    const testIdx: number[] = [];
    foldOf.forEach((f, i) => (f === fold ? testIdx.push(i) : trainIdx.push(i)));

    const trainEmb = trainIdx.map((i) => embeddings[i]);
    const trainLabels = trainIdx.map((i) => labels[i]);
    const testEmb = testIdx.map((i) => embeddings[i]);
    const testLabels = testIdx.map((i) => labels[i]);

    const linear = trainClassifier(
      trainEmb,
      trainLabels,
      numClasses,
      LABEL_TO_INTENT,
      MODEL_CONFIG.embeddingModelName,
      TRAINING_CONFIG,
    );
    const mlp = trainMlpClassifier(
      trainEmb,
      trainLabels,
      numClasses,
      LABEL_TO_INTENT,
      MODEL_CONFIG.embeddingModelName,
      mlpConfig,
    );

    let linearCorrect = 0;
    let mlpCorrect = 0;
    for (let i = 0; i < testEmb.length; i++) {
      if (predictFromAny(linear.weights, testEmb[i]).labelId === testLabels[i]) linearCorrect++;
      if (predictFromMlpEmbedding(mlp.weights, testEmb[i]).labelId === testLabels[i]) mlpCorrect++;
    }

    const linearAcc = linearCorrect / testEmb.length;
    const mlpAcc = mlpCorrect / testEmb.length;
    linearAccuracies.push(linearAcc);
    mlpAccuracies.push(mlpAcc);

    console.log(
      `Fold ${fold + 1}/${k} (n=${testEmb.length}): linear ${(linearAcc * 100).toFixed(1)}%, mlp ${(mlpAcc * 100).toFixed(1)}%`,
    );
  }

  console.log('\n' + '='.repeat(50));
  console.log(`${k}-FOLD CROSS-VALIDATION RESULTS (n=${full.length} total)`);
  console.log('='.repeat(50));
  console.log(
    `Linear: mean ${(mean(linearAccuracies) * 100).toFixed(2)}% +/- ${(stddev(linearAccuracies) * 100).toFixed(2)}pp`,
  );
  console.log(
    `MLP:    mean ${(mean(mlpAccuracies) * 100).toFixed(2)}% +/- ${(stddev(mlpAccuracies) * 100).toFixed(2)}pp`,
  );
  console.log('='.repeat(50));
  console.log(
    '\nThis is the trustworthy number — it averages accuracy over all examples exactly once each\n' +
      'as a test case, instead of relying on one lucky/unlucky train/test split.',
  );
}

if (require.main === module) {
  crossValidate(parseFolds(process.argv.slice(2))).catch((err) => {
    console.error('Cross-validation failed:', err);
    process.exitCode = 1;
  });
}

export { crossValidate };
