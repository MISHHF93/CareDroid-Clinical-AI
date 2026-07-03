// TypeScript replacement for _deprecated-python/evaluate.py and evaluate_simple.py
// Usage: ts-node scripts/evaluate.ts

import { existsSync, writeFileSync } from 'fs';
import { loadJsonlDataset, type NluExample } from '../training/dataset';
import { embedText } from '../training/embeddings';
import { loadAnyClassifier, predictFromAny, classifierWeightsPath } from '../training/classifier';
import { INTENT_CLASSES, INTENT_LABELS, MODEL_PATHS } from '../training/training.config';
import { INTENT_KEYWORDS } from '../nlu.config';

// Keyword baseline used when no trained classifier exists yet — the same keyword
// set the live rule-based inference fallback uses (nlu.service.ts), and the
// training-pipeline analog of evaluate_simple.py's fallback to the un-fine-tuned
// base BERT model.
function ruleBasedPredict(text: string): number {
  const lower = text.toLowerCase();
  let best = { idx: INTENT_CLASSES.indexOf('general_clinical_query'), score: 0 };
  INTENT_CLASSES.forEach((intent, idx) => {
    const keywords = INTENT_KEYWORDS[intent] ?? [];
    const score = keywords.filter((kw) => lower.includes(kw)).length;
    if (score > best.score) best = { idx, score };
  });
  return best.idx;
}

function metricsFor(trueLabels: number[], predLabels: number[], numClasses: number) {
  let correct = 0;
  const perClass = Array.from({ length: numClasses }, () => ({ tp: 0, fp: 0, fn: 0 }));

  for (let i = 0; i < trueLabels.length; i++) {
    if (trueLabels[i] === predLabels[i]) {
      correct++;
      perClass[trueLabels[i]].tp++;
    } else {
      perClass[predLabels[i]].fp++;
      perClass[trueLabels[i]].fn++;
    }
  }

  const precisions = perClass.map((c) => (c.tp + c.fp > 0 ? c.tp / (c.tp + c.fp) : 0));
  const recalls = perClass.map((c) => (c.tp + c.fn > 0 ? c.tp / (c.tp + c.fn) : 0));
  const f1s = precisions.map((p, i) => (p + recalls[i] > 0 ? (2 * p * recalls[i]) / (p + recalls[i]) : 0));

  const support = perClass.map((c) => c.tp + c.fn);
  const totalSupport = support.reduce((a, b) => a + b, 0) || 1;

  return {
    accuracy: correct / (trueLabels.length || 1),
    macroF1: f1s.reduce((a, b) => a + b, 0) / numClasses,
    weightedF1: f1s.reduce((sum, f1, i) => sum + f1 * support[i], 0) / totalSupport,
    macroPrecision: precisions.reduce((a, b) => a + b, 0) / numClasses,
    macroRecall: recalls.reduce((a, b) => a + b, 0) / numClasses,
  };
}

function percentile(sorted: number[], p: number): number {
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
}

async function evaluate(): Promise<void> {
  let testData: NluExample[] = loadJsonlDataset(MODEL_PATHS.testData);
  if (testData.length === 0) {
    console.warn('No test data found, falling back to last 50 training examples');
    testData = loadJsonlDataset(MODEL_PATHS.trainingData).slice(-50);
  }
  if (testData.length === 0) {
    console.error('No data available to evaluate.');
    return;
  }

  const weightsPath = classifierWeightsPath(MODEL_PATHS.bestModelDir);
  const classifier = existsSync(weightsPath) ? loadAnyClassifier(weightsPath) : null;

  if (classifier) {
    console.log(`Loaded trained ${classifier.kind ?? 'linear'} classifier from ${weightsPath}`);
  } else {
    console.log('No trained classifier found — evaluating rule-based fallback baseline');
  }

  const trueLabels: number[] = [];
  const predLabels: number[] = [];
  const inferenceTimes: number[] = [];

  console.log(`Evaluating on ${testData.length} examples...`);

  for (const example of testData) {
    const trueLabel = INTENT_LABELS[example.intent as keyof typeof INTENT_LABELS];
    trueLabels.push(trueLabel);

    const start = Date.now();
    let predLabel: number;
    if (classifier) {
      const embedding = await embedText(example.text);
      predLabel = predictFromAny(classifier, embedding).labelId;
    } else {
      predLabel = ruleBasedPredict(example.text);
    }
    inferenceTimes.push(Date.now() - start);
    predLabels.push(predLabel);
  }

  const metrics = metricsFor(trueLabels, predLabels, INTENT_CLASSES.length);
  const sortedTimes = [...inferenceTimes].sort((a, b) => a - b);
  const mean = inferenceTimes.reduce((a, b) => a + b, 0) / inferenceTimes.length;

  const results = {
    ...metrics,
    latencyMs: {
      p50: percentile(sortedTimes, 0.5),
      p95: percentile(sortedTimes, 0.95),
      p99: percentile(sortedTimes, 0.99),
      mean,
    },
    testSetSize: testData.length,
    usedTrainedClassifier: classifier !== null,
    architecture: classifier?.kind ?? null,
  };

  console.log('\n' + '='.repeat(50));
  console.log('EVALUATION RESULTS');
  console.log('='.repeat(50));
  console.log(`Accuracy:        ${metrics.accuracy.toFixed(4)}`);
  console.log(`Macro F1:        ${metrics.macroF1.toFixed(4)}`);
  console.log(`Weighted F1:     ${metrics.weightedF1.toFixed(4)}`);
  console.log(`Macro Precision: ${metrics.macroPrecision.toFixed(4)}`);
  console.log(`Macro Recall:    ${metrics.macroRecall.toFixed(4)}`);
  console.log(`Test Set Size:   ${testData.length}`);
  console.log('='.repeat(50) + '\n');

  writeFileSync(MODEL_PATHS.metricsOutput, JSON.stringify(results, null, 2));
  console.log(`Metrics saved to ${MODEL_PATHS.metricsOutput}`);
}

if (require.main === module) {
  evaluate().catch((err) => {
    console.error('Evaluation failed:', err);
    process.exitCode = 1;
  });
}

export { evaluate };
