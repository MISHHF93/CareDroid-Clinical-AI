import { Test } from '@nestjs/testing';
import { EmergencyRealtimeService } from './emergency-realtime.service';
import {
  CareDroidCentralNodeService,
  EmergencyPatientService,
  EmergencySettingsService,
  EmergencyWhiteboardService,
  ReferralService,
  WorkflowActionLogService,
} from './emergency-os.services';

describe('EmergencyRealtimeService', () => {
  let realtimeService: EmergencyRealtimeService;
  let workflowLogService: WorkflowActionLogService;
  let patientService: EmergencyPatientService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        EmergencyRealtimeService,
        EmergencyWhiteboardService,
        ReferralService,
        WorkflowActionLogService,
        EmergencyPatientService,
        EmergencySettingsService,
        CareDroidCentralNodeService,
      ],
    }).compile();

    realtimeService = moduleRef.get(EmergencyRealtimeService);
    workflowLogService = moduleRef.get(WorkflowActionLogService);
    patientService = moduleRef.get(EmergencyPatientService);
  });

  it('publishes workflow_log_created when workflow logs are recorded', () => {
    const events: Array<{ type: string }> = [];
    realtimeService.subscribe((event) => events.push(event));

    workflowLogService.record({
      type: 'patient_created',
      title: 'Patient created',
      summary: 'Realtime test patient',
      patientId: 'patient-realtime-test',
      source: 'test',
    });

    expect(events.some((event) => event.type === 'workflow_log_created')).toBe(true);
  });

  it('builds an initial burst with connected and snapshot events', () => {
    const burst = realtimeService.buildInitialBurst();
    expect(burst[0]?.type).toBe('connected');
    expect(burst.some((event) => event.type === 'whiteboard_snapshot')).toBe(true);
    expect(burst.some((event) => event.type === 'central_node_snapshot')).toBe(true);
  });

  it('publishes patient_created and whiteboard snapshots after patient creation', () => {
    const events: string[] = [];
    realtimeService.subscribe((event) => events.push(event.type));

    patientService.createPatient({
      firstName: 'Realtime',
      lastName: 'Patient',
      chiefComplaint: 'Chest pain',
    });

    expect(events).toContain('patient_created');
    expect(events).toContain('whiteboard_snapshot');
    expect(events).toContain('central_node_snapshot');
  });

  it('does not recurse when a capacity-score change is detected mid-publish (regression for the lastCapacityScore reentrancy bug)', () => {
    // Real call cycle: publishBoardMutations() -> EmergencyWhiteboardService.getWhiteboard()
    // -> EmergencyPatientService.computeCapacity(), which itself calls
    // publishBoardMutations() again whenever the computed score differs from
    // the last-seen one. Before the fix, `lastCapacityScore` was assigned
    // AFTER that recursive call, so the "score changed" guard stayed true on
    // every reentrant call -- confirmed live to recurse until V8's call-stack
    // limit was hit (RangeError: Maximum call stack size exceeded), burning
    // 20+ seconds of CPU on a single patient mutation and, under concurrent
    // load, backing up the whole request queue. A small bounded call count
    // here is the regression signal: unbounded/hundreds of calls means the
    // guard is broken again.
    patientService.createPatient({
      firstName: 'Baseline',
      lastName: 'Patient',
      chiefComplaint: 'Chest pain',
    });

    // Force a mismatch between the cached score and whatever computeCapacity()
    // will actually compute next -- deterministic regardless of the specific
    // capacity formula's sensitivity to patient/room counts (an earlier draft
    // of this test relied on 2 createPatient() calls changing the real score,
    // which is NOT guaranteed with zero seeded rooms in this minimal test
    // module and produced a false-pass even against the unfixed source).
    (patientService as unknown as { lastCapacityScore: number }).lastCapacityScore = -999999;

    let publishBoardMutationsCalls = 0;
    const original = realtimeService.publishBoardMutations.bind(realtimeService);
    jest.spyOn(realtimeService, 'publishBoardMutations').mockImplementation(() => {
      publishBoardMutationsCalls += 1;
      original();
    });

    expect(() => patientService.computeCapacity()).not.toThrow();
    expect(publishBoardMutationsCalls).toBeLessThan(5);
  });
});
