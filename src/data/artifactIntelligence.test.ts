import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROUTE_RECORDS } from '../config/routes.config';
import { ASSET_PACKS, SAAS_PRODUCTS } from './assetInventory';
import { getCalculatorToolInventory, getUserFacingToolInventory } from './toolInventory';
import {
  ARTIFACT_FEATURE_FIELDS,
  ARTIFACT_SCHEMA_FIELDS,
  ARTIFACT_TRAINING_FIELDS,
  ArtifactResonanceService,
  buildArtifactCatalog,
  buildArtifactTrainingDataset,
  encodeArtifactFeatures,
  validateArtifactCatalog,
} from './artifactIntelligence';
import { getAiModelRegistry } from './aiModelRegistry';

const ROOT = process.cwd();

function readGenerated(relativePath) {
  return readFileSync(path.join(ROOT, relativePath), 'utf8');
}

describe('artifact intelligence pipeline', () => {
  const artifacts = buildArtifactCatalog();
  const artifactIds = new Set(artifacts.map((artifact) => artifact.artifactId));

  it('generates required data files with canonical headers', () => {
    const files = [
      'data/artifacts/caredroid_artifacts.csv',
      'data/artifacts/caredroid_artifacts.json',
      'data/artifacts/caredroid_artifact_features.csv',
      'data/ml/artifact_training_dataset.csv',
    ];

    for (const file of files) {
      expect(existsSync(path.join(ROOT, file))).toBe(true);
    }

    expect(readGenerated(files[0]).split(/\r?\n/)[0]).toBe(ARTIFACT_SCHEMA_FIELDS.join(','));
    expect(readGenerated(files[2]).split(/\r?\n/)[0]).toBe(ARTIFACT_FEATURE_FIELDS.join(','));
    expect(readGenerated(files[3]).split(/\r?\n/)[0]).toBe(ARTIFACT_TRAINING_FIELDS.join(','));
  });

  it('builds a canonical artifact catalog without duplicate artifact IDs', () => {
    const validation = validateArtifactCatalog(artifacts);
    expect(validation.duplicateIds).toEqual([]);
    expect(validation.ok).toBe(true);
    expect(artifacts.length).toBeGreaterThan(1900);
  });

  it('maps routes, tools, calculators, asset packs, products, and AI models into artifacts', () => {
    for (const route of ROUTE_RECORDS.filter((record) => record.status === 'active')) {
      expect(artifactIds.has(`route-${route.id}`)).toBe(true);
    }

    for (const tool of getUserFacingToolInventory()) {
      expect(artifactIds.has(tool.id)).toBe(true);
    }

    for (const calculator of getCalculatorToolInventory()) {
      expect(artifactIds.has(calculator.id)).toBe(true);
    }

    for (const pack of ASSET_PACKS) {
      expect(artifactIds.has(`pack-${pack.id}`)).toBe(true);
    }

    for (const product of SAAS_PRODUCTS) {
      expect(artifactIds.has(`product-${product.id}`)).toBe(true);
    }

    for (const model of getAiModelRegistry()) {
      expect(artifactIds.has(`model-${model.modelId}`)).toBe(true);
    }
  });

  it('creates model-ready feature rows and training labels without claiming a trained model', () => {
    const features = encodeArtifactFeatures(artifacts);
    const labels = buildArtifactTrainingDataset(artifacts);

    expect(features).toHaveLength(artifacts.length);
    expect(labels.length).toBeGreaterThan(artifacts.length);
    expect(labels.every((label) => Number(label.confidence) > 0 && Number(label.confidence) <= 1)).toBe(true);
    expect(labels.some((label) => label.labelType === 'route')).toBe(true);
    expect(labels.some((label) => label.labelType === 'intent')).toBe(true);
  });

  it('captures NLU training examples and medical knowledge for intent routing models', () => {
    // 'corpus' not 'train': loadNluTrainingExamples only indexes corpus.jsonl (the
    // master corpus) — indexing train/val/test splits too would double-count the same
    // examples as separate artifacts, per the "circular leak" comment at its call site.
    expect(artifactIds.has('nlu-corpus-0')).toBe(true);
    expect(artifacts.some((artifact) => artifact.type === 'nlu-example')).toBe(true);
    expect(artifacts.some((artifact) => artifact.type === 'medical-knowledge')).toBe(true);
  });

  it('recommends related artifacts and detects orphan, duplicate, and missing metadata findings', () => {
    const service = new ArtifactResonanceService(artifacts);
    const source = artifacts.find((artifact) => /medical iot|device fleet|hospital map/i.test(artifact.embeddingText));

    expect(source).toBeTruthy();
    expect(service.findSimilarArtifacts(source.artifactId).length).toBeGreaterThan(0);
    expect(service.recommendArtifactsForRole('nurse').length).toBeGreaterThan(0);
    expect(service.recommendArtifactsForWorkspace('operations').length).toBeGreaterThan(0);
    expect(service.recommendAssetsForPack('medical-iot-pack').length).toBeGreaterThan(0);
    expect(Array.isArray(service.detectOrphanArtifacts())).toBe(true);
    expect(Array.isArray(service.detectMissingMetadata())).toBe(true);

    const duplicateService = new ArtifactResonanceService([
      { artifactId: 'one', name: 'Duplicate Test', type: 'tool' },
      { artifactId: 'two', name: 'Duplicate Test', type: 'tool' },
    ]);
    expect(duplicateService.detectDuplicateArtifacts()).toHaveLength(1);
  });
});
