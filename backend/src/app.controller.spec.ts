import { AppController } from './app.controller';
import { GUARDS_METADATA } from '@nestjs/common/constants';

describe('AppController environment config', () => {
  it('requires authentication for system configuration', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      AppController.prototype.getSystemConfig,
    ) as unknown[];

    expect(guards).toHaveLength(1);
  });

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
          if (key === 'database') {
            return {
              enableMongooseEmergencyOs: true,
              mongodbUri: 'mongodb://localhost:27017/caredroid-test',
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
          routeGroups: expect.arrayContaining([
            '/api/capacity',
            '/api/ems',
            '/api/surge',
            '/api/boarding',
            '/api/protocol',
            '/api/deterioration',
            '/api/copilot',
            '/api/intake',
            '/api/moh',
            '/api/wearable',
            '/api/iot',
            '/api/simulation',
            '/api/governance',
            '/api/handover',
            '/api/federated',
            '/api/digital-twin',
          ]),
          legacyRouteGroups: expect.arrayContaining(['/api/emergency/boarding']),
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
