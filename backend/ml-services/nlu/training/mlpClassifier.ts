// Alternative classifier architecture: a single-hidden-layer MLP (ReLU) on top of
// the same frozen sentence embeddings the linear classifier (./classifier.ts) uses.
// A hidden layer lets the classifier learn non-linear class boundaries that a pure
// softmax regression can't — many real text-classification heads use at least one
// hidden layer rather than a bare linear layer. train.ts trains both and keeps
// whichever wins on the validation set.

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';

export interface MlpClassifierWeights {
  kind: 'mlp';
  w1: number[][]; // [hiddenDim][embeddingDim]
  b1: number[]; // [hiddenDim]
  w2: number[][]; // [numClasses][hiddenDim]
  b2: number[]; // [numClasses]
  embeddingDim: number;
  hiddenDim: number;
  embeddingModelName: string;
  labelToIntent: Record<number, string>;
  trainedAt: string;
}

export interface MlpTrainResult {
  weights: MlpClassifierWeights;
  finalLoss: number;
  epochLosses: number[];
  bestEpoch: number;
  bestValLoss: number | null;
}

// Deterministic PRNG (mulberry32) — same generator used in training/dataset.ts, kept
// local here to avoid a cross-import for one function.
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

function softmax(logits: number[]): number[] {
  const max = Math.max(...logits);
  const exps = logits.map((l) => Math.exp(l - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

function relu(x: number): number {
  return x > 0 ? x : 0;
}

function forward(
  w1: number[][],
  b1: number[],
  w2: number[][],
  b2: number[],
  embedding: number[],
): { hPre: number[]; h: number[]; logits: number[] } {
  const hPre = w1.map((row, j) => {
    let sum = b1[j];
    for (let i = 0; i < embedding.length; i++) sum += row[i] * embedding[i];
    return sum;
  });
  const h = hPre.map(relu);
  const logits = w2.map((row, c) => {
    let sum = b2[c];
    for (let j = 0; j < h.length; j++) sum += row[j] * h[j];
    return sum;
  });
  return { hPre, h, logits };
}

function meanCrossEntropyLoss(
  w1: number[][],
  b1: number[],
  w2: number[][],
  b2: number[],
  embeddings: number[][],
  labels: number[],
): number {
  if (embeddings.length === 0) return 0;
  let total = 0;
  for (let i = 0; i < embeddings.length; i++) {
    const { logits } = forward(w1, b1, w2, b2, embeddings[i]);
    const probs = softmax(logits);
    total += -Math.log(Math.max(probs[labels[i]], 1e-12));
  }
  return total / embeddings.length;
}

function clone2d(m: number[][]): number[][] {
  return m.map((row) => [...row]);
}

export function trainMlpClassifier(
  embeddings: number[][],
  labels: number[],
  numClasses: number,
  labelToIntent: Record<number, string>,
  embeddingModelName: string,
  config: { numEpochs: number; learningRate: number; l2Reg: number; hiddenDim: number; seed: number },
  validation?: { embeddings: number[][]; labels: number[] },
): MlpTrainResult {
  const n = embeddings.length;
  const dim = embeddings[0]?.length ?? 0;
  const { hiddenDim } = config;

  const rng = mulberry32(config.seed);
  const scale = Math.sqrt(2 / dim);
  let w1: number[][] = Array.from({ length: hiddenDim }, () =>
    Array.from({ length: dim }, () => (rng() * 2 - 1) * scale),
  );
  let b1: number[] = new Array(hiddenDim).fill(0);
  let w2: number[][] = Array.from({ length: numClasses }, () =>
    Array.from({ length: hiddenDim }, () => (rng() * 2 - 1) * Math.sqrt(2 / hiddenDim)),
  );
  let b2: number[] = new Array(numClasses).fill(0);

  const epochLosses: number[] = [];
  const hasVal = !!validation && validation.embeddings.length > 0;

  let bestW1 = clone2d(w1);
  let bestB1 = [...b1];
  let bestW2 = clone2d(w2);
  let bestB2 = [...b2];
  let bestEpoch = -1;
  let bestValLoss = hasVal ? Infinity : null;

  for (let epoch = 0; epoch < config.numEpochs; epoch++) {
    const w1Grad: number[][] = Array.from({ length: hiddenDim }, () => new Array(dim).fill(0));
    const b1Grad: number[] = new Array(hiddenDim).fill(0);
    const w2Grad: number[][] = Array.from({ length: numClasses }, () => new Array(hiddenDim).fill(0));
    const b2Grad: number[] = new Array(numClasses).fill(0);
    let totalLoss = 0;

    for (let i = 0; i < n; i++) {
      const { hPre, h, logits } = forward(w1, b1, w2, b2, embeddings[i]);
      const probs = softmax(logits);
      const trueLabel = labels[i];
      totalLoss += -Math.log(Math.max(probs[trueLabel], 1e-12));

      const dLogits = probs.map((p, c) => p - (c === trueLabel ? 1 : 0));
      const dH = new Array(hiddenDim).fill(0);

      for (let c = 0; c < numClasses; c++) {
        b2Grad[c] += dLogits[c];
        for (let j = 0; j < hiddenDim; j++) {
          w2Grad[c][j] += dLogits[c] * h[j];
          dH[j] += dLogits[c] * w2[c][j];
        }
      }

      for (let j = 0; j < hiddenDim; j++) {
        const dHPre = hPre[j] > 0 ? dH[j] : 0;
        b1Grad[j] += dHPre;
        for (let d = 0; d < dim; d++) {
          w1Grad[j][d] += dHPre * embeddings[i][d];
        }
      }
    }

    for (let c = 0; c < numClasses; c++) {
      b2[c] -= (config.learningRate * b2Grad[c]) / n;
      for (let j = 0; j < hiddenDim; j++) {
        const reg = config.l2Reg * w2[c][j];
        w2[c][j] -= config.learningRate * (w2Grad[c][j] / n + reg);
      }
    }
    for (let j = 0; j < hiddenDim; j++) {
      b1[j] -= (config.learningRate * b1Grad[j]) / n;
      for (let d = 0; d < dim; d++) {
        const reg = config.l2Reg * w1[j][d];
        w1[j][d] -= config.learningRate * (w1Grad[j][d] / n + reg);
      }
    }

    epochLosses.push(totalLoss / n);

    if (hasVal) {
      const valLoss = meanCrossEntropyLoss(w1, b1, w2, b2, validation!.embeddings, validation!.labels);
      if (valLoss < (bestValLoss as number)) {
        bestValLoss = valLoss;
        bestEpoch = epoch;
        bestW1 = clone2d(w1);
        bestB1 = [...b1];
        bestW2 = clone2d(w2);
        bestB2 = [...b2];
      }
    }
  }

  const finalW1 = hasVal ? bestW1 : w1;
  const finalB1 = hasVal ? bestB1 : b1;
  const finalW2 = hasVal ? bestW2 : w2;
  const finalB2 = hasVal ? bestB2 : b2;

  return {
    weights: {
      kind: 'mlp',
      w1: finalW1,
      b1: finalB1,
      w2: finalW2,
      b2: finalB2,
      embeddingDim: dim,
      hiddenDim,
      embeddingModelName,
      labelToIntent,
      trainedAt: new Date().toISOString(),
    },
    finalLoss: epochLosses[epochLosses.length - 1] ?? 0,
    epochLosses,
    bestEpoch,
    bestValLoss,
  };
}

export function predictFromMlpEmbedding(
  classifier: MlpClassifierWeights,
  embedding: number[],
): { labelId: number; confidence: number; probabilities: number[] } {
  const { logits } = forward(classifier.w1, classifier.b1, classifier.w2, classifier.b2, embedding);
  const probabilities = softmax(logits);
  let labelId = 0;
  for (let c = 1; c < probabilities.length; c++) {
    if (probabilities[c] > probabilities[labelId]) labelId = c;
  }
  return { labelId, confidence: probabilities[labelId], probabilities };
}

export function saveMlpClassifier(classifier: MlpClassifierWeights, outputPath: string): void {
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(classifier, null, 2), 'utf-8');
}

export function loadMlpClassifier(inputPath: string): MlpClassifierWeights {
  return JSON.parse(readFileSync(inputPath, 'utf-8')) as MlpClassifierWeights;
}
