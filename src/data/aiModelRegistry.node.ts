// Node-only companion to aiModelRegistry.ts — reads the locally trained classifier
// manifest from disk. Never import this from browser-rendered code (components,
// pages, client services); it will break the Vite client build the same way
// aiModelRegistry.ts itself used to before this file was split out.

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import {
  CARE_DROID_UNIFIED_AI_NODE_ID,
  CARE_DROID_UNIFIED_AI_NODE_MODELS_PATH,
} from '../config/careDroidUnifiedAiNode.config';
import { CARE_DROID_AI_NODE_PATH } from '../services/careDroidAiApi';
import { PLATFORM_AI_MODEL_REGISTRY } from './aiModelRegistry';

/** Locally trained Xenova classifier heads (unified models directory). */
export function getLocalTrainedMlModelRegistry() {
  const modelsRoot = path.join(process.cwd(), 'backend', 'ml-services', 'models');
  const manifestPath = path.join(modelsRoot, 'manifest.json');
  const heads = [
    {
      modelId: 'nlu-intent-classifier',
      name: 'NLU Intent Classifier',
      head: 'nlu',
      route: '/api/nlu/predict',
      purpose:
        'Maps clinical utterances to 10 governed intent classes for chat, copilot, and AI Chief routing.',
    },
    {
      modelId: 'artifact-router',
      name: 'Artifact Router',
      head: 'artifact-router',
      route: `${CARE_DROID_UNIFIED_AI_NODE_MODELS_PATH}/route`,
      purpose:
        'Maps utterances to artifact types (calculator, tool, route, …) for unified AI node routing.',
    },
  ] as const;

  let manifest: { heads?: Record<string, { accuracy?: number; architecture?: string }> } = {};
  if (existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    } catch {
      manifest = {};
    }
  }

  return heads.map((head) => {
    const classifierPath = path.join(modelsRoot, head.head, 'classifier.json');
    const headMeta = manifest.heads?.[head.head] || {};
    const trained = existsSync(classifierPath);
    return Object.freeze({
      modelId: head.modelId,
      name: head.name,
      purpose: head.purpose,
      head: head.head,
      route: head.route,
      classifierPath: ['backend', 'ml-services', 'models', head.head, 'classifier.json'].join('/'),
      metricsPath: ['backend', 'ml-services', 'models', head.head, 'metrics.json'].join('/'),
      manifestPath: 'backend/ml-services/models/manifest.json',
      status: trained ? 'active' : 'untrained',
      accuracy: headMeta.accuracy,
      architecture: headMeta.architecture,
      unifiedNodeId: CARE_DROID_UNIFIED_AI_NODE_ID,
      nodeRoute: CARE_DROID_AI_NODE_PATH,
      artifactDependencies: [
        'backend/ml-services/models/manifest.json',
        ['backend', 'ml-services', 'models', head.head, 'classifier.json'].join('/'),
      ],
      costProfile: 'local-only',
      riskLevel: 'high',
      owner: 'CareDroid ML',
    });
  });
}

export function getFullAiModelRegistry() {
  return [...PLATFORM_AI_MODEL_REGISTRY, ...getLocalTrainedMlModelRegistry()];
}
