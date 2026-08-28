import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import mongoose from 'mongoose';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { PERMISSIONS_KEY } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { SurgeController } from './surge.controller';
import type { SurgeCapacityService } from '../../services/surge-capacity.service';

describe('SurgeController', () => {
  let controller: SurgeController;
  let service: {
    activateSurgeMode: jest.Mock;
    batchEMSIntake: jest.Mock;
    assessResourceBottlenecks: jest.Mock;
    deactivateSurgeMode: jest.Mock;
    getCurrentSurgeStatus: jest.Mock;
  };

  const fakeSurgeEvent = {
    id: 'surge-1',
    type: 'mci' as const,
    estimatedPatientCount: 20,
    actualPatientCount: 0,
    activationTime: new Date(),
    status: 'activated' as const,
    resourceStatus: {
      traumaBedsAvailable: 5,
      traumaBedsTotal: 10,
      surgeonsAvailable: 3,
      surgeonsTotal: 5,
      anaesthetistsAvailable: 2,
      anaesthetistsTotal: 3,
      bloodUnitsAvailable: 10,
      bloodUnitsTotal: 20,
      ventilatorsAvailable: 4,
      ventilatorsTotal: 6,
    },
    communicationLog: [],
  };

  const originalReadyState = mongoose.connection.readyState;

  beforeEach(() => {
    service = {
      activateSurgeMode: jest.fn(async () => fakeSurgeEvent),
      batchEMSIntake: jest.fn(async () => []),
      assessResourceBottlenecks: jest.fn(async () => ({
        criticalResources: [],
        estimatedTimeToDepletion: {},
        recommendations: [],
      })),
      deactivateSurgeMode: jest.fn(async () => fakeSurgeEvent),
      getCurrentSurgeStatus: jest.fn(async () => ({ active: false })),
    };
    controller = new SurgeController(service as unknown as SurgeCapacityService);
    // Real DTO-level guards only run through Nest's ValidationPipe outside
    // this unit test's direct-construction style (see
    // backend-contract-hardening.spec.ts for that mechanism proof); here we
    // exercise the controller's own logic, mocking Mongo readiness directly.
    // mongoose.connection.readyState isn't spy-able (non-configurable
    // getter) -- assign it directly and restore the real value afterward.
    (mongoose.connection as any).readyState = 1;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    (mongoose.connection as any).readyState = originalReadyState;
  });

  it('activate() calls activateSurgeMode with a defaulted actualPatientCount and wraps the result', async () => {
    const result = await controller.activate({
      type: 'mci',
      estimatedPatientCount: 20,
      resourceStatus: fakeSurgeEvent.resourceStatus,
    } as any);

    expect(service.activateSurgeMode).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'mci', actualPatientCount: 0 }),
      undefined,
    );
    expect(result).toEqual({ success: true, surgeEvent: fakeSurgeEvent });
  });

  // Regression: activateSurgeMode used to be called with no organizationId at
  // all -- a single in-memory `activeSurgeEvent` field shared across every
  // org on this backend, plus unscoped Mongo lookups, meant any hospital
  // could see or terminate another hospital's live MCI/disaster response.
  it('activate() forwards the resolved tenant organizationId to the service', async () => {
    await controller.activate(
      {
        type: 'mci',
        estimatedPatientCount: 20,
        resourceStatus: fakeSurgeEvent.resourceStatus,
      } as any,
      { organizationId: 'org-1' } as any,
    );

    expect(service.activateSurgeMode).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'mci' }),
      'org-1',
    );
  });

  it('batchEmsIntake() delegates patients + surgeEventId and wraps the result', async () => {
    const patients = [{ temporaryId: 't1' }];
    service.batchEMSIntake.mockResolvedValueOnce(patients);

    const result = await controller.batchEmsIntake({
      patients,
      surgeEventId: 'surge-1',
    } as any);

    expect(service.batchEMSIntake).toHaveBeenCalledWith(patients, 'surge-1', undefined);
    expect(result).toEqual({ success: true, patients });
  });

  // Regression for HEAL-347.49: batchEmsIntake() is the highest-priority
  // instance of the Mongoose Patient model's tenant-scoping gap -- a live,
  // frontend-reachable MCI batch-intake write with zero organizationId
  // before this fix. Proves the resolved tenant context now reaches the
  // service instead of being silently dropped.
  it('batchEmsIntake() forwards the resolved tenant organizationId to the service', async () => {
    const patients = [{ temporaryId: 't1' }];
    service.batchEMSIntake.mockResolvedValueOnce(patients);

    await controller.batchEmsIntake(
      { patients, surgeEventId: 'surge-1' } as any,
      { organizationId: 'org-1' } as any,
    );

    expect(service.batchEMSIntake).toHaveBeenCalledWith(patients, 'surge-1', 'org-1');
  });

  it('bottlenecks() returns the service result directly (unwrapped)', async () => {
    const result = await controller.bottlenecks();
    expect(result).toEqual({
      criticalResources: [],
      estimatedTimeToDepletion: {},
      recommendations: [],
    });
    expect(service.assessResourceBottlenecks).toHaveBeenCalledWith(undefined);
  });

  it('bottlenecks() forwards the resolved tenant organizationId to the service', async () => {
    await controller.bottlenecks({ organizationId: 'org-1' } as any);
    expect(service.assessResourceBottlenecks).toHaveBeenCalledWith('org-1');
  });

  it('deactivate() wraps a found surge event', async () => {
    const result = await controller.deactivate({
      surgeEventId: 'surge-1',
      debriefNotes: 'All clear',
    } as any);

    expect(service.deactivateSurgeMode).toHaveBeenCalledWith('surge-1', 'All clear', undefined);
    expect(result).toEqual({ success: true, surgeEvent: fakeSurgeEvent });
  });

  it('deactivate() forwards the resolved tenant organizationId to the service', async () => {
    await controller.deactivate(
      { surgeEventId: 'surge-1', debriefNotes: 'All clear' } as any,
      { organizationId: 'org-1' } as any,
    );
    expect(service.deactivateSurgeMode).toHaveBeenCalledWith('surge-1', 'All clear', 'org-1');
  });

  it('deactivate() throws NotFoundException when the service returns null', async () => {
    service.deactivateSurgeMode.mockResolvedValueOnce(null);
    await expect(controller.deactivate({ surgeEventId: 'missing' } as any)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('status() returns the service result directly (unwrapped)', async () => {
    const result = await controller.status();
    expect(result).toEqual({ active: false });
    expect(service.getCurrentSurgeStatus).toHaveBeenCalledWith(undefined);
  });

  it('status() forwards the resolved tenant organizationId to the service', async () => {
    await controller.status({ organizationId: 'org-1' } as any);
    expect(service.getCurrentSurgeStatus).toHaveBeenCalledWith('org-1');
  });

  it('every route throws ServiceUnavailableException when MongoDB is not connected', async () => {
    (mongoose.connection as any).readyState = 0;

    await expect(
      controller.activate({
        type: 'mci',
        estimatedPatientCount: 1,
        resourceStatus: fakeSurgeEvent.resourceStatus,
      } as any),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(
      controller.batchEmsIntake({ patients: [], surgeEventId: 'x' } as any),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(controller.bottlenecks()).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(controller.deactivate({ surgeEventId: 'x' } as any)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    await expect(controller.status()).rejects.toBeInstanceOf(ServiceUnavailableException);

    expect(service.activateSurgeMode).not.toHaveBeenCalled();
    expect(service.batchEMSIntake).not.toHaveBeenCalled();
    expect(service.assessResourceBottlenecks).not.toHaveBeenCalled();
    expect(service.deactivateSurgeMode).not.toHaveBeenCalled();
    expect(service.getCurrentSurgeStatus).not.toHaveBeenCalled();
  });
});

describe('SurgeController — every route requires a permission', () => {
  it('requires AuthorizationGuard on the controller', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, SurgeController) || [];
    expect(guards).toContain(AuthorizationGuard);
  });

  const EXPECTED: Array<[keyof SurgeController, Permission]> = [
    ['activate', Permission.ACTIVATE_SURGE_MODE],
    ['batchEmsIntake', Permission.INGEST_SURGE_PATIENTS],
    ['bottlenecks', Permission.VIEW_SURGE_COMMAND],
    ['deactivate', Permission.ACTIVATE_SURGE_MODE],
    ['status', Permission.VIEW_SURGE_COMMAND],
  ];

  it.each(EXPECTED)('%s requires %s', (methodName, expectedPermission) => {
    const handler = SurgeController.prototype[methodName];
    expect(typeof handler).toBe('function');
    const metadata = Reflect.getMetadata(PERMISSIONS_KEY, handler);
    expect(metadata).toEqual([expectedPermission]);
  });
});
