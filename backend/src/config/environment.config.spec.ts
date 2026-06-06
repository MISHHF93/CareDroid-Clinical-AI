import environmentConfig, { normalizeCareEnvironment } from './environment.config';
import { envValidationSchema } from './env.validation';

describe('environment config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('normalizes canonical CareDroid environments', () => {
    expect(normalizeCareEnvironment('local')).toBe('local');
    expect(normalizeCareEnvironment('dev')).toBe('development');
    expect(normalizeCareEnvironment('staging')).toBe('staging');
    expect(normalizeCareEnvironment('prod')).toBe('production');
    expect(normalizeCareEnvironment('unknown')).toBe('development');
  });

  it('projects deployment metadata separately from environment selection', () => {
    process.env.CARE_ENV = 'staging';
    process.env.DEPLOYMENT_ID = 'deploy-1';
    process.env.GIT_COMMIT = 'abc123';

    const config = environmentConfig();

    expect(config.environment).toMatchObject({
      name: 'staging',
      isProduction: false,
      bannerEnabled: true,
    });
    expect(config.deployment).toMatchObject({
      id: 'deploy-1',
      commit: 'abc123',
    });
  });

  it('validates supported environments and rejects unknown app environments', () => {
    expect(envValidationSchema.validate({ CARE_ENV: 'production' }).error).toBeUndefined();
    expect(envValidationSchema.validate({ APP_ENV: 'qa' }).error?.message).toContain('APP_ENV');
  });
});
