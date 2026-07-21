import { existsSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { formatArtifactRouterInput } from '../../shared/router-input';
import { MODEL_PATHS, TRAINING_CONFIG, type ArtifactTargetMode } from './training.config';

export interface ArtifactTrainingExample {
  inputText: string;
  artifactId: string;
  category: string;
  artifactType: string;
  labelType: string;
  confidence: number;
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  values.push(current);
  return values;
}

export function loadArtifactTypeMap(catalogPath = path.join(MODEL_PATHS.trainingDataset, '..', '..', 'artifacts', 'caredroid_artifacts.json')) {
  const resolved = path.resolve(path.dirname(MODEL_PATHS.trainingDataset), '..', 'artifacts', 'caredroid_artifacts.json');
  if (!existsSync(resolved)) return {};
  const catalog = JSON.parse(readFileSync(resolved, 'utf8')) as Array<{ artifactId: string; type: string }>;
  return Object.fromEntries(catalog.map((item) => [item.artifactId, item.type || 'unknown']));
}

export function loadArtifactTrainingCsv(filePath = MODEL_PATHS.trainingDataset): ArtifactTrainingExample[] {
  if (!existsSync(filePath)) return [];

  const typeMap = loadArtifactTypeMap();
  const lines = readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  const index = Object.fromEntries(headers.map((header, idx) => [header, idx]));

  return lines.slice(1).map((line) => {
    const cols = parseCsvLine(line);
    const artifactId = cols[index.targetArtifactId] ?? '';
    return {
      inputText: cols[index.inputText] ?? '',
      artifactId,
      category: cols[index.targetCategory] ?? '',
      artifactType: typeMap[artifactId] || 'unknown',
      labelType: cols[index.labelType] ?? '',
      confidence: Number(cols[index.confidence] ?? 0),
    };
  });
}

export function formatRouterExamples(rows: ArtifactTrainingExample[]): ArtifactTrainingExample[] {
  return rows.map((row) => {
    const labelType = row.labelType === 'route' ? 'route' : 'name';
    // Pass gold artifactType so structural type prefixes (platform / api-endpoint /
    // backend-service) and agreeing path: families match the original high-score
    // formatting. Conflicting path families are suppressed inside the formatter.
    return {
      ...row,
      inputText: formatArtifactRouterInput(row.inputText, labelType, row.artifactType),
    };
  });
}

export function loadHardExamples(
  filePath = path.join(path.dirname(MODEL_PATHS.trainData), 'hard_examples.jsonl'),
): ArtifactTrainingExample[] {
  return loadJsonlDataset(filePath);
}

export function filterRouterExamples(rows: ArtifactTrainingExample[]): ArtifactTrainingExample[] {
  const allowed = new Set(TRAINING_CONFIG.labelTypes);
  return rows.filter(
    (row) =>
      row.inputText &&
      row.artifactId &&
      allowed.has(row.labelType) &&
      row.confidence >= TRAINING_CONFIG.minConfidence,
  );
}

export function enrichArtifactTypes(rows: ArtifactTrainingExample[]): ArtifactTrainingExample[] {
  const typeMap = loadArtifactTypeMap();
  return rows.map((row) => ({
    ...row,
    artifactType: typeMap[row.artifactId] || row.artifactType || 'unknown',
  }));
}

export function filterByMinClassSize(
  rows: ArtifactTrainingExample[],
  mode: ArtifactTargetMode = TRAINING_CONFIG.targetMode,
  minExamples = TRAINING_CONFIG.minExamplesPerClass,
): ArtifactTrainingExample[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const label = resolveLabelKey(row, mode);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  const allowed = new Set([...counts.entries()].filter(([, count]) => count >= minExamples).map(([label]) => label));
  return rows.filter((row) => allowed.has(resolveLabelKey(row, mode)));
}

export function excludeArtifactTypes(
  rows: ArtifactTrainingExample[],
  excludedTypes: readonly string[] = TRAINING_CONFIG.excludeArtifactTypes,
): ArtifactTrainingExample[] {
  if (!excludedTypes.length) return rows;
  const blocked = new Set(excludedTypes);
  return rows.filter((row) => !blocked.has(row.artifactType));
}

export function collapseRareArtifactTypes(
  rows: ArtifactTrainingExample[],
  mode: ArtifactTargetMode = TRAINING_CONFIG.targetMode,
  minNativeExamples = TRAINING_CONFIG.minNativeExamples,
  collapsedLabel = TRAINING_CONFIG.collapsedRareLabel,
): ArtifactTrainingExample[] {
  if (mode !== 'artifact-type' || minNativeExamples <= 0 || !TRAINING_CONFIG.collapseRareTypes) {
    return rows;
  }

  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.artifactType, (counts.get(row.artifactType) ?? 0) + 1);
  }
  const native = new Set(
    [...counts.entries()].filter(([, count]) => count >= minNativeExamples).map(([label]) => label),
  );

  return rows.map((row) => ({
    ...row,
    artifactType: native.has(row.artifactType) ? row.artifactType : collapsedLabel,
  }));
}

export function oversampleWeakClasses(
  rows: ArtifactTrainingExample[],
  mode: ArtifactTargetMode = TRAINING_CONFIG.targetMode,
  weakTypes: readonly string[] = TRAINING_CONFIG.oversampleWeakTypes,
  multiplier = TRAINING_CONFIG.oversampleMultiplier,
): ArtifactTrainingExample[] {
  if (multiplier <= 1 || weakTypes.length === 0) return rows;
  const weak = new Set(weakTypes);
  const extra: ArtifactTrainingExample[] = [];
  for (const row of rows) {
    if (!weak.has(resolveLabelKey(row, mode))) continue;
    for (let i = 1; i < multiplier; i++) extra.push({ ...row });
  }
  return [...rows, ...extra];
}

export function balanceMaxPerClass(
  rows: ArtifactTrainingExample[],
  mode: ArtifactTargetMode = TRAINING_CONFIG.targetMode,
  maxPerClass = TRAINING_CONFIG.maxExamplesPerClass,
  seed = TRAINING_CONFIG.seed,
): ArtifactTrainingExample[] {
  if (!Number.isFinite(maxPerClass) || maxPerClass <= 0) return rows;

  const rng = mulberry32(seed);
  const byLabel = new Map<string, ArtifactTrainingExample[]>();
  for (const row of rows) {
    const label = resolveLabelKey(row, mode);
    const group = byLabel.get(label) ?? [];
    group.push(row);
    byLabel.set(label, group);
  }

  const balanced: ArtifactTrainingExample[] = [];
  for (const group of byLabel.values()) {
    balanced.push(...shuffle(group, rng).slice(0, maxPerClass));
  }
  return balanced;
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

export function resolveLabelKey(example: ArtifactTrainingExample, mode: ArtifactTargetMode = 'artifact-type'): string {
  if (mode === 'artifact') return example.artifactId;
  if (mode === 'category') return example.category;
  return example.artifactType;
}

export function stratifiedSplitByLabel(
  data: ArtifactTrainingExample[],
  testSize: number,
  seed: number,
  mode: ArtifactTargetMode = TRAINING_CONFIG.targetMode,
): [ArtifactTrainingExample[], ArtifactTrainingExample[]] {
  const rng = mulberry32(seed);
  const byLabel = new Map<string, ArtifactTrainingExample[]>();

  for (const item of data) {
    const label = resolveLabelKey(item, mode);
    const group = byLabel.get(label) ?? [];
    group.push(item);
    byLabel.set(label, group);
  }

  const train: ArtifactTrainingExample[] = [];
  const test: ArtifactTrainingExample[] = [];

  for (const group of byLabel.values()) {
    const shuffled = shuffle(group, rng);
    const testCount = Math.max(1, Math.round(shuffled.length * testSize));
    if (shuffled.length <= 1) {
      train.push(...shuffled);
      continue;
    }
    test.push(...shuffled.slice(0, testCount));
    train.push(...shuffled.slice(testCount));
  }

  return [train, test];
}

export function writeJsonlDataset(filepath: string, data: ArtifactTrainingExample[]): void {
  const content = data.map((item) => JSON.stringify(item)).join('\n') + '\n';
  writeFileSync(filepath, content, 'utf8');
}

export function loadJsonlDataset(filepath: string): ArtifactTrainingExample[] {
  if (!existsSync(filepath)) return [];
  return readFileSync(filepath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as ArtifactTrainingExample);
}

export function buildLabelMaps(examples: ArtifactTrainingExample[], mode: ArtifactTargetMode = TRAINING_CONFIG.targetMode) {
  const labelIds = [...new Set(examples.map((row) => resolveLabelKey(row, mode)))].sort();
  const keyToLabel = Object.fromEntries(labelIds.map((id, index) => [id, index]));
  const labelToKey = Object.fromEntries(labelIds.map((id, index) => [index, id]));
  return { labelIds, keyToLabel, labelToKey, numClasses: labelIds.length, mode };
}