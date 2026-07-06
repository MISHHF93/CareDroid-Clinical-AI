import { writeFileSync } from 'fs';
import { updateHeadManifest } from '../../shared/manifest';
import { embedTextCached as embedText } from '../../nlu/training/embeddingsCache';
import {
  trainClassifier,
  predictFromAny,
  saveAnyClassifier,
  classifierWeightsPath,
  type AnyClassifierWeights,
} from '../../nlu/training/classifier';
import { trainMlpClassifier } from '../../nlu/training/mlpClassifier';
import { computeClassWeights } from '../training/classWeights';
import { buildLabelMaps, loadJsonlDataset, oversampleWeakClasses, resolveLabelKey } from '../training/dataset';
import { MODEL_CONFIG, MODEL_PATHS, TRAINING_CONFIG } from '../training/training.config';

async function embedWithProgress(texts: string[], label: string): Promise<number[][]> {
  const embeddings: number[][] = [];
  const total = texts.length;
  const step = Math.max(1, Math.floor(total / 10));
  for (let i = 0; i < texts.length; i++) {
    embeddings.push(await embedText(texts[i]));
    if (i === 0 || i === total - 1 || (i + 1) % step === 0) {
      console.log(`  ${label}: ${i + 1}/${total} embeddings`);
    }
  }
  return embeddings;
}

const MLP_CONFIG = {
  numEpochs: TRAINING_CONFIG.numEpochs,
  learningRate: TRAINING_CONFIG.learningRate,
  l2Reg: TRAINING_CONFIG.l2Reg,
  hiddenDim: Number(process.env.ARTIFACT_MLP_HIDDEN_DIM ?? 128),
  seed: TRAINING_CONFIG.seed,
  patience: Number(process.env.ARTIFACT_MLP_PATIENCE ?? 300),
};

async function trainArtifactRouter(): Promise<void> {
  const trainData = oversampleWeakClasses(loadJsonlDataset(MODEL_PATHS.trainData), TRAINING_CONFIG.targetMode);
  const valData = loadJsonlDataset(MODEL_PATHS.validationData);
  const testData = loadJsonlDataset(MODEL_PATHS.testData);

  if (trainData.length === 0) {
    console.error('No artifact router training data. Run scripts/prepareData.ts first.');
    return;
  }

  const { keyToLabel, labelToKey, numClasses, mode } = buildLabelMaps(
    [...trainData, ...valData, ...testData],
    TRAINING_CONFIG.targetMode,
  );

  console.log(`Embedding model: ${MODEL_CONFIG.embeddingModelName}`);
  console.log(`Target mode: ${mode}`);
  console.log(`Classes: ${numClasses}`);
  console.log(`Train ${trainData.length} | Val ${valData.length} | Test ${testData.length}`);

  console.log('Computing embeddings...');
  const trainEmbeddings = await embedWithProgress(trainData.map((row) => row.inputText), 'train');
  const labelFor = (row: (typeof trainData)[number]) => keyToLabel[resolveLabelKey(row, mode)];
  const trainLabels = trainData.map(labelFor);

  let validation: { embeddings: number[][]; labels: number[] } | undefined;
  if (valData.length > 0) {
    validation = {
      embeddings: await embedWithProgress(valData.map((row) => row.inputText), 'val'),
      labels: valData.map(labelFor),
    };
  }

  const invalidLabels = trainLabels.filter((label) => label === undefined || Number.isNaN(label));
  if (invalidLabels.length > 0) {
    throw new Error(`Artifact router has ${invalidLabels.length} training rows with unmapped labels`);
  }

  const classWeights = TRAINING_CONFIG.useClassWeights
    ? computeClassWeights(trainLabels, numClasses)
    : undefined;
  if (classWeights) {
    console.log('Using inverse-frequency class weights');
  }

  console.log('Training linear (softmax regression) classifier head...');
  const linearResult = trainClassifier(
    trainEmbeddings,
    trainLabels,
    numClasses,
    labelToKey,
    MODEL_CONFIG.embeddingModelName,
    TRAINING_CONFIG,
    validation,
    classWeights,
  );
  console.log(
    `  Linear: train loss ${linearResult.epochLosses[0]?.toFixed(4)} -> ${linearResult.finalLoss.toFixed(4)}` +
      (linearResult.bestValLoss !== null ? `, best val loss ${linearResult.bestValLoss.toFixed(4)}` : ''),
  );

  // MLP heads become impractically slow beyond a few hundred classes; the linear
  // softmax head is the right default for full-catalog artifact routing.
  let chosen: AnyClassifierWeights = linearResult.weights;
  let chosenName = 'linear';
  const mlpClassLimit = Number(process.env.ARTIFACT_MLP_CLASS_LIMIT ?? 400);
  if (numClasses <= mlpClassLimit) {
    console.log(`Training MLP (hidden dim ${MLP_CONFIG.hiddenDim}) classifier head...`);
    const mlpResult = trainMlpClassifier(
      trainEmbeddings,
      trainLabels,
      numClasses,
      labelToKey,
      MODEL_CONFIG.embeddingModelName,
      MLP_CONFIG,
      validation,
      classWeights,
    );
    console.log(
      `  MLP: train loss ${mlpResult.epochLosses[0]?.toFixed(4)} -> ${mlpResult.finalLoss.toFixed(4)}` +
        (mlpResult.bestValLoss !== null ? `, best val loss ${mlpResult.bestValLoss.toFixed(4)}` : ''),
    );
    if (
      validation &&
      linearResult.bestValLoss !== null &&
      mlpResult.bestValLoss !== null &&
      mlpResult.bestValLoss < linearResult.bestValLoss
    ) {
      chosen = mlpResult.weights;
      chosenName = 'mlp';
    }
  } else {
    console.log(`Skipping MLP head (${numClasses} classes) — using linear artifact router.`);
  }

  const outputPath = classifierWeightsPath(MODEL_PATHS.bestModelDir);
  saveAnyClassifier(chosen, outputPath);
  console.log(`Saved artifact router (${chosenName}) to ${outputPath}`);

  if (testData.length > 0) {
    const testEmbeddings = await embedWithProgress(testData.map((row) => row.inputText), 'test');
    const testLabels = testData.map(labelFor);
    let correct = 0;
    for (let i = 0; i < testEmbeddings.length; i++) {
      const { labelId } = predictFromAny(chosen, testEmbeddings[i]);
      if (labelId === testLabels[i]) correct++;
    }
    const accuracy = correct / testEmbeddings.length;
    console.log(`Test accuracy: ${(accuracy * 100).toFixed(2)}% (${chosenName})`);

    const metrics = {
      accuracy,
      testSetSize: testData.length,
      architecture: chosenName,
      numClasses,
      targetMode: mode,
      embeddingModel: MODEL_CONFIG.embeddingModelName,
      datasetSizes: {
        train: trainData.length,
        val: valData.length,
        test: testData.length,
      },
      trainedAt: new Date().toISOString(),
    };
    writeFileSync(MODEL_PATHS.metricsOutput, JSON.stringify(metrics, null, 2));
    updateHeadManifest('artifact-router', {
      classifierPath: outputPath,
      metricsPath: MODEL_PATHS.metricsOutput,
      architecture: chosenName,
      accuracy,
      numClasses,
      targetMode: mode,
      embeddingModel: MODEL_CONFIG.embeddingModelName,
      testSetSize: testData.length,
      trainedAt: metrics.trainedAt,
    });
  }
}

if (require.main === module) {
  trainArtifactRouter().catch((error) => {
    console.error('Artifact router training failed:', error);
    process.exitCode = 1;
  });
}

export { trainArtifactRouter };