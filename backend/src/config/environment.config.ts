export const CARE_ENVIRONMENTS = ['local', 'development', 'staging', 'production'] as const;

export type CareEnvironment = (typeof CARE_ENVIRONMENTS)[number];

export function normalizeCareEnvironment(value?: string | null): CareEnvironment {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'dev') return 'development';
  if (normalized === 'prod') return 'production';
  if ((CARE_ENVIRONMENTS as readonly string[]).includes(normalized)) {
    return normalized as CareEnvironment;
  }
  return 'development';
}

export default () => {
  const environment = normalizeCareEnvironment(
    process.env.CARE_ENV || process.env.APP_ENV || process.env.NODE_ENV,
  );

  return {
    environment: {
      name: environment,
      isProduction: environment === 'production',
      bannerEnabled: process.env.ENVIRONMENT_BANNER_ENABLED !== 'false',
      allowed: CARE_ENVIRONMENTS,
      validation: {
        source: process.env.CARE_ENV ? 'CARE_ENV' : process.env.APP_ENV ? 'APP_ENV' : 'NODE_ENV',
        valid: true,
      },
    },
    deployment: {
      id: process.env.DEPLOYMENT_ID || process.env.VERCEL_DEPLOYMENT_ID || '',
      region: process.env.DEPLOYMENT_REGION || process.env.VERCEL_REGION || '',
      version: process.env.APP_VERSION || process.env.npm_package_version || '1.0.0',
      commit:
        process.env.GIT_COMMIT ||
        process.env.VERCEL_GIT_COMMIT_SHA ||
        process.env.RENDER_GIT_COMMIT ||
        '',
      branch: process.env.GIT_BRANCH || process.env.VERCEL_GIT_COMMIT_REF || '',
      deployedAt: process.env.DEPLOYED_AT || process.env.BUILD_TIME || '',
    },
  };
};
