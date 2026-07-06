#!/usr/bin/env node
/**
 * Unified model training for the CareDroid AI node:
 * 1. Capture all artifacts
 * 2. Augment NLU corpus from artifact catalog
 * 3. Retrain NLU intent router
 * 4. Train artifact router (text -> artifactId)
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function runStep(label, command, args, options = {}) {
  console.log(`\n=== ${label} ===`);
  const result = spawnSync(command, args, {
    cwd: options.cwd || ROOT,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, ...(options.env || {}) },
  });
  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status ?? 'unknown'}`);
  }
}

function readJson(relativePath) {
  const absolute = path.join(ROOT, relativePath);
  if (!existsSync(absolute)) return null;
  return JSON.parse(readFileSync(absolute, 'utf8'));
}

function printSummary() {
  const manifest = readJson('backend/ml-services/models/manifest.json');
  const nluMetrics = readJson('backend/ml-services/models/nlu/metrics.json');
  const artifactMetrics = readJson('backend/ml-services/models/artifact-router/metrics.json');
  const corpusPath = path.join(ROOT, 'backend/ml-services/nlu/data/corpus.jsonl');
  const corpusLines = existsSync(corpusPath)
    ? readFileSync(corpusPath, 'utf8').split(/\r?\n/).filter(Boolean).length
    : 0;

  console.log('\n=== Unified Training Summary ===');
  if (corpusLines) console.log(`NLU corpus examples: ${corpusLines}`);
  if (nluMetrics) {
    console.log(
      `NLU intent head: ${(Number(nluMetrics.accuracy) * 100).toFixed(2)}% accuracy (${nluMetrics.architecture || 'unknown'})`,
    );
  }
  if (artifactMetrics) {
    console.log(
      `Artifact router head: ${(Number(artifactMetrics.accuracy) * 100).toFixed(2)}% accuracy (${artifactMetrics.architecture || 'unknown'}, ${artifactMetrics.numClasses || '?'} classes, ${artifactMetrics.targetMode || 'artifact-type'})`,
    );
  }
  if (manifest) {
    console.log(`Unified manifest updated: ${manifest.updatedAt || 'unknown'}`);
  }
  console.log('Unified classifier outputs:');
  console.log('  - backend/ml-services/models/manifest.json');
  console.log('  - backend/ml-services/models/nlu/classifier.json');
  console.log('  - backend/ml-services/models/artifact-router/classifier.json');
  console.log('Runtime endpoints:');
  console.log('  - GET  /api/ai/node/models/health');
  console.log('  - POST /api/ai/node/models/route');
  console.log('Training data:');
  console.log('  - data/ml/artifact_training_dataset.csv');
}

try {
  runStep('Sync unified model directory', 'node', ['scripts/sync-unified-models.mjs']);
  runStep('Capture artifacts', npmCmd, ['run', 'artifact-intelligence:generate']);
  runStep('Augment NLU corpus from artifacts', npmCmd, ['run', 'nlu:augment-artifacts'], {
    cwd: path.join(ROOT, 'backend'),
  });
  runStep('Prepare NLU datasets', npmCmd, ['run', 'nlu:prepare-data'], { cwd: path.join(ROOT, 'backend') });
  runStep('Train NLU intent router', npmCmd, ['run', 'nlu:train'], {
    cwd: path.join(ROOT, 'backend'),
    env: { NLU_MLP_HIDDEN_DIM: process.env.NLU_MLP_HIDDEN_DIM || '128' },
  });
  runStep('Evaluate NLU intent router', npmCmd, ['run', 'nlu:evaluate'], { cwd: path.join(ROOT, 'backend') });
  const artifactTrainEnv = {
    ARTIFACT_EPOCHS: process.env.ARTIFACT_EPOCHS || '2500',
    ARTIFACT_MLP_HIDDEN_DIM: process.env.ARTIFACT_MLP_HIDDEN_DIM || '128',
    ARTIFACT_EXCLUDE_TYPES: process.env.ARTIFACT_EXCLUDE_TYPES || 'nlu-example',
    ARTIFACT_LABEL_TYPES: process.env.ARTIFACT_LABEL_TYPES || 'name,route',
  };
  runStep('Prepare artifact router datasets (initial split)', npmCmd, ['run', 'artifact-router:prepare-data'], {
    cwd: path.join(ROOT, 'backend'),
  });
  runStep('Train artifact router (initial pass)', npmCmd, ['run', 'artifact-router:train'], {
    cwd: path.join(ROOT, 'backend'),
    env: artifactTrainEnv,
  });
  // Hard examples are mined from validation errors only — the held-out test set
  // must never feed back into training data, or evaluate.ts's accuracy becomes meaningless.
  runStep('Dump artifact router validation errors', 'npx', [
    'ts-node',
    'ml-services/artifact-router/scripts/dumpErrors.ts',
  ], { cwd: path.join(ROOT, 'backend') });
  const errorReport = path.join(ROOT, 'backend/ml-services/artifact-router/data/error_report.json');
  if (existsSync(errorReport)) {
    runStep('Generate artifact router hard examples', 'npx', [
      'ts-node',
      'ml-services/artifact-router/scripts/generateHardExamples.ts',
    ], { cwd: path.join(ROOT, 'backend') });
  }
  runStep('Prepare artifact router datasets (with hard examples)', npmCmd, ['run', 'artifact-router:prepare-data'], {
    cwd: path.join(ROOT, 'backend'),
  });
  runStep('Train artifact router (final pass)', npmCmd, ['run', 'artifact-router:train'], {
    cwd: path.join(ROOT, 'backend'),
    env: artifactTrainEnv,
  });
  runStep('Evaluate artifact router', npmCmd, ['run', 'artifact-router:evaluate'], {
    cwd: path.join(ROOT, 'backend'),
  });
  runStep('Refresh artifact catalog with ML heads', npmCmd, ['run', 'artifact-intelligence:generate']);
  printSummary();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}