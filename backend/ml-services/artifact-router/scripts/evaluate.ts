import { existsSync, writeFileSync } from 'fs';
import { updateHeadManifest } from '../../shared/manifest';
import { resolveClassifierPath } from '../../shared/paths';
import { applyRouterPathPrior, formatArtifactRouterInput } from '../../shared/router-input';
import { embedTextCached as embedText } from '../../nlu/training/embeddingsCache';
import { loadAnyClassifier, predictFromAny } from '../../nlu/training/classifier';
import { loadJsonlDataset, resolveLabelKey } from '../training/dataset';
import { MODEL_PATHS, TRAINING_CONFIG } from '../training/training.config';

async function evaluateArtifactRouter(): Promise<void> {
  let testData = loadJsonlDataset(MODEL_PATHS.testData);
  if (testData.length === 0) {
    testData = loadJsonlDataset(MODEL_PATHS.trainData).slice(-100);
  }
  if (testData.length === 0) {
    console.error('No artifact router evaluation data available.');
    return;
  }

  const weightsPath = resolveClassifierPath('artifact-router');
  if (!existsSync(weightsPath)) {
    console.error(`Trained artifact router not found at ${weightsPath}`);
    return;
  }

  const classifier = loadAnyClassifier(weightsPath);
  const labelNames = classifier.labelToIntent ?? {};

  let correct = 0;
  let pathOverrides = 0;
  const inferenceTimes: number[] = [];
  const confusion: Record<string, number> = {};

  for (const example of testData) {
    const start = Date.now();
    const text =
      example.inputText.startsWith('name:') || example.inputText.startsWith('route:')
        ? example.inputText
        : formatArtifactRouterInput(
            example.inputText,
            example.labelType === 'route' ? 'route' : 'name',
            example.artifactType,
          );
    const embedding = await embedText(text);
    const { labelId, confidence } = predictFromAny(classifier, embedding);
    inferenceTimes.push(Date.now() - start);
    const rawPredicted = labelNames[labelId] ?? 'unknown';
    const prior = applyRouterPathPrior(text, rawPredicted, confidence);
    if (prior.overridden) pathOverrides += 1;
    const predicted = prior.artifactType;
    const expected = resolveLabelKey(example, TRAINING_CONFIG.targetMode);
    if (predicted === expected) {
      correct++;
    } else {
      const key = `${expected}->${predicted}`;
      confusion[key] = (confusion[key] ?? 0) + 1;
    }
  }

  const sorted = [...inferenceTimes].sort((a, b) => a - b);
  const accuracy = correct / testData.length;
  const meanLatency = inferenceTimes.reduce((sum, ms) => sum + ms, 0) / inferenceTimes.length;

  console.log('Artifact Router Evaluation');
  console.log(`Target mode: ${TRAINING_CONFIG.targetMode}`);
  console.log(`Accuracy: ${(accuracy * 100).toFixed(2)}%`);
  console.log(`Test size: ${testData.length}`);
  console.log(`Path priors applied: ${pathOverrides}`);
  console.log(`Latency p50: ${sorted[Math.floor(sorted.length * 0.5)]}ms`);
  console.log(`Latency mean: ${meanLatency.toFixed(1)}ms`);
  const topConfusions = Object.entries(confusion)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  if (topConfusions.length) {
    console.log('Top confusions:');
    for (const [pair, count] of topConfusions) console.log(`  ${pair}: ${count}`);
  }

  const evaluatedAt = new Date().toISOString();
  const metrics = {
    accuracy,
    testSetSize: testData.length,
    targetMode: TRAINING_CONFIG.targetMode,
    architecture: classifier.kind ?? 'linear',
    pathOverrides,
    latencyMs: {
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      mean: meanLatency,
    },
    evaluatedAt,
  };
  writeFileSync(MODEL_PATHS.metricsOutput, JSON.stringify(metrics, null, 2));
  updateHeadManifest('artifact-router', {
    classifierPath: weightsPath,
    metricsPath: MODEL_PATHS.metricsOutput,
    architecture: metrics.architecture,
    accuracy,
    targetMode: TRAINING_CONFIG.targetMode,
    testSetSize: testData.length,
    evaluatedAt,
  });
}

if (require.main === module) {
  evaluateArtifactRouter().catch((error) => {
    console.error('Artifact router evaluation failed:', error);
    process.exitCode = 1;
  });
}

export { evaluateArtifactRouter };