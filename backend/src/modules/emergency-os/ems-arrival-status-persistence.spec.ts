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

  // Regression coverage for the "rich EMS handoff checklist data never
  // durably reaches the backend" fix: EMSIntakeService.completeHandoff()
  // used to send/persist only {handoffAccepted, handoffAcceptedAt} -- the
  // identity/vitals/medications/critical-flags/destination a clinician
  // actually documented during handoff, and WHO accepted it, were thrown
  // away and never reached the repository at all.
  it('persists handoff-acceptance identity and checklist content to the repository (write-then-read within the same process)', () => {
    service.completeHandoff(
      {
        arrivalId: 'ems-arrival-handoff-checklist-1',
        unitName: 'Medic 12',
        checklist: {
          identityStatus: 'verified',
          vitalsReceived: true,
          medicationsEnRoute: ['Naloxone'],
          criticalFlags: [
            { id: 'ems-critical', label: 'EMS critical severity', source: 'ems-severity' },
          ],
          patientDestination: 'monitored-chair',
        },
      },
      // The acceptor is what EmergencyOsController.postEmsHandoff derives
      // from the authenticated session -- never taken from `checklist` or
      // any other client-suppliable field (see the controller's own doc
      // comment on postEmsHandoff).
      { staffId: 'staff-77', name: 'Dr. Accepting' },
    );

    const lastSaved = savedRows[savedRows.length - 1];
    expect(lastSaved).toEqual(
      expect.objectContaining({
        id: 'ems-arrival-handoff-checklist-1',
        status: 'Complete',
        handoffAcceptedByStaffId: 'staff-77',
        handoffAcceptedByStaffName: 'Dr. Accepting',
        handoffIdentityStatus: 'verified',
        handoffVitalsReceived: true,
        handoffMedicationsEnRoute: ['Naloxone'],
        handoffCriticalFlags: [
          { id: 'ems-critical', label: 'EMS critical severity', source: 'ems-severity' },
        ],
        handoffPatientDestination: 'monitored-chair',
      }),
    );

    // Also readable back through the same tracked-status path the rest of
    // this file already relies on (updateArrivalStatus's merged return).
    const readBack = service.updateArrivalStatus('ems-arrival-handoff-checklist-1', {});
    expect(readBack.data.handoffAcceptedByStaffId).toBe('staff-77');
    expect(readBack.data.handoffVitalsReceived).toBe(true);
    expect(readBack.data.handoffMedicationsEnRoute).toEqual(['Naloxone']);
  });

  it('rehydrates handoff-acceptance identity and checklist content from the repository on module init, surviving a restart', async () => {
    const rehydrateRepository = {
      create: jest.fn((row) => row),
      save: jest.fn((row) => Promise.resolve(row)),
      find: jest.fn(() =>
        Promise.resolve([
          {
            id: 'ems-arrival-handoff-checklist-2',
            status: 'Complete',
            patientId: 'p10',
            unitId: 'unit-12',
            unitName: 'Medic 12',
            handoffCompletedAt: '2026-08-08T11:00:00.000Z',
            handoffAcceptedByStaffId: 'staff-77',
            handoffAcceptedByStaffName: 'Dr. Accepting',
            handoffIdentityStatus: 'verified',
            handoffVitalsReceived: true,
            handoffMedicationsEnRoute: ['Naloxone'],
            handoffCriticalFlags: [
              { id: 'ems-critical', label: 'EMS critical severity', source: 'ems-severity' },
            ],
            handoffPatientDestination: 'monitored-chair',
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

    const result = rehydratedService.updateArrivalStatus('ems-arrival-handoff-checklist-2', {});
    expect(result.data.handoffAcceptedByStaffId).toBe('staff-77');
    expect(result.data.handoffAcceptedByStaffName).toBe('Dr. Accepting');
    expect(result.data.handoffIdentityStatus).toBe('verified');
    expect(result.data.handoffVitalsReceived).toBe(true);
    expect(result.data.handoffMedicationsEnRoute).toEqual(['Naloxone']);
    expect(result.data.handoffCriticalFlags).toEqual([
      { id: 'ems-critical', label: 'EMS critical severity', source: 'ems-severity' },
    ]);
    expect(result.data.handoffPatientDestination).toBe('monitored-chair');
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
