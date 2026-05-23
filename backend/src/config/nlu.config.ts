/**
 * NLU (Natural Language Understanding) Service Configuration
 * Configurations for the external NLU service for intent classification
 */

import { registerAs } from '@nestjs/config';

export default registerAs('nlu', () => ({
  enabled: process.env.NLU_SERVICE_ENABLED !== 'false',
  url: process.env.NLU_SERVICE_URL || 'http://localhost:8001',
  timeout: parseInt(process.env.NLU_SERVICE_TIMEOUT || '30000', 10), // 30 seconds
  retries: parseInt(process.env.NLU_SERVICE_RETRIES || '3', 10),
  confidenceThreshold: parseFloat(process.env.NLU_CONFIDENCE_THRESHOLD || '0.7'),
}));
