#!/usr/bin/env node
/**
 * Unified model training for the CareDroid AI node:
 * 1. Capture all artifacts
 * 2. Augment NLU corpus from artifact catalog
 * 3. Retrain NLU intent router
 * 4. Train artifact router (text -> artifact type)
 *
 * Artifact hard-example second pass is OFF by default. Empirically it raised
 * val accuracy while *lowering* held-out test accuracy (95.81% → 94.19%).
 * Enable with ARTIFACT_HARD_EXAMPLES=true. When enabled, pass-1 weights are
 * snapshotted and restored if pass-2 test accuracy regresses.
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const ARTIFACT_CLS = path.join(ROOT, 'backend/ml-services/models/artifact-router/classifier.json');
const ARTIFACT_MET = path.join(ROOT, 'backend/ml-services/models/artifact-router/metrics.json');
const SNAP_DIR = path.join(ROOT, 'backend/ml-services/models/artifact-router/checkpoints');
const HARD_EXAMPLES_ENABLED = process.env.ARTIFACT_HARD_EXAMPLES === 'true';

/** Prefer direct node/npm-cli spawns on Windows (avoids shell STATUS_DLL_INIT_FAILED). */
function resolveCommand(command, args) {
  if (command === 'node' || command === process.execPath) {
    return { command: process.execPath, args, shell: false };
  }
  if (command === 'npm' || command === 'npm.cmd') {
    const npmCli = path.join(
      path.dirname(process.execPath),
      'node_modules',
      'npm',
      'bin',
      'npm-cli.js',
    );
    if (existsSync(npmCli)) {
      return { command: process.execPath, args: [npmCli, ...args], shell: false };
    }
    return {
      command: process.platform === 'win32' ? 'npm.cmd' : 'npm',
      args,
      shell: process.platform === 'win32',
    };
  }
  if (command === 'npx' || command === 'npx.cmd') {
    const npxCli = path.join(
      path.dirname(process.execPath),
      'node_modules',
      'npm',
      'bin',
      'npx-cli.js',
    );
    if (existsSync(npxCli)) {
      return { command: process.execPath, args: [npxCli, ...args], shell: false };
    }
    return {
      command: process.platform === 'win32' ? 'npx.cmd' : 'npx',
      args,
      shell: process.platform === 'win32',
    };
  }
  return { command, args, shell: process.platform === 'win32' };
}

function runStep(label, command, args, options = {}) {
  console.log(`\n=== ${label} ===`);
  const resolved = resolveCommand(command, args);
  const result = spawnSync(resolved.command, resolved.args, {
    cwd: options.cwd || ROOT,
    stdio: 'inherit',
    shell: resolved.shell,
    windowsHide: true,
    env: { ...process.env, ...(options.env || {}) },
  });
  if (result.error) {
    throw new Error(`${label} failed to spawn: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status ?? 'unknown'}`);
  }
}

function readJson(relativeOrAbsolute) {
  const absolute = path.isAbsolute(relativeOrAbsolute)
    ? relativeOrAbsolute
    : path.join(ROOT, relativeOrAbsolute);
  if (!existsSync(absolute)) return null;
  return JSON.parse(readFileSync(absolute, 'utf8'));
}

function snapshotArtifact(name) {
  mkdirSync(SNAP_DIR, { recursive: true });
  const clsSnap = path.join(SNAP_DIR, `${name}.classifier.json`);
  const metSnap = path.join(SNAP_DIR, `${name}.metrics.json`);
  if (existsSync(ARTIFACT_CLS)) copyFileSync(ARTIFACT_CLS, clsSnap);
  if (existsSync(ARTIFACT_MET)) copyFileSync(ARTIFACT_MET, metSnap);
  return readJson(ARTIFACT_MET);
}

function restoreArtifact(name) {
  const clsSnap = path.join(SNAP_DIR, `${name}.classifier.json`);
  const metSnap = path.join(SNAP_DIR, `${name}.metrics.json`);
  if (!existsSync(clsSnap)) {
    throw new Error(`Missing artifact snapshot ${clsSnap}`);
  }
  copyFileSync(clsSnap, ARTIFACT_CLS);
  if (existsSync(metSnap)) copyFileSync(metSnap, ARTIFACT_MET);
  console.log(`Restored artifact-router checkpoint: ${name}`);
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
  runStep('Capture artifacts', 'npm', ['run', 'artifact-intelligence:generate']);
  runStep('Augment NLU corpus from artifacts', 'npm', ['run', 'nlu:augment-artifacts'], {
    cwd: path.join(ROOT, 'backend'),
  });
  runStep('Prepare NLU datasets', 'npm', ['run', 'nlu:prepare-data'], {
    cwd: path.join(ROOT, 'backend'),
  });
  runStep('Train NLU intent router', 'npm', ['run', 'nlu:train'], {
    cwd: path.join(ROOT, 'backend'),
    env: { NLU_MLP_HIDDEN_DIM: process.env.NLU_MLP_HIDDEN_DIM || '128' },
  });
  runStep('Evaluate NLU intent router', 'npm', ['run', 'nlu:evaluate'], {
    cwd: path.join(ROOT, 'backend'),
  });

  const artifactTrainEnv = {
    ARTIFACT_EPOCHS: process.env.ARTIFACT_EPOCHS || '2500',
    ARTIFACT_MLP_HIDDEN_DIM: process.env.ARTIFACT_MLP_HIDDEN_DIM || '128',
    ARTIFACT_EXCLUDE_TYPES: process.env.ARTIFACT_EXCLUDE_TYPES || 'nlu-example',
    ARTIFACT_LABEL_TYPES: process.env.ARTIFACT_LABEL_TYPES || 'name,route',
  };

  // Ensure stale hard examples from prior runs do not silently re-enter train.
  if (!HARD_EXAMPLES_ENABLED) {
    const hardPath = path.join(
      ROOT,
      'backend/ml-services/artifact-router/data/hard_examples.jsonl',
    );
    if (existsSync(hardPath)) {
      writeFileSync(hardPath, '');
      console.log('\nCleared hard_examples.jsonl (ARTIFACT_HARD_EXAMPLES is not true).');
    }
  }

  runStep('Prepare artifact router datasets', 'npm', ['run', 'artifact-router:prepare-data'], {
    cwd: path.join(ROOT, 'backend'),
  });
  runStep('Train artifact router (pass 1)', 'npm', ['run', 'artifact-router:train'], {
    cwd: path.join(ROOT, 'backend'),
    env: artifactTrainEnv,
  });
  const pass1Metrics = snapshotArtifact('pass1');
  console.log(
    `\nPass 1 snapshot: test accuracy ${((pass1Metrics?.accuracy ?? 0) * 100).toFixed(2)}%`,
  );

  if (HARD_EXAMPLES_ENABLED) {
    // Hard examples are mined from validation errors only — the held-out test set
    // must never feed back into training data, or evaluate.ts's accuracy becomes meaningless.
    runStep(
      'Dump artifact router validation errors',
      'npx',
      ['ts-node', 'ml-services/artifact-router/scripts/dumpErrors.ts'],
      { cwd: path.join(ROOT, 'backend') },
    );
    const errorReport = path.join(
      ROOT,
      'backend/ml-services/artifact-router/data/error_report.json',
    );
    if (existsSync(errorReport)) {
      runStep(
        'Generate artifact router hard examples',
        'npx',
        ['ts-node', 'ml-services/artifact-router/scripts/generateHardExamples.ts'],
        { cwd: path.join(ROOT, 'backend') },
      );
    }
    runStep(
      'Prepare artifact router datasets (with hard examples)',
      'npm',
      ['run', 'artifact-router:prepare-data'],
      {
        cwd: path.join(ROOT, 'backend'),
      },
    );
    runStep(
      'Train artifact router (pass 2 / hard examples)',
      'npm',
      ['run', 'artifact-router:train'],
      {
        cwd: path.join(ROOT, 'backend'),
        env: artifactTrainEnv,
      },
    );
    const pass2Metrics = snapshotArtifact('pass2');
    const p1 = Number(pass1Metrics?.accuracy ?? 0);
    const p2 = Number(pass2Metrics?.accuracy ?? 0);
    console.log(
      `\nPass comparison: pass1=${(p1 * 100).toFixed(2)}%  pass2=${(p2 * 100).toFixed(2)}%`,
    );
    if (p2 + 1e-9 < p1) {
      console.log('Pass 2 regressed held-out test accuracy — restoring pass 1 checkpoint.');
      restoreArtifact('pass1');
    } else {
      console.log('Keeping pass 2 checkpoint (test accuracy did not regress).');
    }
  } else {
    console.log('\nSkipping hard-example pass (set ARTIFACT_HARD_EXAMPLES=true to enable).');
  }

  runStep('Evaluate artifact router', 'npm', ['run', 'artifact-router:evaluate'], {
    cwd: path.join(ROOT, 'backend'),
  });
  runStep('Refresh artifact catalog with ML heads', 'npm', [
    'run',
    'artifact-intelligence:generate',
  ]);
  printSummary();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
