// TypeScript replacement for _deprecated-python/train.py
// Usage: ts-node scripts/train.ts

import { writeFileSync } from 'fs';
import { prepareDataset } from '../training/dataset';
import { embedBatch } from '../training/embeddings';
import {
  trainClassifier,
  predictFromAny,
  saveAnyClassifier,
  classifierWeightsPath,
  type AnyClassifierWeights,
} from '../training/classifier';
import { trainMlpClassifier } from '../training/mlpClassifier';
import { INTENT_LABELS, LABEL_TO_INTENT, MODEL_CONFIG, MODEL_PATHS, TRAINING_CONFIG } from '../training/training.config';

const MLP_CONFIG = {
  numEpochs: TRAINING_CONFIG.numEpochs,
  learningRate: TRAINING_CONFIG.learningRate,
  l2Reg: TRAINING_CONFIG.l2Reg,
  hiddenDim: Number(process.env.NLU_MLP_HIDDEN_DIM ?? 64),
  seed: TRAINING_CONFIG.seed,
};

async function train(): Promise<void> {
  console.log(`Loading embedding model: ${MODEL_CONFIG.embeddingModelName}`);
  console.log('Loading dataset...');

  const { train: trainData, val: valData, test: testData } = prepareDataset(MODEL_PATHS, TRAINING_CONFIG.seed);
  console.log(`Dataset sizes - Train: ${trainData.length}, Val: ${valData.length}, Test: ${testData.length}`);

  if (trainData.length === 0) {
    console.error('No training data found. Run scripts/prepareData.ts first.');
    return;
  }

  console.log('Computing embeddings for training set...');
  const trainEmbeddings = await embedBatch(trainData.map((d) => d.text));
  const trainLabels = trainData.map((d) => INTENT_LABELS[d.intent as keyof typeof INTENT_LABELS]);
  const numClasses = Object.keys(INTENT_LABELS).length;

  let validation: { embeddings: number[][]; labels: number[] } | undefined;
  if (valData.length > 0) {
    console.log('Computing embeddings for validation set...');
    validation = {
      embeddings: await embedBatch(valData.map((d) => d.text)),
      labels: valData.map((d) => INTENT_LABELS[d.intent as keyof typeof INTENT_LABELS]),
    };
  }

  console.log('Training linear (softmax regression) classifier head...');
  const linearResult = trainClassifier(
    trainEmbeddings,
    trainLabels,
    numClasses,
    LABEL_TO_INTENT,
    MODEL_CONFIG.embeddingModelName,
    TRAINING_CONFIG,
    validation,
  );
  console.log(
    `  Linear: train loss ${linearResult.epochLosses[0]?.toFixed(4)} -> ${linearResult.finalLoss.toFixed(4)}` +
      (linearResult.bestValLoss !== null ? `, best val loss ${linearResult.bestValLoss.toFixed(4)}` : ''),
  );

  console.log(`Training MLP (hidden dim ${MLP_CONFIG.hiddenDim}) classifier head...`);
  const mlpResult = trainMlpClassifier(
    trainEmbeddings,
    trainLabels,
    numClasses,
    LABEL_TO_INTENT,
    MODEL_CONFIG.embeddingModelName,
    MLP_CONFIG,
    validation,
  );
  console.log(
    `  MLP: train loss ${mlpResult.epochLosses[0]?.toFixed(4)} -> ${mlpResult.finalLoss.toFixed(4)}` +
      (mlpResult.bestValLoss !== null ? `, best val loss ${mlpResult.bestValLoss.toFixed(4)}` : ''),
  );

  // Pick whichever architecture generalizes better on the held-out validation set
  // (falls back to the linear model if there's no validation split to compare on).
  let chosen: AnyClassifierWeights = linearResult.weights;
  let chosenName = 'linear';
  if (
    validation &&
    linearResult.bestValLoss !== null &&
    mlpResult.bestValLoss !== null &&
    mlpResult.bestValLoss < linearResult.bestValLoss
  ) {
    chosen = mlpResult.weights;
    chosenName = 'mlp';
  }
  console.log(`Selected architecture: ${chosenName}`);

  const outputPath = classifierWeightsPath(MODEL_PATHS.bestModelDir);
  saveAnyClassifier(chosen, outputPath);
  console.log(`Saved trained classifier to ${outputPath}`);

  if (testData.length > 0) {
    console.log('Evaluating on test set...');
    const testEmbeddings = await embedBatch(testData.map((d) => d.text));
    const testLabels = testData.map((d) => INTENT_LABELS[d.intent as keyof typeof INTENT_LABELS]);

    let correct = 0;
    for (let i = 0; i < testEmbeddings.length; i++) {
      const { labelId } = predictFromAny(chosen, testEmbeddings[i]);
      if (labelId === testLabels[i]) correct++;
    }
    const accuracy = correct / testEmbeddings.length;
    console.log(`Test accuracy: ${(accuracy * 100).toFixed(2)}% (${chosenName})`);

    writeFileSync(
      MODEL_PATHS.metricsOutput,
      JSON.stringify({ accuracy, testSetSize: testData.length, architecture: chosenName }, null, 2),
    );
  }

  console.log('Training completed!');
}

if (require.main === module) {
  train().catch((err) => {
    console.error('Training failed:', err);
    process.exitCode = 1;
  });
}

export { train };
