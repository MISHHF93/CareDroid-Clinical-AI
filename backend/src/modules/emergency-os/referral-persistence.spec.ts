import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import {
  EmergencyPatientService,
  ReferralService,
  WorkflowActionLogService,
} from './emergency-os.services';
import { Referral } from './entities/referral.entity';

// Regression coverage for the 2026-08-08 fix: ReferralService.createdReferrals was a
// plain in-memory array with zero persistence -- every referral created via
// createReferral() vanished on process restart. Verifies the fix actually writes to
// and reads from the repository, not just that the code compiles.

describe('ReferralService persistence', () => {
  let service: ReferralService;
  const savedRows: Record<string, unknown>[] = [];

  const repository = {
    create: jest.fn((row) => row),
    save: jest.fn((row) => {
      savedRows.push(row);
      return Promise.resolve(row);
    }),
    find: jest.fn(() => Promise.resolve([])),
  };

  beforeEach(async () => {
    savedRows.length = 0;
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowActionLogService,
        EmergencyPatientService,
        ReferralService,
        {
          provide: getRepositoryToken(Referral),
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get<ReferralService>(ReferralService);
  });

  it('persists a created referral to the repository, not only the in-memory array', () => {
    service.createReferral({
      patientId: 'patient-1',
      requestingStaffId: 'staff-1',
      targetDepartment: 'Cardiology',
      urgency: 'Urgent',
      reason: 'Suspected NSTEMI',
    });

    expect(repository.create).toHaveBeenCalledTimes(1);
    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(savedRows[0]).toEqual(
      expect.objectContaining({
        patientId: 'patient-1',
        requestingStaffId: 'staff-1',
        targetDepartment: 'Cardiology',
        reason: 'Suspected NSTEMI',
      }),
    );
  });

  it('persists a status update to the repository, not only the in-memory row', () => {
    const createResult = service.createReferral({
      patientId: 'patient-2',
      requestingStaffId: 'staff-1',
      targetDepartment: 'Psychiatry',
      reason: 'Behavioral health consult',
    });
    const referralId = (createResult.data.referral as { id: string }).id;
    jest.clearAllMocks();
    savedRows.length = 0;

    service.updateReferralStatus(referralId, 'accepted');

    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(savedRows[0]).toEqual(expect.objectContaining({ id: referralId, status: 'accepted' }));
  });

  it('rehydrates created referrals from the repository on module init, surviving a restart', async () => {
    const rehydrateRepository = {
      create: jest.fn((row) => row),
      save: jest.fn((row) => Promise.resolve(row)),
      find: jest.fn(() =>
        Promise.resolve([
          {
            id: 'ref-restored-1',
            patientId: 'patient-3',
            requestingStaffId: 'staff-2',
            targetDepartment: 'Surgery',
            specialty: 'Surgery',
            urgency: 'Routine',
            reason: 'Post-op follow-up',
            clinicalSummary: 'Post-op follow-up',
            status: 'Sent',
            workflow: 'Referral',
            requestedAt: '2026-08-01T00:00:00.000Z',
          },
        ]),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowActionLogService,
        EmergencyPatientService,
        ReferralService,
        { provide: getRepositoryToken(Referral), useValue: rehydrateRepository },
      ],
    }).compile();

    const rehydratedService = module.get<ReferralService>(ReferralService);
    // Called explicitly rather than relying on whether TestingModule.compile() invokes
    // Nest lifecycle hooks automatically -- this is the exact method Nest calls for a
    // real bootstrapped app (see onModuleInit's own implementation), so this proves the
    // rehydration logic itself is correct regardless of that framework detail.
    await rehydratedService.onModuleInit();
    const referrals = rehydratedService.getReferrals().data.referrals as Array<{ id: string }>;

    expect(referrals.some((referral) => referral.id === 'ref-restored-1')).toBe(true);
  });

  it('does not throw when no repository is available (graceful degradation, matching the AlertService pattern)', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WorkflowActionLogService, EmergencyPatientService, ReferralService],
    }).compile();

    const bareService = module.get<ReferralService>(ReferralService);
    expect(() =>
      bareService.createReferral({ patientId: 'patient-4', reason: 'No DB configured' }),
    ).not.toThrow();
  });
});
