import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import {
  EMSIntakeService,
  EmergencyPatientService,
  WorkflowActionLogService,
} from './emergency-os.services';
import { EmsArrivalStatus } from './entities/ems-arrival-status.entity';

// Regression coverage for the 2026-08-08 fix: EMSIntakeService.getEMSIntake() used to
// synthesize every arrival fresh from patient records on every request with no tracked
// transition state at all (its own prior comment: "Local whiteboard status remains the
// frontend source of truth for unit tracking") -- the offload clock lived only in each
// browser's local store, so it reset on reload and diverged across workstations.
// Verifies the fix actually persists and reads back real transitions.

describe('EMSIntakeService arrival status persistence', () => {
  let service: EMSIntakeService;
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
        EMSIntakeService,
        { provide: getRepositoryToken(EmsArrivalStatus), useValue: repository },
      ],
    }).compile();

    service = module.get<EMSIntakeService>(EMSIntakeService);
  });

  it('persists an arrival status update to the repository, not only an in-memory map', () => {
    service.updateArrivalStatus('ems-arrival-p1', {
      status: 'Arrived',
      arrivedAt: '2026-08-08T10:00:00.000Z',
    });

    expect(repository.create).toHaveBeenCalledTimes(1);
    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(savedRows[0]).toEqual(
      expect.objectContaining({
        id: 'ems-arrival-p1',
        status: 'Arrived',
        arrivedAt: '2026-08-08T10:00:00.000Z',
      }),
    );
  });

  it('merges a later transition onto an earlier one rather than replacing it', () => {
    service.updateArrivalStatus('ems-arrival-p2', {
      status: 'Arrived',
      arrivedAt: '2026-08-08T10:00:00.000Z',
    });
    savedRows.length = 0;

    const result = service.updateArrivalStatus('ems-arrival-p2', {
      status: 'Handoff',
      handoffStartedAt: '2026-08-08T10:05:00.000Z',
    });

    expect(result.data.arrivedAt).toBe('2026-08-08T10:00:00.000Z');
    expect(result.data.handoffStartedAt).toBe('2026-08-08T10:05:00.000Z');
    expect(result.data.status).toBe('Handoff');
  });

  it('rehydrates tracked arrival status from the repository on module init, surviving a restart', async () => {
    const rehydrateRepository = {
      create: jest.fn((row) => row),
      save: jest.fn((row) => Promise.resolve(row)),
      find: jest.fn(() =>
        Promise.resolve([
          {
            id: 'ems-arrival-p3',
            status: 'Handoff',
            patientId: 'p3',
            unitId: 'unit-9',
            unitName: 'Medic 9',
            arrivedAt: '2026-08-08T09:00:00.000Z',
            handoffStartedAt: '2026-08-08T09:10:00.000Z',
          },
        ]),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowActionLogService,
        EmergencyPatientService,
        EMSIntakeService,
        { provide: getRepositoryToken(EmsArrivalStatus), useValue: rehydrateRepository },
      ],
    }).compile();

    const rehydratedService = module.get<EMSIntakeService>(EMSIntakeService);
    await rehydratedService.onModuleInit();

    const result = rehydratedService.updateArrivalStatus('ems-arrival-p3', {});
    expect(result.data.status).toBe('Handoff');
    expect(result.data.unitName).toBe('Medic 9');
    expect(result.data.arrivedAt).toBe('2026-08-08T09:00:00.000Z');
  });

  it('does not throw when no repository is available (graceful degradation, matching AlertService/ReferralService)', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WorkflowActionLogService, EmergencyPatientService, EMSIntakeService],
    }).compile();

    const bareService = module.get<EMSIntakeService>(EMSIntakeService);
    expect(() =>
      bareService.updateArrivalStatus('ems-arrival-p4', { status: 'Arrived' }),
    ).not.toThrow();
  });
});

describe('EMSIntakeService realtime broadcast (MB-P0-6 follow-up)', () => {
  // Before this fix, updateArrivalStatus (and completeHandoff, which calls
  // it internally) persisted an arrival's transition correctly but never
  // broadcast anything -- EMSIntakeService had no EmergencyRealtimeService
  // at all, same gap shape ReferralService had before HEAL-094.
  // publishEmsUpdate() already existed on EmergencyRealtimeService and was
  // already correctly building a full getEMSIntake() envelope, but was only
  // ever called from EmergencyPatientService when an EMS-flagged PATIENT
  // record changed -- never from the one place that mutates an EMS ARRIVAL
  // record directly.
  it('calls realtimeService.publishEmsUpdate() after an arrival status change', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WorkflowActionLogService, EmergencyPatientService, EMSIntakeService],
    }).compile();
    const service = module.get<EMSIntakeService>(EMSIntakeService);
    const publishEmsUpdate = jest.fn();
    (service as unknown as { realtimeService: unknown }).realtimeService = { publishEmsUpdate };

    service.updateArrivalStatus('ems-arrival-broadcast-1', { status: 'Arrived' });

    expect(publishEmsUpdate).toHaveBeenCalledTimes(1);
  });

  it('calls realtimeService.publishEmsUpdate() exactly once for a handoff completion, not twice via the internal updateArrivalStatus call', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WorkflowActionLogService, EmergencyPatientService, EMSIntakeService],
    }).compile();
    const service = module.get<EMSIntakeService>(EMSIntakeService);
    const publishEmsUpdate = jest.fn();
    (service as unknown as { realtimeService: unknown }).realtimeService = { publishEmsUpdate };

    service.completeHandoff({ arrivalId: 'ems-arrival-broadcast-2', unitName: 'Medic 5' });

    // completeHandoff delegates the actual mutation to updateArrivalStatus
    // internally -- assert the broadcast fires exactly once, not once per
    // layer of the call chain.
    expect(publishEmsUpdate).toHaveBeenCalledTimes(1);
  });
});
