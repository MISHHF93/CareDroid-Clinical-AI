import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import {
  EmergencyPatientService,
  ReferralService,
  WorkflowActionLogService,
} from './emergency-os.services';
import { Referral } from './entities/referral.entity';

/**
 * ReferralService.updateReferralStatus actor-tracking + responseNote
 * persistence (HEAL referral-actor-tracking). Before this fix,
 * updateReferralStatus(referralId, status, organizationId) had no actor
 * parameter at all -- every status change (Accept/Decline/Complete/etc.)
 * left `requestingStaffId` (whoever originally CREATED the referral) as the
 * only staff identity on the record, silently misattributing every response
 * to the original requester. A decline reason captured by
 * ReferralPanel.tsx's response-note field was also never persisted at all
 * (updateEmergencyTransferWorkflow() only ever sent `{status}`).
 *
 * Mirrors referral-persistence.spec.ts's minimal TestingModule shape and
 * emergency-os.transport-request.spec.ts's workflowLogService.record
 * assertion style.
 */
describe('ReferralService.updateReferralStatus actor tracking', () => {
  let module: TestingModule;
  let service: ReferralService;
  let workflowLogService: WorkflowActionLogService;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [WorkflowActionLogService, EmergencyPatientService, ReferralService],
    }).compile();

    service = module.get<ReferralService>(ReferralService);
    workflowLogService = module.get<WorkflowActionLogService>(WorkflowActionLogService);
  });

  function createReferral(requestingStaffId: string) {
    const result = service.createReferral({
      patientId: 'patient-1',
      requestingStaffId,
      targetDepartment: 'Cardiology',
      reason: 'Suspected NSTEMI',
    });
    return (result.data.referral as { id: string }).id;
  }

  it('records the responding staff member as lastActionByStaffId/lastActionByName, never as requestingStaffId', () => {
    const referralId = createReferral('staff-A-requester');

    const result = service.updateReferralStatus(referralId, 'Accepted', undefined, {
      staffId: 'staff-B-responder',
      name: 'Dr. B Responder',
    });

    const referral = result.data.referral as Record<string, unknown>;
    expect(referral.requestingStaffId).toBe('staff-A-requester');
    expect(referral.lastActionByStaffId).toBe('staff-B-responder');
    expect(referral.lastActionByName).toBe('Dr. B Responder');
  });

  it('persists a decline reason (responseNote) that is retrievable via getReferrals()', () => {
    const referralId = createReferral('staff-A-requester');

    service.updateReferralStatus(
      referralId,
      'Declined',
      undefined,
      { staffId: 'staff-B-responder', name: 'Dr. B Responder' },
      'No cardiology beds available tonight.',
    );

    const referrals = service.getReferrals().data.referrals as Array<Record<string, unknown>>;
    const referral = referrals.find((candidate) => candidate.id === referralId);
    expect(referral?.responseNote).toBe('No cardiology beds available tonight.');
    expect(referral?.status).toBe('Declined');
  });

  it('does not clobber a previously-recorded responseNote when a later status change supplies no note', () => {
    const referralId = createReferral('staff-A-requester');

    service.updateReferralStatus(
      referralId,
      'Declined',
      undefined,
      { staffId: 'staff-B-responder', name: 'Dr. B Responder' },
      'No cardiology beds available tonight.',
    );
    // A later status change with no responseNote (e.g. Acknowledge) must not
    // erase the earlier decline reason -- mirrors emergencyStore.ts's own
    // `responseNote || referral.responseNote` merge.
    service.updateReferralStatus(referralId, 'Acknowledged', undefined, {
      staffId: 'staff-C',
      name: 'Dr. C',
    });

    const referrals = service.getReferrals().data.referrals as Array<Record<string, unknown>>;
    const referral = referrals.find((candidate) => candidate.id === referralId);
    expect(referral?.responseNote).toBe('No cardiology beds available tonight.');
    expect(referral?.lastActionByStaffId).toBe('staff-C');
  });

  it("writes a durable, actor+timestamp audit trail entry (WorkflowActionLogService, matching this session's established convention)", () => {
    const referralId = createReferral('staff-A-requester');
    const recordSpy = jest.spyOn(workflowLogService, 'record');

    service.updateReferralStatus(
      referralId,
      'Declined',
      undefined,
      { staffId: 'staff-B-responder', name: 'Dr. B Responder' },
      'No cardiology beds available tonight.',
    );

    const statusChangeLogCall = recordSpy.mock.calls.find(
      ([entry]) => entry.type === 'referral_status_changed',
    );
    expect(statusChangeLogCall).toBeDefined();
    const [entry] = statusChangeLogCall as [any];
    expect(entry.actorStaffId).toBe('staff-B-responder');
    expect(entry.actorName).toBe('Dr. B Responder');
    expect(entry.metadata.referralId).toBe(referralId);
    expect(entry.metadata.previousStatus).toBe('Sent');
    expect(entry.metadata.status).toBe('Declined');
    expect(entry.metadata.hasResponseNote).toBe(true);

    const logs = workflowLogService.listLogs();
    expect(logs.some((log) => log.type === 'referral_status_changed')).toBe(true);
  });

  it('omits actor/name fields entirely when no actor is supplied, rather than fabricating one', () => {
    const referralId = createReferral('staff-A-requester');

    const result = service.updateReferralStatus(referralId, 'Acknowledged');

    const referral = result.data.referral as Record<string, unknown>;
    expect(referral.lastActionByStaffId).toBeUndefined();
    expect(referral.lastActionByName).toBeUndefined();
  });
});

describe('ReferralService actor/responseNote persistence across restart', () => {
  const savedRows: Record<string, unknown>[] = [];

  const repository = {
    create: jest.fn((row) => row),
    save: jest.fn((row) => {
      savedRows.push(row);
      return Promise.resolve(row);
    }),
    find: jest.fn(() => Promise.resolve([])),
  };

  beforeEach(() => {
    savedRows.length = 0;
    jest.clearAllMocks();
  });

  it('persists lastActionByStaffId/lastActionByName/responseNote to the repository, not only the in-memory row', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowActionLogService,
        EmergencyPatientService,
        ReferralService,
        { provide: getRepositoryToken(Referral), useValue: repository },
      ],
    }).compile();
    const service = module.get<ReferralService>(ReferralService);

    const createResult = service.createReferral({
      patientId: 'patient-2',
      requestingStaffId: 'staff-A-requester',
      targetDepartment: 'Psychiatry',
      reason: 'Behavioral health consult',
    });
    const referralId = (createResult.data.referral as { id: string }).id;
    jest.clearAllMocks();
    savedRows.length = 0;

    service.updateReferralStatus(
      referralId,
      'Declined',
      undefined,
      { staffId: 'staff-B-responder', name: 'Dr. B Responder' },
      'Behavioral health unit at capacity.',
    );

    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(savedRows[0]).toEqual(
      expect.objectContaining({
        id: referralId,
        status: 'Declined',
        lastActionByStaffId: 'staff-B-responder',
        lastActionByName: 'Dr. B Responder',
        responseNote: 'Behavioral health unit at capacity.',
      }),
    );
  });

  it('rehydrates lastActionByStaffId/lastActionByName/responseNote from the repository on module init, surviving a restart', async () => {
    const rehydrateRepository = {
      create: jest.fn((row) => row),
      save: jest.fn((row) => Promise.resolve(row)),
      find: jest.fn(() =>
        Promise.resolve([
          {
            id: 'ref-restored-actor-1',
            patientId: 'patient-3',
            requestingStaffId: 'staff-A-requester',
            targetDepartment: 'Surgery',
            specialty: 'Surgery',
            urgency: 'Routine',
            reason: 'Post-op follow-up',
            clinicalSummary: 'Post-op follow-up',
            status: 'Declined',
            workflow: 'Referral',
            requestedAt: '2026-08-01T00:00:00.000Z',
            lastActionByStaffId: 'staff-B-responder',
            lastActionByName: 'Dr. B Responder',
            responseNote: 'No beds available.',
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
    await rehydratedService.onModuleInit();
    const referrals = rehydratedService.getReferrals().data.referrals as Array<
      Record<string, unknown>
    >;
    const referral = referrals.find((candidate) => candidate.id === 'ref-restored-actor-1');

    expect(referral).toBeDefined();
    expect(referral?.lastActionByStaffId).toBe('staff-B-responder');
    expect(referral?.lastActionByName).toBe('Dr. B Responder');
    expect(referral?.responseNote).toBe('No beds available.');
  });
});
