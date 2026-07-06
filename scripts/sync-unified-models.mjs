#!/usr/bin/env node
/**
 * Copies legacy per-service classifier weights into the unified models directory
 * and refreshes manifest.json. Safe to run after upgrading an existing checkout.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const UNIFIED = path.join(ROOT, 'backend', 'ml-services', 'models');

const HEADS = [
  {
    head: 'nlu',
    legacyClassifier: path.join(ROOT, 'backend', 'ml-services', 'nlu', 'models', 'best_model', 'classifier.json'),
    legacyMetrics: path.join(ROOT, 'backend', 'ml-services', 'nlu', 'metrics.json'),
  },
  {
    head: 'artifact-router',
    legacyClassifier: path.join(
      ROOT,
      'backend',
      'ml-services',
      'artifact-router',
      'models',
      'best_model',
      'classifier.json',
    ),
    legacyMetrics: path.join(ROOT, 'backend', 'ml-services', 'artifact-router', 'metrics.json'),
  },
];

function copyIfExists(source, target) {
  if (!existsSync(source)) return false;
  mkdirSync(path.dirname(target), { recursive: true });
  copyFileSync(source, target);
  return true;
}

const manifest = {
  version: 1,
  name: 'caredroid-unified-ai-node',
  updatedAt: new Date().toISOString(),
  embeddingModel: 'Xenova/all-mpnet-base-v2',
  heads: {},
};

for (const { head, legacyClassifier, legacyMetrics } of HEADS) {
  const classifierTarget = path.join(UNIFIED, head, 'classifier.json');
  const metricsTarget = path.join(UNIFIED, head, 'metrics.json');
  const copiedClassifier = copyIfExists(legacyClassifier, classifierTarget);
  const copiedMetrics = copyIfExists(legacyMetrics, metricsTarget);

  let metrics = null;
  if (existsSync(metricsTarget)) {
    metrics = JSON.parse(readFileSync(metricsTarget, 'utf8'));
  }

  manifest.heads[head] = {
    classifierPath: classifierTarget,
    metricsPath: metricsTarget,
    architecture: metrics?.architecture,
    accuracy: metrics?.accuracy,
    numClasses: metrics?.numClasses,
    targetMode: metrics?.targetMode,
    embeddingModel: metrics?.embeddingModel,
    testSetSize: metrics?.testSetSize,
    trainedAt: metrics?.trainedAt,
    evaluatedAt: metrics?.evaluatedAt,
    syncedFromLegacy: copiedClassifier || copiedMetrics,
  };

  console.log(
    `${head}: classifier ${copiedClassifier ? 'copied' : 'skipped'}, metrics ${copiedMetrics ? 'copied' : 'skipped'}`,
  );
}

writeFileSync(path.join(UNIFIED, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`Wrote ${path.join(UNIFIED, 'manifest.json')}`);