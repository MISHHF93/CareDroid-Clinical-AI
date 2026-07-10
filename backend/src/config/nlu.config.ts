/**
 * NLU (Natural Language Understanding) configuration.
 * Default: in-process Nest module at /api/nlu (TypeScript, no Python sidecar).
 * Set NLU_SERVICE_MODE=http + NLU_SERVICE_URL for an external NLU deployment.
 */

import { registerAs } from '@nestjs/config';

const backendPort = process.env.BACKEND_PORT || process.env.PORT || '3350';

export default registerAs('nlu', () => ({
  enabled: process.env.NLU_SERVICE_ENABLED !== 'false',
  /** in-process = UnifiedAiNodeService; http = POST /api/ai/node/models/route */
  mode:
    (process.env.NLU_SERVICE_MODE || 'in-process').toLowerCase() === 'http' ? 'http' : 'in-process',
  url: process.env.NLU_SERVICE_URL || `http://127.0.0.1:${backendPort}/api/nlu`,
  unifiedModelsPath:
    process.env.UNIFIED_AI_NODE_MODELS_PATH || `http://127.0.0.1:${backendPort}/api/ai/node/models`,
  timeout: parseInt(process.env.NLU_SERVICE_TIMEOUT || '30000', 10),
  retries: parseInt(process.env.NLU_SERVICE_RETRIES || '3', 10),
  confidenceThreshold: parseFloat(process.env.NLU_CONFIDENCE_THRESHOLD || '0.7'),
}));
