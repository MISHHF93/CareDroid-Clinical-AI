import { AppController } from './app.controller';

describe('AppController environment config', () => {
  it('returns environment validation and deployment metadata in system config', () => {
    const originalEmergencyFlag = process.env.ENABLE_MONGOOSE_EMERGENCY_OS;
    const originalMongoUri = process.env.MONGODB_URI;
    process.env.ENABLE_MONGOOSE_EMERGENCY_OS = 'true';
    process.env.MONGODB_URI = 'mongodb://localhost:27017/caredroid-test';

    try {
      const controller = new AppController({
        get: jest.fn((key: string) => {
          if (key === 'environment') {
            return {
              name: 'staging',
              allowed: ['local', 'development', 'staging', 'production'],
              bannerEnabled: true,
              isProduction: false,
              validation: { valid: true, source: 'CARE_ENV' },
            };
          }
          if (key === 'deployment') {
            return {
              id: 'deploy-123',
              region: 'iad1',
              version: '1.2.3',
              commit: 'abc123',
              branch: 'main',
              deployedAt: '2026-06-06T12:00:00.000Z',
            };
          }
          return {};
        }),
      } as any);

      expect(controller.getSystemConfig()).toMatchObject({
        environment: {
          name: 'staging',
          bannerEnabled: true,
          validation: { valid: true, source: 'CARE_ENV' },
        },
        deployment: {
          id: 'deploy-123',
          region: 'iad1',
          version: '1.2.3',
          commit: 'abc123',
        },
        emergencyOs: {
          conditionalRuntime: 'mongoose',
          configuredForMount: true,
          status: 'configured',
          routeGroups: [
            '/api/capacity',
            '/api/copilot',
            '/api/ems',
            '/api/emergency/intake',
            '/api/reassessment',
          ],
        },
      });
    } finally {
      if (originalEmergencyFlag === undefined) {
        delete process.env.ENABLE_MONGOOSE_EMERGENCY_OS;
      } else {
        process.env.ENABLE_MONGOOSE_EMERGENCY_OS = originalEmergencyFlag;
      }
      if (originalMongoUri === undefined) {
        delete process.env.MONGODB_URI;
      } else {
        process.env.MONGODB_URI = originalMongoUri;
      }
    }
  });
});
