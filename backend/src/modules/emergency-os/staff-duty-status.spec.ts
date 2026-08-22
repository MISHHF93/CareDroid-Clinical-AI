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
      organizationId: null,
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
      organizationId: null,
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

describe('ReassessmentService staff organization tenant scoping (BOLA audit)', () => {
  // GET /emergency/staff + PATCH /emergency/staff/:staffId/duty-status had
  // zero organization scoping at all -- a caller in one org could list
  // every hospital's staff directory, then PATCH a staff record
  // belonging to a DIFFERENT org (setting onDuty: true and overwriting
  // email with an attacker-controlled address).
  it('listStaff(organizationId) includes own-org and legacy/null-org rows, excludes a different org', async () => {
    const rows = [
      { id: 's-a', organizationId: 'org-a', name: 'Own Org', role: 'MD', active: true, onDuty: false, email: null },
    ];
    const repository = { find: jest.fn().mockResolvedValue(rows) };
    const module = await buildModule(repository);
    const service = module.get<ReassessmentService>(ReassessmentService);

    await service.listStaff('org-a');
    expect(repository.find).toHaveBeenCalledWith({
      where: [{ organizationId: 'org-a' }, { organizationId: expect.anything() }],
      order: { name: 'ASC' },
    });
  });

  it('updateStaffDutyStatus rejects a cross-org staffId with the same not-found error shape as a missing id, and succeeds for the owning org', async () => {
    const staffRow: Staff = {
      id: 's-b',
      organizationId: 'org-b',
      name: 'Other Org Nurse',
      role: 'Charge',
      active: true,
      email: null,
      onDuty: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const repository = {
      findOne: jest.fn((query: any) => {
        const where = Array.isArray(query.where) ? query.where : [query.where];
        const matches = where.some((clause: any) => {
          if (clause.id !== 's-b') return false;
          if (clause.organizationId === undefined) return true;
          if (clause.organizationId === 'org-b') return true;
          return false;
        });
        return Promise.resolve(matches ? staffRow : null);
      }),
      save: jest.fn((row: any) => Promise.resolve(row)),
    };
    const module = await buildModule(repository);
    const service = module.get<ReassessmentService>(ReassessmentService);

    await expect(
      service.updateStaffDutyStatus('s-b', { onDuty: true, email: 'attacker@example.com' }, 'org-a'),
    ).rejects.toThrow(NotFoundException);
    expect(repository.save).not.toHaveBeenCalled();

    const result = await service.updateStaffDutyStatus('s-b', { onDuty: true }, 'org-b');
    expect(result.onDuty).toBe(true);
  });
});
