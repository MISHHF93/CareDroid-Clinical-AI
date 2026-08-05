import { ServiceUnavailableException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import mongoose from 'mongoose';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { PERMISSIONS_KEY } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { CapacityController } from './capacity.controller';
import type { CapacityService } from '../../services/capacity.service';

describe('CapacityController', () => {
  let controller: CapacityController;
  let service: { getCapacityDashboard: jest.Mock };

  const fakeDashboard = {
    score: 0.42,
    color: 'Yellow' as const,
    triggers: ['CTAS2 patients waiting: 4'],
    recommendations: ['Immediate physician assessment needed for CTAS2 waiting patients'],
    metrics: {
      active_patients: 10,
      waiting_patients: 5,
      patients_in_assessment: 2,
      pending_discharges: 1,
      ems_inbound_45min: 0,
      admissions_pending: 3,
      ctas2_waiting_count: 4,
      ctas3_waiting_count: 2,
      boarding_patients: 3,
    },
    timestamp: new Date(),
  };

  const originalReadyState = mongoose.connection.readyState;

  beforeEach(() => {
    service = {
      getCapacityDashboard: jest.fn(async () => fakeDashboard),
    };
    controller = new CapacityController(service as unknown as CapacityService);
    // mongoose.connection.readyState isn't spy-able (non-configurable
    // getter) -- assign it directly and restore the real value afterward,
    // same technique as surge.controller.spec.ts.
    (mongoose.connection as any).readyState = 1;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    (mongoose.connection as any).readyState = originalReadyState;
  });

  it('dashboard() returns the service result directly (unwrapped)', async () => {
    const result = await controller.dashboard();
    expect(result).toEqual(fakeDashboard);
    expect(service.getCapacityDashboard).toHaveBeenCalledWith();
  });

  it('dashboard() throws ServiceUnavailableException when MongoDB is not connected', async () => {
    (mongoose.connection as any).readyState = 0;

    await expect(controller.dashboard()).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(service.getCapacityDashboard).not.toHaveBeenCalled();
  });
});

describe('CapacityController — requires a permission', () => {
  it('requires AuthorizationGuard on the controller', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, CapacityController) || [];
    expect(guards).toContain(AuthorizationGuard);
  });

  it('dashboard requires READ_PHI', () => {
    const handler = CapacityController.prototype.dashboard;
    expect(typeof handler).toBe('function');
    const metadata = Reflect.getMetadata(PERMISSIONS_KEY, handler);
    expect(metadata).toEqual([Permission.READ_PHI]);
  });
});
