import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import mongoose from 'mongoose';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { PERMISSIONS_KEY } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { ReassessmentController } from './reassessment.controller';
import type { ReassessmentService } from '../../services/reassessment.service';

describe('ReassessmentController', () => {
  let controller: ReassessmentController;
  let service: {
    getPatientsNeedingReassessment: jest.Mock;
    reassessPatient: jest.Mock;
    dismissReassessment: jest.Mock;
  };
  const originalReadyState = mongoose.connection.readyState;

  beforeEach(() => {
    service = {
      getPatientsNeedingReassessment: jest.fn(async () => [{ id: 'p1' }]),
      reassessPatient: jest.fn(async () => ({ id: 'p1', dps_score: 3 })),
      dismissReassessment: jest.fn(async () => ({ id: 'p1' })),
    };
    controller = new ReassessmentController(service as unknown as ReassessmentService);
    (mongoose.connection as any).readyState = 1;
  });

  afterEach(() => {
    (mongoose.connection as any).readyState = originalReadyState;
  });

  it('due() returns count and patients', async () => {
    const result = await controller.due();
    expect(result).toEqual({ count: 1, patients: [{ id: 'p1' }] });
  });

  it('due() throws ServiceUnavailableException when MongoDB is not connected', async () => {
    (mongoose.connection as any).readyState = 0;
    await expect(controller.due()).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(service.getPatientsNeedingReassessment).not.toHaveBeenCalled();
  });

  it('reassess() delegates to the service with normalized args', async () => {
    const result = await controller.reassess('p1', {
      new_dps_score: 2,
      notes: 'improved',
      clinician: 'Dr. Lee',
    });
    expect(service.reassessPatient).toHaveBeenCalledWith('p1', 2, 'improved', undefined, 'Dr. Lee');
    expect(result).toEqual({
      message: 'Reassessment recorded',
      patient: { id: 'p1', dps_score: 3 },
    });
  });

  it('reassess() maps a "not found" service error to NotFoundException', async () => {
    service.reassessPatient.mockRejectedValueOnce(new Error('Patient not found'));
    await expect(
      controller.reassess('missing', { notes: 'x', clinician: 'y' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('reassess() maps a validation-shaped service error to BadRequestException', async () => {
    service.reassessPatient.mockRejectedValueOnce(
      new Error('new_dps_score must be 1, 2, 3, 4, 5, or null'),
    );
    await expect(controller.reassess('p1', { notes: 'x', clinician: 'y' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('dismiss() delegates to the service', async () => {
    const result = await controller.dismiss('p1', { reason: 'discharged', clinician: 'Dr. Lee' });
    expect(service.dismissReassessment).toHaveBeenCalledWith('p1', 'discharged', 'Dr. Lee');
    expect(result).toEqual({ message: 'Reassessment dismissed', patient: { id: 'p1' } });
  });
});

describe('ReassessmentController — requires a permission', () => {
  it('requires AuthorizationGuard on the controller', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, ReassessmentController) || [];
    expect(guards).toContain(AuthorizationGuard);
  });

  it('due requires READ_PHI', () => {
    const metadata = Reflect.getMetadata(PERMISSIONS_KEY, ReassessmentController.prototype.due);
    expect(metadata).toEqual([Permission.READ_PHI]);
  });

  it('reassess and dismiss require WRITE_PHI', () => {
    for (const handlerName of ['reassess', 'dismiss'] as const) {
      const handler = ReassessmentController.prototype[handlerName];
      const metadata = Reflect.getMetadata(PERMISSIONS_KEY, handler);
      expect(metadata).toEqual([Permission.WRITE_PHI]);
    }
  });
});
