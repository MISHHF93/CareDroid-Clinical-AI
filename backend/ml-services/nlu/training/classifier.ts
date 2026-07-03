// TypeScript replacement for the trainable part of _deprecated-python/model.py + train.py.
//
// Fine-tuning BERT's own weights (as train.py did via HuggingFace's Trainer) isn't
// practical in Node — there's no GPU-backed autograd/transformer training stack
// equivalent to PyTorch here. Instead this trains a softmax regression head on top
// of frozen sentence embeddings (see ./embeddings.ts) via batch gradient descent.
// That head's weights ARE real trained parameters, persisted to disk as JSON, and
// used at inference time — unlike the old pipeline, whose committed artifact was
// never produced (no weights were ever checked in).

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { MODEL_CONFIG, TRAINING_CONFIG } from './training.config';
import { type MlpClassifierWeights, predictFromMlpEmbedding } from './mlpClassifier';

export interface ClassifierWeights {
  kind?: 'linear'; // absent on older saved artifacts; treated as 'linear'
  weights: number[][]; // [numClasses][embeddingDim]
  bias: number[]; // [numClasses]
  embeddingDim: number;
  embeddingModelName: string;
  labelToIntent: Record<number, string>;
  trainedAt: string;
}

export interface TrainResult {
  weights: ClassifierWeights;
  finalLoss: number;
  epochLosses: number[];
  bestEpoch: number;
  bestValLoss: number | null;
  valLosses: number[];
}

function softmax(logits: number[]): number[] {
  const max = Math.max(...logits);
  const exps = logits.map((l) => Math.exp(l - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

function forward(weights: number[][], bias: number[], embedding: number[]): number[] {
  return weights.map((classWeights, c) => {
    let dot = bias[c];
    for (let i = 0; i < embedding.length; i++) {
      dot += classWeights[i] * embedding[i];
    }
    return dot;
  });
}

function meanCrossEntropyLoss(
  weights: number[][],
  bias: number[],
  embeddings: number[][],
  labels: number[],
): number {
  if (embeddings.length === 0) return 0;
  let total = 0;
  for (let i = 0; i < embeddings.length; i++) {
    const probs = softmax(forward(weights, bias, embeddings[i]));
    total += -Math.log(Math.max(probs[labels[i]], 1e-12));
  }
  return total / embeddings.length;
}

function cloneWeights(weights: number[][]): number[][] {
  return weights.map((row) => [...row]);
}

/**
 * Trains a multinomial logistic regression classifier via batch gradient descent with
 * L2 regularization. When a validation set is provided, tracks val loss per epoch and
 * returns the best-on-validation snapshot instead of the last epoch's weights — the
 * TS analog of train.py's `load_best_model_at_end=True` with a HuggingFace Trainer.
 */
export function trainClassifier(
  embeddings: number[][],
  labels: number[],
  numClasses: number,
  labelToIntent: Record<number, string>,
  embeddingModelName: string,
  config: { numEpochs: number; learningRate: number; l2Reg: number } = TRAINING_CONFIG,
  validation?: { embeddings: number[][]; labels: number[] },
): TrainResult {
  const n = embeddings.length;
  const dim = embeddings[0]?.length ?? 0;

  let weights: number[][] = Array.from({ length: numClasses }, () => new Array(dim).fill(0));
  let bias: number[] = new Array(numClasses).fill(0);

  const epochLosses: number[] = [];
  const valLosses: number[] = [];

  const hasVal = !!validation && validation.embeddings.length > 0;
  let bestWeights = cloneWeights(weights);
  let bestBias = [...bias];
  let bestEpoch = -1;
  let bestValLoss = hasVal ? Infinity : null;

  for (let epoch = 0; epoch < config.numEpochs; epoch++) {
    const weightGrad: number[][] = Array.from({ length: numClasses }, () => new Array(dim).fill(0));
    const biasGrad: number[] = new Array(numClasses).fill(0);
    let totalLoss = 0;

    for (let i = 0; i < n; i++) {
      const logits = forward(weights, bias, embeddings[i]);
      const probs = softmax(logits);
      const trueLabel = labels[i];

      totalLoss += -Math.log(Math.max(probs[trueLabel], 1e-12));

      for (let c = 0; c < numClasses; c++) {
        const gradSignal = probs[c] - (c === trueLabel ? 1 : 0);
        biasGrad[c] += gradSignal;
        for (let d = 0; d < dim; d++) {
          weightGrad[c][d] += gradSignal * embeddings[i][d];
        }
      }
    }

    for (let c = 0; c < numClasses; c++) {
      bias[c] -= (config.learningRate * biasGrad[c]) / n;
      for (let d = 0; d < dim; d++) {
        const reg = config.l2Reg * weights[c][d];
        weights[c][d] -= config.learningRate * (weightGrad[c][d] / n + reg);
      }
    }

    epochLosses.push(totalLoss / n);

    if (hasVal) {
      const valLoss = meanCrossEntropyLoss(weights, bias, validation!.embeddings, validation!.labels);
      valLosses.push(valLoss);
      if (valLoss < (bestValLoss as number)) {
        bestValLoss = valLoss;
        bestEpoch = epoch;
        bestWeights = cloneWeights(weights);
        bestBias = [...bias];
      }
    }
  }

  const finalWeights = hasVal ? bestWeights : weights;
  const finalBias = hasVal ? bestBias : bias;

  return {
    weights: {
      kind: 'linear',
      weights: finalWeights,
      bias: finalBias,
      embeddingDim: dim,
      embeddingModelName,
      labelToIntent,
      trainedAt: new Date().toISOString(),
    },
    finalLoss: epochLosses[epochLosses.length - 1] ?? 0,
    epochLosses,
    bestEpoch,
    bestValLoss,
    valLosses,
  };
}

export function predictFromEmbedding(
  classifier: ClassifierWeights,
  embedding: number[],
): { labelId: number; confidence: number; probabilities: number[] } {
  const logits = forward(classifier.weights, classifier.bias, embedding);
  const probabilities = softmax(logits);
  let labelId = 0;
  for (let c = 1; c < probabilities.length; c++) {
    if (probabilities[c] > probabilities[labelId]) labelId = c;
  }
  return { labelId, confidence: probabilities[labelId], probabilities };
}

export function saveClassifier(classifier: ClassifierWeights, outputPath: string): void {
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(classifier, null, 2), 'utf-8');
}

export function loadClassifier(inputPath: string): ClassifierWeights {
  return JSON.parse(readFileSync(inputPath, 'utf-8')) as ClassifierWeights;
}

export function classifierWeightsPath(bestModelDir: string): string {
  return path.join(bestModelDir, 'classifier.json');
}

/** Either architecture's saved weights — distinguished by `kind` ('linear' | 'mlp'). */
export type AnyClassifierWeights = ClassifierWeights | MlpClassifierWeights;

export function saveAnyClassifier(classifier: AnyClassifierWeights, outputPath: string): void {
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(classifier, null, 2), 'utf-8');
}

export function loadAnyClassifier(inputPath: string): AnyClassifierWeights {
  return JSON.parse(readFileSync(inputPath, 'utf-8')) as AnyClassifierWeights;
}

/** Dispatches to the linear or MLP forward pass based on `classifier.kind`. */
export function predictFromAny(
  classifier: AnyClassifierWeights,
  embedding: number[],
): { labelId: number; confidence: number; probabilities: number[] } {
  if (classifier.kind === 'mlp') {
    return predictFromMlpEmbedding(classifier, embedding);
  }
  return predictFromEmbedding(classifier, embedding);
}

export { MODEL_CONFIG };
