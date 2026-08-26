import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import type { HttpAdapterHost } from '@nestjs/core';
import mongoose from 'mongoose';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { PERMISSIONS_KEY } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { EmsController } from './ems.controller';
import type { EMSService } from '../../services/ems.service';

describe('EmsController', () => {
  let controller: EmsController;
  let service: {
    createPrehospitalAlert: jest.Mock;
    updateEMSStatus: jest.Mock;
    confirmArrival: jest.Mock;
    getIncomingEMS: jest.Mock;
  };
  let emitSpy: jest.Mock;
  const originalReadyState = mongoose.connection.readyState;

  beforeEach(() => {
    service = {
      createPrehospitalAlert: jest.fn(async () => ({ id: 'p1', ems_unit_id: 'unit-1' })),
      updateEMSStatus: jest.fn(async () => ({ id: 'p1', ems_status: 'en_route' })),
      confirmArrival: jest.fn(async () => ({ id: 'p1', ems_status: 'arrived' })),
      getIncomingEMS: jest.fn(async () => [{ id: 'p1' }]),
    };
    emitSpy = jest.fn();
    const fakeIo = { to: () => ({ emit: emitSpy }) };
    const fakeHttpAdapterHost = {
      httpAdapter: { getInstance: () => ({ get: () => fakeIo }) },
    } as unknown as HttpAdapterHost;

    controller = new EmsController(service as unknown as EMSService, fakeHttpAdapterHost);
    (mongoose.connection as any).readyState = 1;
  });

  afterEach(() => {
    (mongoose.connection as any).readyState = originalReadyState;
  });

  describe('alert()', () => {
    it('throws BadRequestException when ems_unit_id/unitId is missing', async () => {
      await expect(
        controller.alert({ triage_code: 'CTAS2', eta_minutes: 5 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws BadRequestException when eta_minutes is non-numeric', async () => {
      await expect(
        controller.alert({
          ems_unit_id: 'unit-1',
          triage_code: 'CTAS2',
          eta_minutes: 'soon' as any,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws BadRequestException when neither triage_code nor priority is present', async () => {
      await expect(controller.alert({ ems_unit_id: 'unit-1' })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('throws ServiceUnavailableException when MongoDB is not connected', async () => {
      (mongoose.connection as any).readyState = 0;
      await expect(
        controller.alert({ ems_unit_id: 'unit-1', triage_code: 'CTAS2', eta_minutes: 5 }),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });

    it('creates the alert and emits a whiteboard event', async () => {
      const result = await controller.alert({
        ems_unit_id: 'unit-1',
        triage_code: 'CTAS2',
        eta_minutes: 5,
      });
      expect(service.createPrehospitalAlert).toHaveBeenCalledTimes(1);
      expect(emitSpy).toHaveBeenCalledWith('ems_alert_received', {
        id: 'p1',
        ems_unit_id: 'unit-1',
      });
      expect(result).toEqual({
        message: 'EMS alert received',
        patient: { id: 'p1', ems_unit_id: 'unit-1' },
      });
    });

    it('forwards the resolved tenant organizationId to the service', async () => {
      await controller.alert({ ems_unit_id: 'unit-1', triage_code: 'CTAS2', eta_minutes: 5 }, {
        organizationId: 'org-1',
      } as any);
      expect(service.createPrehospitalAlert).toHaveBeenCalledWith(
        { ems_unit_id: 'unit-1', triage_code: 'CTAS2', eta_minutes: 5 },
        'org-1',
      );
    });
  });

  describe('status()', () => {
    it('throws BadRequestException for an invalid status', async () => {
      await expect(controller.status('unit-1', { status: 'bogus' })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('throws NotFoundException when the EMS unit is unknown', async () => {
      service.updateEMSStatus.mockResolvedValueOnce(null);
      await expect(controller.status('unit-1', { status: 'en_route' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('normalizes legacy status aliases and emits an update event', async () => {
      const result = await controller.status('unit-1', { status: 'Inbound' });
      expect(service.updateEMSStatus).toHaveBeenCalledWith(
        'unit-1',
        'en_route',
        undefined,
        undefined,
      );
      expect(emitSpy).toHaveBeenCalledWith('ems_status_updated', expect.any(Object));
      expect(result.message).toBe('EMS status updated');
    });

    // Regression for HEAL-347.56: this Mongoose EMS path resolved
    // patients by ems_unit_id alone with zero organizationId check, so any
    // WRITE_PHI caller from ANY hospital could flip another hospital's EMS
    // unit status. Proves the resolved tenant context now reaches the
    // service, same pattern as reassessment's HEAL-347.55 regression test.
    it('forwards the resolved tenant organizationId to the service', async () => {
      await controller.status('unit-1', { status: 'en_route' }, { organizationId: 'org-1' } as any);
      expect(service.updateEMSStatus).toHaveBeenCalledWith(
        'unit-1',
        'en_route',
        undefined,
        'org-1',
      );
    });
  });

  describe('arrive()', () => {
    it('throws NotFoundException when the EMS unit is unknown', async () => {
      service.confirmArrival.mockResolvedValueOnce(null);
      await expect(controller.arrive('unit-1', {})).rejects.toBeInstanceOf(NotFoundException);
    });

    it('confirms arrival and emits an event', async () => {
      const result = await controller.arrive('unit-1', { real_name: 'Jane Doe' });
      expect(service.confirmArrival).toHaveBeenCalledWith(
        'unit-1',
        'Jane Doe',
        undefined,
        undefined,
      );
      expect(emitSpy).toHaveBeenCalledWith('ems_arrival_confirmed', expect.any(Object));
      expect(result.message).toBe('EMS arrival confirmed');
    });

    it('forwards the resolved tenant organizationId to the service', async () => {
      await controller.arrive('unit-1', { real_name: 'Jane Doe' }, {
        organizationId: 'org-1',
      } as any);
      expect(service.confirmArrival).toHaveBeenCalledWith('unit-1', 'Jane Doe', undefined, 'org-1');
    });
  });

  describe('incoming()', () => {
    it('returns count and patients', async () => {
      const result = await controller.incoming();
      expect(result).toEqual({ count: 1, patients: [{ id: 'p1' }] });
      expect(service.getIncomingEMS).toHaveBeenCalledWith(undefined);
    });

    it('forwards the resolved tenant organizationId to the service', async () => {
      await controller.incoming({ organizationId: 'org-1' } as any);
      expect(service.getIncomingEMS).toHaveBeenCalledWith('org-1');
    });
  });
});

describe('EmsController — requires a permission', () => {
  it('requires AuthorizationGuard on the controller', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, EmsController) || [];
    expect(guards).toContain(AuthorizationGuard);
  });

  it('alert, status, and arrive require WRITE_PHI', () => {
    for (const handlerName of ['alert', 'status', 'arrive'] as const) {
      const handler = EmsController.prototype[handlerName];
      const metadata = Reflect.getMetadata(PERMISSIONS_KEY, handler);
      expect(metadata).toEqual([Permission.WRITE_PHI]);
    }
  });

  it('incoming requires READ_PHI', () => {
    const metadata = Reflect.getMetadata(PERMISSIONS_KEY, EmsController.prototype.incoming);
    expect(metadata).toEqual([Permission.READ_PHI]);
  });
});
