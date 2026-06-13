import { registerAs } from '@nestjs/config';
import { getEnvironmentConfig } from './environment.config';

export default registerAs('datadog', () => {
  const config = getEnvironmentConfig();

  return {
    enabled: process.env.DATADOG_API_KEY && process.env.DATADOG_API_KEY.length > 0,
    apiKey: process.env.DATADOG_API_KEY || '',
    appKey: process.env.DATADOG_APP_KEY || '',
    site: process.env.DATADOG_SITE || 'datadoghq.com',

    // APM Configuration
    apm: {
      enabled: process.env.DATADOG_APM_ENABLED === 'true',
      serviceName: 'caredroid-backend',
      env: config.server.nodeEnv,
      version: config.deployment.version,
      logInjection: true,
      runtimeMetrics: true,
    },

    // Logging
    logging: {
      enabled: true,
      level: process.env.LOG_LEVEL || 'info',
    },

    // Profiling
    profiling: {
      enabled: process.env.DATADOG_PROFILING_ENABLED === 'true',
    },
  };
});
