import { mkdirSync } from 'fs';
import path from 'path';
import {
  balanceMaxPerClass,
  collapseRareArtifactTypes,
  enrichArtifactTypes,
  excludeArtifactTypes,
  filterByMinClassSize,
  filterRouterExamples,
  formatRouterExamples,
  loadArtifactTrainingCsv,
  loadHardExamples,
  resolveLabelKey,
  stratifiedSplitByLabel,
  writeJsonlDataset,
} from '../training/dataset';
import { MODEL_PATHS, TRAINING_CONFIG } from '../training/training.config';

function prepareArtifactRouterData(): void {
  mkdirSync(path.dirname(MODEL_PATHS.trainData), { recursive: true });

  const raw = loadArtifactTrainingCsv();
  const deduped = filterRouterExamples(raw).filter((row, index, rows) => {
    const key = row.inputText.trim().toLowerCase();
    return rows.findIndex((candidate) => candidate.inputText.trim().toLowerCase() === key) === index;
  });
  let filtered = filterByMinClassSize(
    excludeArtifactTypes(enrichArtifactTypes(deduped)),
    TRAINING_CONFIG.targetMode,
    TRAINING_CONFIG.minExamplesPerClass,
  );
  if (TRAINING_CONFIG.maxExamplesPerClass > 0) {
    filtered = balanceMaxPerClass(
      filtered,
      TRAINING_CONFIG.targetMode,
      TRAINING_CONFIG.maxExamplesPerClass,
      TRAINING_CONFIG.seed,
    );
  }
  filtered = collapseRareArtifactTypes(filtered, TRAINING_CONFIG.targetMode);
  filtered = formatRouterExamples(filtered);

  if (filtered.length === 0) {
    console.error(`No artifact training rows found at ${MODEL_PATHS.trainingDataset}`);
    return;
  }

  console.log(`Loaded ${raw.length} artifact training rows`);
  console.log(`Filtered to ${filtered.length} router examples (${TRAINING_CONFIG.labelTypes.join(', ')})`);

  const [train, rest] = stratifiedSplitByLabel(filtered, 0.2, TRAINING_CONFIG.seed, TRAINING_CONFIG.targetMode);
  const [val, test] = stratifiedSplitByLabel(rest, 0.5, TRAINING_CONFIG.seed, TRAINING_CONFIG.targetMode);
  // Collapse + re-format hard examples so they cannot reintroduce rare types that
  // were already merged into `platform` (that previously ballooned class count
  // from 11 → 14 and diluted the head).
  const hardExamples = collapseRareArtifactTypes(
    formatRouterExamples(enrichArtifactTypes(loadHardExamples())),
    TRAINING_CONFIG.targetMode,
  );
  const knownLabels = new Set(filtered.map((row) => resolveLabelKey(row, TRAINING_CONFIG.targetMode)));
  const safeHard = hardExamples.filter((row) => knownLabels.has(resolveLabelKey(row, TRAINING_CONFIG.targetMode)));
  const mergedTrain = [...train, ...safeHard];

  writeJsonlDataset(MODEL_PATHS.trainData, mergedTrain);
  writeJsonlDataset(MODEL_PATHS.validationData, val);
  writeJsonlDataset(MODEL_PATHS.testData, test);

  const labels = new Set(filtered.map((row) => resolveLabelKey(row, TRAINING_CONFIG.targetMode)));
  const artifacts = new Set(filtered.map((row) => row.artifactId));

  console.log(`Target mode: ${TRAINING_CONFIG.targetMode}`);
  console.log(`Labels:    ${labels.size}`);
  console.log(`Artifacts: ${artifacts.size}`);
  if (safeHard.length) console.log(`Hard examples appended to train: ${safeHard.length}`);
  console.log(`Train: ${mergedTrain.length}`);
  console.log(`Val:   ${val.length}`);
  console.log(`Test:  ${test.length}`);
}

if (require.main === module) {
  prepareArtifactRouterData();
}

export { prepareArtifactRouterData };