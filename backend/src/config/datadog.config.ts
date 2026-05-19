import { registerAs } from '@nestjs/config';

export default registerAs('datadog', () => ({
  enabled: process.env.DATADOG_API_KEY && process.env.DATADOG_API_KEY.length > 0,
  apiKey: process.env.DATADOG_API_KEY || '',
  appKey: process.env.DATADOG_APP_KEY || '',
  site: process.env.DATADOG_SITE || 'datadoghq.com',

  // APM Configuration
  apm: {
    enabled: process.env.DATADOG_APM_ENABLED === 'true',
    serviceName: 'caredroid-backend',
    env: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
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
}));
