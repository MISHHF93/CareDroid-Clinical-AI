/**
 * NLU (Natural Language Understanding) configuration.
 * Default: in-process Nest module at /api/nlu (TypeScript, no Python sidecar).
 * Set NLU_SERVICE_MODE=http + NLU_SERVICE_URL for an external NLU deployment.
 */

import { registerAs } from '@nestjs/config';

const backendPort = process.env.BACKEND_PORT || process.env.PORT || '3340';

export default registerAs('nlu', () => ({
  enabled: process.env.NLU_SERVICE_ENABLED !== 'false',
  /** in-process = inject NluService; http = POST {url}/predict */
  mode: (process.env.NLU_SERVICE_MODE || 'in-process').toLowerCase() === 'http' ? 'http' : 'in-process',
  url:
    process.env.NLU_SERVICE_URL ||
    `http://127.0.0.1:${backendPort}/api/nlu`,
  timeout: parseInt(process.env.NLU_SERVICE_TIMEOUT || '30000', 10),
  retries: parseInt(process.env.NLU_SERVICE_RETRIES || '3', 10),
  confidenceThreshold: parseFloat(process.env.NLU_CONFIDENCE_THRESHOLD || '0.7'),
}));
