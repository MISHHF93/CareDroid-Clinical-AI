const enabled =
  process.env.DATADOG_APM_ENABLED === 'true' &&
  !!(process.env.DATADOG_API_KEY && process.env.DATADOG_API_KEY.length > 0);

if (enabled) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const tracer = require('dd-trace').init({
    service: 'caredroid-backend',
    env: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    site: process.env.DATADOG_SITE || 'datadoghq.com',
    logInjection: true,
    profiling: process.env.DATADOG_PROFILING_ENABLED === 'true',
  });

  module.exports = tracer;
}
