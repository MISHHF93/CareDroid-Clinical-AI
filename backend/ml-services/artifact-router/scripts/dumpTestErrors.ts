import { writeFileSync } from 'fs';
import path from 'path';
import { loadAnyClassifier, predictFromAny } from '../../nlu/training/classifier';
import { embedTextCached as embedText } from '../../nlu/training/embeddingsCache';
import { resolveClassifierPath } from '../../shared/paths';
import { loadJsonlDataset, resolveLabelKey } from '../training/dataset';
import { MODEL_PATHS, TRAINING_CONFIG } from '../training/training.config';

async function main(): Promise<void> {
  const testData = loadJsonlDataset(MODEL_PATHS.testData);
  const classifier = loadAnyClassifier(resolveClassifierPath('artifact-router'));
  const labelNames = classifier.labelToIntent ?? {};
  const wrong: Array<Record<string, unknown>> = [];

  for (const example of testData) {
    const emb = await embedText(example.inputText);
    const { labelId, confidence } = predictFromAny(classifier, emb);
    const predicted = labelNames[labelId] ?? 'unknown';
    const expected = resolveLabelKey(example, TRAINING_CONFIG.targetMode);
    if (predicted !== expected) {
      wrong.push({
        inputText: example.inputText,
        expected,
        predicted,
        confidence,
        artifactId: example.artifactId,
        labelType: example.labelType,
      });
    }
  }

  const out = path.join(path.dirname(MODEL_PATHS.testData), 'test_error_report.json');
  writeFileSync(out, JSON.stringify(wrong, null, 2));
  console.log(
    `wrong=${wrong.length}/${testData.length} acc=${(((testData.length - wrong.length) / testData.length) * 100).toFixed(2)}%`,
  );
  for (const w of wrong) {
    console.log(`${w.expected} -> ${w.predicted} | ${w.labelType} | ${String(w.inputText).slice(0, 120)}`);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
