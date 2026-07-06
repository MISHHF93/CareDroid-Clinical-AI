// Node-only companion to artifactIntelligence.ts — reads NLU corpus, medical-knowledge
// markdown, and trained classifier manifests from disk. Never import this from browser code.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { getLocalTrainedMlModelRegistry } from './aiModelRegistry.node';
import {
  ARTIFACT_FEATURE_FIELDS,
  ARTIFACT_SCHEMA_FIELDS,
  ARTIFACT_TRAINING_FIELDS,
  ArtifactResonanceService,
  artifactFeaturesToCsv,
  artifactTrainingDatasetToCsv,
  artifactsToCsv,
  buildArtifactTrainingDataset,
  composeArtifactCatalog,
  createArtifactResonanceService,
  encodeArtifactFeatures,
  makeArtifact,
  rowsToCsv,
  validateArtifactCatalog,
} from './artifactIntelligence';

export {
  ARTIFACT_FEATURE_FIELDS,
  ARTIFACT_SCHEMA_FIELDS,
  ARTIFACT_TRAINING_FIELDS,
  ArtifactResonanceService,
  artifactFeaturesToCsv,
  artifactTrainingDatasetToCsv,
  artifactsToCsv,
  buildArtifactTrainingDataset,
  composeArtifactCatalog,
  createArtifactResonanceService,
  encodeArtifactFeatures,
  makeArtifact,
  rowsToCsv,
  validateArtifactCatalog,
};

const UNKNOWN = 'unknown';

function slug(value: string) {
  return String(value || UNKNOWN)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || UNKNOWN;
}

function readJsonlLines(filePath: string) {
  if (!existsSync(filePath)) return [];
  return readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function loadNluTrainingExamples() {
  const nluDataDir = path.join(process.cwd(), 'backend', 'ml-services', 'nlu', 'data');
  if (!existsSync(nluDataDir)) return [];

  const examples: Array<{
    text: string;
    intent: string;
    subcategory: string | undefined;
    split: string;
    sourceFile: string;
    index: number;
  }> = [];

  for (const fileName of ['corpus.jsonl']) {
    const split = fileName.replace('.jsonl', '');
    const sourceFile = path.join('backend', 'ml-services', 'nlu', 'data', fileName).split(path.sep).join('/');
    for (const [index, row] of readJsonlLines(path.join(nluDataDir, fileName)).entries()) {
      if (!row.text || !row.intent) continue;
      examples.push({
        text: String(row.text),
        intent: String(row.intent),
        subcategory: row.subcategory ? String(row.subcategory) : undefined,
        split,
        sourceFile,
        index,
      });
    }
  }
  return examples;
}

function loadMedicalKnowledgeDocuments() {
  const knowledgeDir = path.join(process.cwd(), 'data', 'medical-knowledge');
  if (!existsSync(knowledgeDir)) return [];

  return readdirSync(knowledgeDir)
    .filter((fileName) => fileName.endsWith('.md'))
    .map((fileName) => {
      const absolute = path.join(knowledgeDir, fileName);
      const body = readFileSync(absolute, 'utf8');
      const relative = path.join('data', 'medical-knowledge', fileName).split(path.sep).join('/');
      const title = path.basename(fileName, '.md').replace(/-/g, ' ');
      return { fileName, relative, body, title };
    });
}

function artifactFromLocalMlModel(model: ReturnType<typeof getLocalTrainedMlModelRegistry>[number]) {
  return makeArtifact({
    artifactId: `model-${model.modelId}`,
    name: model.name,
    type: 'ai-model',
    category: 'local-ml-head',
    route: model.route,
    sourceFile: model.classifierPath,
    frontendStatus: 'unified-ai-node',
    backendStatus: model.status,
    demoStatus: model.status === 'active' ? 'live-or-local' : 'training-required',
    assetPack: 'ai-workflow-pack',
    product: 'product-core-platform',
    workspace: 'ai-workflow|clinical',
    roles: 'clinician|platform-admin',
    organizationTypes: 'hospital',
    riskLevel: 'high',
    description: `${model.purpose}${model.accuracy ? ` (${(model.accuracy * 100).toFixed(1)}% accuracy)` : ''}`,
    dependencies: [model.classifierPath, model.metricsPath, model.manifestPath || 'backend/ml-services/models/manifest.json'],
    tags: ['ai-model', 'local-ml', model.head, model.modelId, model.architecture || 'untrained'],
    embeddingText: `${model.name} ${model.purpose} ${model.head} ${model.route} local trained classifier`,
    status: model.status,
  });
}

function artifactFromNluExample(example: ReturnType<typeof loadNluTrainingExamples>[number]) {
  return makeArtifact({
    artifactId: `nlu-${example.split}-${example.index}`,
    name: `${example.intent} query`,
    type: 'nlu-example',
    category: example.intent,
    route: '/api/nlu/predict',
    sourceFile: example.sourceFile,
    frontendStatus: 'nlu-training-corpus',
    backendStatus: 'ml-services-nlu',
    demoStatus: 'training-split',
    assetPack: 'ai-workflow-pack',
    product: 'product-core-platform',
    workspace: 'ai-workflow|clinical',
    roles: 'clinician|nurse|emergency-physician|platform-admin',
    organizationTypes: 'hospital',
    riskLevel: example.intent === 'emergency_alert' ? 'critical' : 'medium',
    description: example.text,
    dependencies: [
      example.sourceFile,
      'backend/ml-services/models/nlu/classifier.json',
      'backend/ml-services/models/manifest.json',
    ],
    tags: ['nlu', example.intent, example.split, ...(example.subcategory ? [example.subcategory] : [])],
    embeddingText: `${example.text} ${example.intent} ${example.subcategory || ''} nlu intent routing`,
    status: 'active',
  });
}

function artifactFromMedicalKnowledge(doc: ReturnType<typeof loadMedicalKnowledgeDocuments>[number]) {
  return makeArtifact({
    artifactId: `medical-knowledge-${slug(doc.fileName)}`,
    name: doc.title,
    type: 'medical-knowledge',
    category: 'clinical-reference',
    route: '/emergency/tools',
    sourceFile: doc.relative,
    frontendStatus: 'rag-corpus',
    backendStatus: 'rag-ingest-candidate',
    demoStatus: 'reference',
    assetPack: 'core-platform',
    product: 'product-core-platform',
    workspace: 'clinical|education',
    roles: 'clinician|nurse|emergency-physician|resident|pharmacist',
    organizationTypes: 'hospital',
    riskLevel: /interaction|sepsis|arrest|critical/i.test(doc.body) ? 'high' : 'medium',
    description: doc.body.split(/\r?\n/).find((line) => line.trim() && !line.startsWith('#'))?.trim() || doc.title,
    dependencies: doc.relative,
    tags: ['medical-knowledge', 'rag', 'clinical-reference', slug(doc.fileName)],
    embeddingText: `${doc.title} ${doc.relative} ${doc.body.slice(0, 1600)}`,
    status: 'active',
  });
}

/** Full catalog including disk-backed NLU corpus, medical knowledge, and trained ML heads. */
export function buildArtifactCatalog({ extraArtifacts = [] as any[] }: { extraArtifacts?: any[] } = {}) {
  const diskArtifacts = [
    ...getLocalTrainedMlModelRegistry().map(artifactFromLocalMlModel),
    ...loadNluTrainingExamples().map(artifactFromNluExample),
    ...loadMedicalKnowledgeDocuments().map(artifactFromMedicalKnowledge),
  ];
  return composeArtifactCatalog(diskArtifacts, { extraArtifacts });
}