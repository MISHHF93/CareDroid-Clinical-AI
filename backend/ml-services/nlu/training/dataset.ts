// TypeScript replacement for the dataset-loading portions of
// _deprecated-python/train.py (load_jsonl_dataset, prepare_dataset) and
// _deprecated-python/prepare_data.py (stratified splitting).

import { readFileSync, writeFileSync, existsSync } from 'fs';

export interface NluExample {
  text: string;
  intent: string;
  subcategory?: string;
}

export function loadJsonlDataset(filepath: string): NluExample[] {
  if (!existsSync(filepath)) {
    return [];
  }
  return readFileSync(filepath, 'utf-8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
    .map((line) => JSON.parse(line) as NluExample);
}

export function writeJsonlDataset(filepath: string, data: NluExample[]): void {
  const content = data.map((item) => JSON.stringify(item)).join('\n') + '\n';
  writeFileSync(filepath, content, 'utf-8');
}

// Deterministic PRNG (mulberry32) so splits are reproducible given the same seed,
// mirroring sklearn's `random_state` parameter.
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

/** Plain (non-stratified) split, matching train.py's fallback when no dedicated val/test files exist. */
export function splitDataset(
  data: NluExample[],
  testSize: number,
  seed: number,
): [NluExample[], NluExample[]] {
  const shuffled = shuffle(data, mulberry32(seed));
  const testCount = Math.round(shuffled.length * testSize);
  return [shuffled.slice(testCount), shuffled.slice(0, testCount)];
}

/** Stratified split — preserves per-intent class proportions, matching prepare_data.py's use of sklearn's stratify=. */
export function stratifiedSplit(
  data: NluExample[],
  testSize: number,
  seed: number,
): [NluExample[], NluExample[]] {
  const rng = mulberry32(seed);
  const byIntent = new Map<string, NluExample[]>();
  for (const item of data) {
    const group = byIntent.get(item.intent) ?? [];
    group.push(item);
    byIntent.set(item.intent, group);
  }

  const train: NluExample[] = [];
  const test: NluExample[] = [];

  for (const group of byIntent.values()) {
    const shuffled = shuffle(group, rng);
    const testCount = Math.max(1, Math.round(shuffled.length * testSize));
    test.push(...shuffled.slice(0, testCount));
    train.push(...shuffled.slice(testCount));
  }

  return [train, test];
}

export function intentDistribution(data: NluExample[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of data) {
    counts[item.intent] = (counts[item.intent] ?? 0) + 1;
  }
  return counts;
}

export interface PreparedDataset {
  train: NluExample[];
  val: NluExample[];
  test: NluExample[];
}

/** Port of train.py's prepare_dataset(): use dedicated val/test files if present, else split off from train. */
export function prepareDataset(paths: {
  trainingData: string;
  validationData: string;
  testData: string;
}, seed: number): PreparedDataset {
  const trainData = loadJsonlDataset(paths.trainingData);
  const dedicatedVal = loadJsonlDataset(paths.validationData);
  const dedicatedTest = loadJsonlDataset(paths.testData);

  if (dedicatedVal.length > 0 || dedicatedTest.length > 0) {
    return { train: trainData, val: dedicatedVal, test: dedicatedTest };
  }

  const [train, valTest] = splitDataset(trainData, 0.3, seed);
  const [val, test] = splitDataset(valTest, 0.5, seed);
  return { train, val, test };
}
