import { getEnvironmentConfig } from '../config/environment.config';

const enabled =
  process.env.DATADOG_APM_ENABLED === 'true' &&
  !!(process.env.DATADOG_API_KEY && process.env.DATADOG_API_KEY.length > 0);

if (enabled) {
  const config = getEnvironmentConfig();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const tracer = require('dd-trace').init({
    service: 'caredroid-backend',
    env: config.server.nodeEnv,
    version: config.deployment.version,
    site: process.env.DATADOG_SITE || 'datadoghq.com',
    logInjection: true,
    profiling: process.env.DATADOG_PROFILING_ENABLED === 'true',
  });

  module.exports = tracer;
}
