import { Test } from '@nestjs/testing';
import { EmergencyRealtimeService } from './emergency-realtime.service';
import {
  CareDroidCentralNodeService,
  EmergencyPatientService,
  EmergencySettingsService,
  EmergencyWhiteboardService,
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
});
