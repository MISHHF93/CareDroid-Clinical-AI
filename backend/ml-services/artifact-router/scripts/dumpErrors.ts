import { existsSync, writeFileSync } from 'fs';
import path from 'path';
import { formatArtifactRouterInput } from '../../shared/router-input';
import { embedTextCached as embedText } from '../../nlu/training/embeddingsCache';
import { loadAnyClassifier, predictFromAny } from '../../nlu/training/classifier';
import { resolveClassifierPath } from '../../shared/paths';
import { loadJsonlDataset, resolveLabelKey } from '../training/dataset';
import { MODEL_PATHS, TRAINING_CONFIG } from '../training/training.config';

async function dumpErrors(): Promise<void> {
  // Mine errors from validation data only — the held-out test set must never
  // feed back into training data (hard examples merge into train via prepareData.ts).
  const evalData = loadJsonlDataset(MODEL_PATHS.validationData);
  const weightsPath = resolveClassifierPath('artifact-router');
  if (!existsSync(weightsPath)) return;

  const classifier = loadAnyClassifier(weightsPath);
  const labelNames = classifier.labelToIntent ?? {};
  const wrong: Array<Record<string, unknown>> = [];

  for (const example of evalData) {
    const embedding = await embedText(
      example.inputText.startsWith('name:') || example.inputText.startsWith('route:')
        ? example.inputText
        : formatArtifactRouterInput(
            example.inputText,
            example.labelType === 'route' ? 'route' : 'name',
            example.artifactType,
          ),
    );
    const { labelId, confidence } = predictFromAny(classifier, embedding);
    const predicted = labelNames[labelId] ?? 'unknown';
    const expected = resolveLabelKey(example, TRAINING_CONFIG.targetMode);
    if (predicted !== expected) {
      wrong.push({
        inputText: example.inputText,
        expected,
        predicted,
        confidence,
        labelType: example.labelType,
        artifactId: example.artifactId,
        artifactType: example.artifactType,
      });
    }
  }

  const out = path.join(path.dirname(MODEL_PATHS.validationData), 'error_report.json');
  writeFileSync(out, JSON.stringify(wrong, null, 2));
  console.log(`Wrote ${wrong.length} errors to ${out}`);
  wrong.forEach((w) => console.log(`${w.expected} -> ${w.predicted} | ${w.labelType} | ${w.inputText}`));
}

if (require.main === module) {
  dumpErrors().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}