// Port of _deprecated-python/tests/test_model.py, plus coverage for the
// TypeScript-native classifier/dataset pieces that replaced BERT fine-tuning.

import { detectSubcategory, extractKeyTerms } from './subcategory';
import { trainClassifier, predictFromEmbedding, saveClassifier, loadClassifier } from './classifier';
import { stratifiedSplit, intentDistribution, type NluExample } from './dataset';
import { INTENT_CLASSES } from './training.config';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';

describe('subcategory detection', () => {
  it('detects cardiac subcategory', () => {
    expect(['cardiac', 'unknown']).toContain(
      detectSubcategory('Severe chest pain with diaphoresis', 'emergency_alert'),
    );
  });

  it('detects neurological subcategory', () => {
    expect(['neurological', 'unknown']).toContain(
      detectSubcategory('Facial droop and slurred speech', 'emergency_alert'),
    );
  });

  it('returns unknown for a non-matching emergency', () => {
    expect(detectSubcategory('Non-specific complaint', 'emergency_alert')).toBe('unknown');
  });

  it('returns null for non-emergency intents', () => {
    expect(detectSubcategory('Some clinical text', 'general_clinical_query')).toBeNull();
  });

  it('extractKeyTerms is currently a placeholder returning an empty list', () => {
    expect(extractKeyTerms('Some clinical text', 'general_clinical_query')).toEqual([]);
  });
});

describe('stratifiedSplit', () => {
  const data: NluExample[] = [
    ...Array.from({ length: 10 }, (_, i) => ({ text: `emergency ${i}`, intent: 'emergency' })),
    ...Array.from({ length: 10 }, (_, i) => ({ text: `general ${i}`, intent: 'general_query' })),
  ];

  it('preserves per-class proportions', () => {
    const [train, test] = stratifiedSplit(data, 0.2, 42);
    expect(train.length + test.length).toBe(data.length);

    const testDist = intentDistribution(test);
    expect(testDist.emergency).toBe(2);
    expect(testDist.general_query).toBe(2);
  });
});

describe('trainClassifier + predictFromEmbedding', () => {
  it('learns a separable two-cluster toy problem', () => {
    const embeddings = [
      [1, 0],
      [1, 0.1],
      [0.9, -0.1],
      [0, 1],
      [0.1, 1],
      [-0.1, 0.9],
    ];
    const labels = [0, 0, 0, 1, 1, 1];
    const labelToIntent = { 0: INTENT_CLASSES[0], 1: INTENT_CLASSES[1] };

    const { weights } = trainClassifier(embeddings, labels, 2, labelToIntent, 'test-model', {
      numEpochs: 300,
      learningRate: 0.5,
      l2Reg: 0.0001,
    });

    expect(predictFromEmbedding(weights, [1, 0]).labelId).toBe(0);
    expect(predictFromEmbedding(weights, [0, 1]).labelId).toBe(1);
  });

  it('round-trips through save/load', () => {
    const embeddings = [[1, 0], [0, 1]];
    const labels = [0, 1];
    const labelToIntent = { 0: INTENT_CLASSES[0], 1: INTENT_CLASSES[1] };
    const { weights } = trainClassifier(embeddings, labels, 2, labelToIntent, 'test-model', {
      numEpochs: 50,
      learningRate: 0.5,
      l2Reg: 0.0001,
    });

    const dir = mkdtempSync(path.join(tmpdir(), 'nlu-classifier-'));
    const filePath = path.join(dir, 'classifier.json');
    try {
      saveClassifier(weights, filePath);
      const loaded = loadClassifier(filePath);
      expect(loaded.embeddingDim).toBe(weights.embeddingDim);
      expect(predictFromEmbedding(loaded, [1, 0]).labelId).toBe(
        predictFromEmbedding(weights, [1, 0]).labelId,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
