import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import {
  EmergencyPatientService,
  ReassessmentService,
  WorkflowActionLogService,
} from './emergency-os.services';
import { Staff } from './entities/staff.entity';

// Regression coverage for roadmap item G1: before this, no staff row anywhere in the
// app had a real, runtime-readable email or on-duty flag, so waiting-room-safety
// escalation could only ever reach a static, empty-by-default distribution list.
// listStaff/updateStaffDutyStatus are the real "who is on shift right now" read/write
// path this closes -- see waiting-room-escalation-notification.spec.ts for the
// consumer side (notifyWaitingRoomEscalation routing to the resulting on-duty emails).

function buildModule(repository: Record<string, jest.Mock>): Promise<TestingModule> {
  return Test.createTestingModule({
    providers: [
      WorkflowActionLogService,
      EmergencyPatientService,
      ReassessmentService,
      { provide: getRepositoryToken(Staff), useValue: repository },
    ],
  }).compile();
}

describe('ReassessmentService.listStaff', () => {
  it('returns the real staff directory ordered by name', async () => {
    const rows = [
      { id: 's1', name: 'Priya Nair', role: 'MD', active: true, onDuty: false, email: null },
    ];
    const repository = { find: jest.fn().mockResolvedValue(rows) };
    const module = await buildModule(repository);

    const service = module.get<ReassessmentService>(ReassessmentService);
    const result = await service.listStaff();

    expect(repository.find).toHaveBeenCalledWith({ order: { name: 'ASC' } });
    expect(result).toBe(rows);
  });
});

describe('ReassessmentService.updateStaffDutyStatus', () => {
  it('marks a staff member on duty and persists the change', async () => {
    const staffRow: Staff = {
      id: 's3',
      name: 'Owen Clarke',
      role: 'Charge',
      active: true,
      email: null,
      onDuty: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const repository = {
      findOne: jest.fn().mockResolvedValue(staffRow),
      save: jest.fn((row) => Promise.resolve(row)),
    };
    const module = await buildModule(repository);

    const service = module.get<ReassessmentService>(ReassessmentService);
    const result = await service.updateStaffDutyStatus('s3', {
      onDuty: true,
      email: 'owen.clarke@example.com',
    });

    expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 's3' } });
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 's3', onDuty: true, email: 'owen.clarke@example.com' }),
    );
    expect(result.onDuty).toBe(true);
    expect(result.email).toBe('owen.clarke@example.com');
  });

  it('can mark a staff member off duty without touching a previously-set email', async () => {
    const staffRow: Staff = {
      id: 's3',
      name: 'Owen Clarke',
      role: 'Charge',
      active: true,
      email: 'owen.clarke@example.com',
      onDuty: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const repository = {
      findOne: jest.fn().mockResolvedValue(staffRow),
      save: jest.fn((row) => Promise.resolve(row)),
    };
    const module = await buildModule(repository);

    const service = module.get<ReassessmentService>(ReassessmentService);
    const result = await service.updateStaffDutyStatus('s3', { onDuty: false });

    expect(result.onDuty).toBe(false);
    expect(result.email).toBe('owen.clarke@example.com');
  });

  it('throws NotFoundException for an unknown staff id, does not silently no-op', async () => {
    const repository = { findOne: jest.fn().mockResolvedValue(null), save: jest.fn() };
    const module = await buildModule(repository);

    const service = module.get<ReassessmentService>(ReassessmentService);
    await expect(service.updateStaffDutyStatus('does-not-exist', { onDuty: true })).rejects.toThrow(
      NotFoundException,
    );
    expect(repository.save).not.toHaveBeenCalled();
  });
});
