import { BadRequestException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { PERMISSIONS_KEY } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { ProtocolController } from './protocol.controller';
import type { ClinicalProtocolService } from '../../services/clinical-protocol.service';

describe('ProtocolController', () => {
  let controller: ProtocolController;
  let service: {
    listProtocols: jest.Mock;
    checkHealth: jest.Mock;
    matchProtocols: jest.Mock;
  };

  beforeEach(() => {
    service = {
      listProtocols: jest.fn(() => [{ id: 'sepsis-screen' }]),
      checkHealth: jest.fn(() => ({ status: 'ready', protocolCount: 3 })),
      matchProtocols: jest.fn(() => [{ id: 'chest-pain', humanReviewRequired: true }]),
    };
    controller = new ProtocolController(service as unknown as ClinicalProtocolService);
  });

  it('info() returns static metadata plus the protocol list', () => {
    expect(controller.info()).toMatchObject({
      path: '/protocol',
      version: 'v1',
      status: 'active',
      protocols: [{ id: 'sepsis-screen' }],
    });
  });

  it('health() delegates to the service', () => {
    expect(controller.health()).toEqual({ status: 'ready', protocolCount: 3 });
  });

  it('evaluate() throws BadRequestException with neither chiefComplaint nor flags', () => {
    expect(() => controller.evaluate()).toThrow(BadRequestException);
    expect(service.matchProtocols).not.toHaveBeenCalled();
  });

  it('evaluate() accepts snake_case chief_complaint and parses comma-separated flags', () => {
    const result = controller.evaluate(undefined, 'chest pain', 'cardiac, stemi', '110', '85');
    expect(service.matchProtocols).toHaveBeenCalledWith({
      chiefComplaint: 'chest pain',
      flags: ['cardiac', 'stemi'],
      vitals: { hr: 110, sbp: 85, temp: undefined, spo2: undefined },
    });
    expect(result).toEqual({
      matchedCount: 1,
      protocols: [{ id: 'chest-pain', humanReviewRequired: true }],
      humanReviewRequired: true,
    });
  });

  it('evaluate() accepts flags alone as sufficient context', () => {
    controller.evaluate(undefined, undefined, 'fever');
    expect(service.matchProtocols).toHaveBeenCalledWith(
      expect.objectContaining({ chiefComplaint: '', flags: ['fever'] }),
    );
  });
});

describe('ProtocolController — requires a permission', () => {
  it('requires AuthorizationGuard on the controller', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, ProtocolController) || [];
    expect(guards).toContain(AuthorizationGuard);
  });

  it('every handler requires READ_PHI', () => {
    for (const handlerName of ['info', 'health', 'evaluate'] as const) {
      const handler = ProtocolController.prototype[handlerName];
      const metadata = Reflect.getMetadata(PERMISSIONS_KEY, handler);
      expect(metadata).toEqual([Permission.READ_PHI]);
    }
  });
});
