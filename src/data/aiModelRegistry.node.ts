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
  // Both heads are loaded IN-PROCESS by the unified AI node (see
  // intent-classifier.service.ts: "Unified AI node -- intent head +
  // artifact-router head (in-process by default)"). They are not separately
  // addressable over HTTP.
  //
  // This list used to advertise `/api/nlu/predict` and
  // `${MODELS_PATH}/route` as each head's route. Both 404 -- verified against
  // a running backend, not assumed -- and these entries surface on the
  // governance Artifacts page, so it was telling operators to hit endpoints
  // that do not exist. `statusRoute` is the endpoint that genuinely reports
  // each head (it returns heads.nlu / heads.artifactRouter with loaded flags,
  // architecture and accuracy), and `invocation` says how the head is actually
  // reached. The real HTTP surface that exercises them is POST
  // CARE_DROID_AI_NODE_PATH, already carried below as `nodeRoute`.
  const heads = [
    {
      modelId: 'nlu-intent-classifier',
      name: 'NLU Intent Classifier',
      head: 'nlu',
      statusRoute: `${CARE_DROID_UNIFIED_AI_NODE_MODELS_PATH}/health`,
      invocation: 'in-process (unified AI node)',
      purpose:
        'Maps clinical utterances to 10 governed intent classes for chat, copilot, and AI Chief routing.',
    },
    {
      modelId: 'artifact-router',
      name: 'Artifact Router',
      head: 'artifact-router',
      statusRoute: `${CARE_DROID_UNIFIED_AI_NODE_MODELS_PATH}/health`,
      invocation: 'in-process (unified AI node)',
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
      statusRoute: head.statusRoute,
      invocation: head.invocation,
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
