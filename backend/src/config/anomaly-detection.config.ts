/**
 * Anomaly Detection Service Configuration
 * Configurations for the external anomaly detection service
 */

import { registerAs } from '@nestjs/config';

export default registerAs('anomalyDetection', () => ({
  enabled: process.env.ANOMALY_DETECTION_ENABLED === 'true',
  url: process.env.ANOMALY_DETECTION_URL || 'http://anomaly-detection:5000',
  timeout: parseInt(process.env.ANOMALY_DETECTION_TIMEOUT || '30000', 10), // 30 seconds
  retries: parseInt(process.env.ANOMALY_DETECTION_RETRIES || '3', 10),
}));
