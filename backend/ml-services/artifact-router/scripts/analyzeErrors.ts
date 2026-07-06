import { existsSync } from 'fs';
import { embedText } from '../../nlu/training/embeddings';
import { loadAnyClassifier, predictFromAny } from '../../nlu/training/classifier';
import { resolveClassifierPath } from '../../shared/paths';
import { loadJsonlDataset, resolveLabelKey } from '../training/dataset';
import { MODEL_PATHS, TRAINING_CONFIG } from '../training/training.config';

async function analyzeErrors(): Promise<void> {
  const testData = loadJsonlDataset(MODEL_PATHS.testData);
  const weightsPath = resolveClassifierPath('artifact-router');
  if (!existsSync(weightsPath) || testData.length === 0) {
    console.error('Missing classifier or test data');
    return;
  }

  const classifier = loadAnyClassifier(weightsPath);
  const labelNames = classifier.labelToIntent ?? {};
  const confusion = new Map<string, Map<string, number>>();
  const wrong: Array<{ text: string; expected: string; predicted: string; labelType: string }> = [];

  for (const example of testData) {
    const embedding = await embedText(example.inputText);
    const { labelId, confidence } = predictFromAny(classifier, embedding);
    const predicted = labelNames[labelId] ?? 'unknown';
    const expected = resolveLabelKey(example, TRAINING_CONFIG.targetMode);
    if (!confusion.has(expected)) confusion.set(expected, new Map());
    const row = confusion.get(expected)!;
    row.set(predicted, (row.get(predicted) ?? 0) + 1);
    if (predicted !== expected) {
      wrong.push({
        text: example.inputText.slice(0, 60),
        expected,
        predicted,
        labelType: example.labelType,
      });
    }
    void confidence;
  }

  console.log(`Errors: ${wrong.length}/${testData.length} (${((wrong.length / testData.length) * 100).toFixed(2)}% wrong)`);
  console.log('\nPer-class accuracy:');
  for (const [expected, preds] of [...confusion.entries()].sort()) {
    const total = [...preds.values()].reduce((a, b) => a + b, 0);
    const correct = preds.get(expected) ?? 0;
    console.log(`  ${expected.padEnd(18)} ${((correct / total) * 100).toFixed(1)}% (${correct}/${total})`);
  }

  console.log('\nTop confusion pairs:');
  const pairs: Array<{ expected: string; predicted: string; count: number }> = [];
  for (const [expected, preds] of confusion) {
    for (const [predicted, count] of preds) {
      if (expected !== predicted) pairs.push({ expected, predicted, count });
    }
  }
  pairs.sort((a, b) => b.count - a.count).slice(0, 12).forEach((p) => {
    console.log(`  ${p.expected} → ${p.predicted}: ${p.count}`);
  });

  console.log('\nSample errors by labelType:');
  const byLabelType = new Map<string, number>();
  wrong.forEach((w) => byLabelType.set(w.labelType, (byLabelType.get(w.labelType) ?? 0) + 1));
  for (const [lt, n] of [...byLabelType.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${lt}: ${n}`);
  }
}

if (require.main === module) {
  analyzeErrors().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}