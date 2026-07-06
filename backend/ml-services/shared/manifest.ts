import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import {
  MANIFEST_PATH,
  UNIFIED_MODELS_ROOT,
  classifierPath,
  type ClassifierHead,
} from './paths';

export interface UnifiedHeadManifest {
  classifierPath: string;
  metricsPath: string;
  architecture?: string;
  accuracy?: number;
  numClasses?: number;
  targetMode?: string;
  embeddingModel?: string;
  testSetSize?: number;
  trainedAt?: string;
  evaluatedAt?: string;
}

export interface UnifiedModelManifest {
  version: 1;
  name: 'caredroid-unified-ai-node';
  updatedAt: string;
  embeddingModel: string;
  heads: Record<ClassifierHead, UnifiedHeadManifest>;
}

const DEFAULT_MANIFEST = (): UnifiedModelManifest => ({
  version: 1,
  name: 'caredroid-unified-ai-node',
  updatedAt: new Date().toISOString(),
  embeddingModel: process.env.NLU_EMBEDDING_MODEL ?? 'Xenova/all-mpnet-base-v2',
  heads: {
    nlu: {
      classifierPath: classifierPath('nlu'),
      metricsPath: path.join(UNIFIED_MODELS_ROOT, 'nlu', 'metrics.json'),
    },
    'artifact-router': {
      classifierPath: classifierPath('artifact-router'),
      metricsPath: path.join(UNIFIED_MODELS_ROOT, 'artifact-router', 'metrics.json'),
    },
  },
});

export function readManifest(manifestPath = MANIFEST_PATH): UnifiedModelManifest {
  if (!existsSync(manifestPath)) return DEFAULT_MANIFEST();
  try {
    return JSON.parse(readFileSync(manifestPath, 'utf8')) as UnifiedModelManifest;
  } catch {
    return DEFAULT_MANIFEST();
  }
}

export function writeManifest(manifest: UnifiedModelManifest, manifestPath = MANIFEST_PATH): void {
  mkdirSync(path.dirname(manifestPath), { recursive: true });
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
}

export function updateHeadManifest(
  head: ClassifierHead,
  patch: Partial<UnifiedHeadManifest>,
  manifestPath = MANIFEST_PATH,
): UnifiedModelManifest {
  const manifest = readManifest(manifestPath);
  manifest.heads[head] = { ...manifest.heads[head], ...patch };
  if (patch.embeddingModel) manifest.embeddingModel = patch.embeddingModel;
  manifest.updatedAt = new Date().toISOString();
  writeManifest(manifest, manifestPath);
  return manifest;
}