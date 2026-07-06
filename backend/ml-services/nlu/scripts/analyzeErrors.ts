import { existsSync } from 'fs';
import { embedText } from '../training/embeddings';
import { loadAnyClassifier, predictFromAny } from '../training/classifier';
import { resolveClassifierPath } from '../../shared/paths';
import { loadJsonlDataset } from '../training/dataset';
import { MODEL_PATHS, INTENT_LABELS } from '../training/training.config';

async function analyzeNluErrors(): Promise<void> {
  const testData = loadJsonlDataset(MODEL_PATHS.testData);
  const weightsPath = resolveClassifierPath('nlu');
  if (!existsSync(weightsPath) || testData.length === 0) return;

  const classifier = loadAnyClassifier(weightsPath);
  const wrong: Array<{ text: string; expected: string; predicted: string; confidence: number }> = [];

  for (const example of testData) {
    const embedding = await embedText(example.text);
    const { labelId, confidence } = predictFromAny(classifier, embedding);
    const predicted = classifier.labelToIntent?.[labelId] ?? 'unknown';
    if (predicted !== example.intent) {
      wrong.push({ text: example.text, expected: example.intent, predicted, confidence });
    }
  }

  console.log(`NLU errors: ${wrong.length}/${testData.length}`);
  wrong.forEach((w) => console.log(JSON.stringify(w)));
}

if (require.main === module) {
  analyzeNluErrors().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}