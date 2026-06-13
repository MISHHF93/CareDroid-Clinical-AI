import environmentConfig, {
  getEnvironmentConfig,
  normalizeCareEnvironment,
  validateEnvironmentConfig,
} from './environment.config';
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

  it('provides grouped defaults for optional runtime integrations', () => {
    const config = getEnvironmentConfig({});

    expect(config.server).toMatchObject({
      port: 3000,
      nodeEnv: 'development',
      corsOrigins: ['http://localhost:8000'],
    });
    expect(config.database).toMatchObject({
      dbName: 'caredroid',
      mongodbUri: '',
    });
    expect(config.auth).toMatchObject({
      jwtExpiry: '15m',
      jwtRefreshExpiry: '30d',
    });
    expect(config.telehealth).toMatchObject({
      videoProvider: 'mock',
      enabled: false,
    });
    expect(config.notifications.incidentEscalationEmails).toEqual([]);
  });

  it('throws a clear error for missing production JWT_SECRET', () => {
    const config = getEnvironmentConfig({ NODE_ENV: 'production' });

    expect(() => validateEnvironmentConfig(config)).toThrow(
      'JWT_SECRET is required in production',
    );
  });

  it('requires feature credentials only when dependent integrations are configured', () => {
    const config = getEnvironmentConfig({
      NODE_ENV: 'development',
      VIDEO_PROVIDER: 'zoom',
    });

    expect(() => validateEnvironmentConfig(config)).toThrow(
      'ZOOM_API_KEY is required when VIDEO_PROVIDER=zoom',
    );
  });

  it('validates supported environments and rejects unknown app environments', () => {
    expect(envValidationSchema.validate({ CARE_ENV: 'production' }).error).toBeUndefined();
    expect(envValidationSchema.validate({ APP_ENV: 'qa' }).error?.message).toContain('APP_ENV');
  });
});
