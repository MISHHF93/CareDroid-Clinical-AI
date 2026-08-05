import { BadRequestException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { PERMISSIONS_KEY } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { DeteriorationController } from './deterioration.controller';
import type { DeteriorationPredictionV3Service } from '../../services/deterioration-prediction-v3.service';

describe('DeteriorationController', () => {
  let controller: DeteriorationController;
  let service: { predict: jest.Mock; checkHealth: jest.Mock };

  beforeEach(() => {
    service = {
      predict: jest.fn(() => ({
        modelVersion: 'deterioration-v3-deterministic',
        riskScore: 0.42,
        riskBand: 'moderate',
        contributingSignals: ['triage:CTAS2'],
        generatedAt: new Date().toISOString(),
        humanReviewRequired: true,
      })),
      checkHealth: jest.fn(() => ({
        status: 'ready',
        modelVersion: 'deterioration-v3-deterministic',
      })),
    };
    controller = new DeteriorationController(
      service as unknown as DeteriorationPredictionV3Service,
    );
  });

  it('info() returns static service metadata', () => {
    expect(controller.info()).toMatchObject({
      path: '/deterioration',
      version: 'v1',
      status: 'active',
    });
  });

  it('health() delegates to the service', () => {
    expect(controller.health()).toEqual({
      status: 'ready',
      modelVersion: 'deterioration-v3-deterministic',
    });
    expect(service.checkHealth).toHaveBeenCalledWith();
  });

  it('predict() throws BadRequestException with no triageCode/vitals/riskFlags', () => {
    expect(() => controller.predict({})).toThrow(BadRequestException);
    expect(service.predict).not.toHaveBeenCalled();
  });

  it('predict() accepts snake_case fields and forwards normalized input', () => {
    controller.predict({ triage_code: 'CTAS2', risk_flags: ['sepsis'] });
    expect(service.predict).toHaveBeenCalledWith({
      age: undefined,
      triageCode: 'CTAS2',
      vitals: undefined,
      riskFlags: ['sepsis'],
    });
  });

  it('predict() accepts vitals alone as sufficient context', () => {
    const result = controller.predict({ vitals: { hr: 130 } });
    expect(result).toEqual({ prediction: expect.objectContaining({ riskBand: 'moderate' }) });
  });
});

describe('DeteriorationController — requires a permission', () => {
  it('requires AuthorizationGuard on the controller', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, DeteriorationController) || [];
    expect(guards).toContain(AuthorizationGuard);
  });

  it('every handler requires READ_PHI', () => {
    for (const handlerName of ['info', 'health', 'predict'] as const) {
      const handler = DeteriorationController.prototype[handlerName];
      const metadata = Reflect.getMetadata(PERMISSIONS_KEY, handler);
      expect(metadata).toEqual([Permission.READ_PHI]);
    }
  });
});
