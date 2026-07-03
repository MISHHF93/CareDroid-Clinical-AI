// TypeScript replacement for _deprecated-python/prepare_data.py
// Usage: ts-node scripts/prepareData.ts

import { loadJsonlDataset, writeJsonlDataset, stratifiedSplit, intentDistribution } from '../training/dataset';
import { MODEL_PATHS, TRAINING_CONFIG } from '../training/training.config';

function prepareDatasets(): void {
  const trainFile = MODEL_PATHS.trainingData;
  const data = loadJsonlDataset(trainFile);

  if (data.length === 0) {
    console.error(`Training file not found or empty: ${trainFile}`);
    return;
  }

  console.log(`Loaded ${data.length} examples from ${trainFile}`);

  const distribution = intentDistribution(data);
  console.log('\nIntent distribution:');
  for (const [intent, count] of Object.entries(distribution).sort()) {
    const pct = ((count / data.length) * 100).toFixed(1);
    console.log(`  ${intent.padEnd(20)}: ${String(count).padStart(3)} (${pct.padStart(5)}%)`);
  }

  // 80/10/10 stratified split, matching prepare_data.py
  const [train, rest] = stratifiedSplit(data, 0.2, TRAINING_CONFIG.seed);
  const [val, test] = stratifiedSplit(rest, 0.5, TRAINING_CONFIG.seed);

  writeJsonlDataset(trainFile, train);
  writeJsonlDataset(MODEL_PATHS.validationData, val);
  writeJsonlDataset(MODEL_PATHS.testData, test);

  console.log(`\nTrain: ${train.length} examples`);
  console.log(`Val:   ${val.length} examples`);
  console.log(`Test:  ${test.length} examples`);
  console.log('\nData preparation complete. Next: npm run nlu:train');
}

if (require.main === module) {
  prepareDatasets();
}

export { prepareDatasets };
