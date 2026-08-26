import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  EMSIntakeService,
  EmergencyPatientService,
  WorkflowActionLogService,
} from './emergency-os.services';

/**
 * Physician-initiated "Request Emergency Transport" — a real user story
 * (a physician wanted to send an ambulance directly during a phone
 * follow-up call but had no way to). This is built as an honest, clearly
 * labeled SIMULATION: there is NO real EMS/CAD/911 dispatch system
 * connected anywhere in this codebase or environment. Every assertion below
 * that touches the returned record checks for explicit simulation labeling,
 * never for anything that could read as "a real ambulance is coming."
 *
 * Reuses the SAME live EMS pipeline real EMS arrivals already flow through
 * (EMSIntakeService.getEMSIntake() / EmsArrivalStatus durable side table),
 * not a parallel/duplicate mechanism -- see requestPhysicianTransport's own
 * doc comment in emergency-os.services.ts.
 */
describe('EMSIntakeService.requestPhysicianTransport', () => {
  let module: TestingModule;
  let service: EMSIntakeService;
  let patientService: EmergencyPatientService;
  let workflowLogService: WorkflowActionLogService;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [WorkflowActionLogService, EmergencyPatientService, EMSIntakeService],
    }).compile();

    service = module.get<EMSIntakeService>(EMSIntakeService);
    patientService = module.get<EmergencyPatientService>(EmergencyPatientService);
    workflowLogService = module.get<WorkflowActionLogService>(WorkflowActionLogService);
  });

  function createOrgAPatient() {
    return patientService.createPatient(
      {
        firstName: 'Follow',
        lastName: 'Uppatient',
        chiefComplaint: 'Chest pain, discharged yesterday',
      },
      'org-a',
    );
  }

  it('rejects a genuinely unknown patientId with a not-found error', () => {
    expect(() =>
      service.requestPhysicianTransport(
        { patientId: 'does-not-exist', reason: 'Worsening symptoms', urgency: 'P2' },
        { staffId: 'dr-1', name: 'Dr. Rivera' },
        'org-a',
      ),
    ).toThrow(NotFoundException);
  });

  it('rejects a cross-org patient with the same not-found error shape as a missing id (no existence leak)', () => {
    const patient = createOrgAPatient();

    expect(() =>
      service.requestPhysicianTransport(
        { patientId: patient.id, reason: 'Worsening symptoms', urgency: 'P2' },
        { staffId: 'dr-1', name: 'Dr. Rivera' },
        'org-b',
      ),
    ).toThrow(NotFoundException);

    // Same patient succeeds under its own org.
    const result = service.requestPhysicianTransport(
      { patientId: patient.id, reason: 'Worsening symptoms', urgency: 'P2' },
      { staffId: 'dr-1', name: 'Dr. Rivera' },
      'org-a',
    );
    expect(result.data.ok).toBe(true);
  });

  it('never claims a real ambulance was dispatched -- returns explicit simulation labeling', () => {
    const patient = createOrgAPatient();

    const result = service.requestPhysicianTransport(
      {
        patientId: patient.id,
        reason: 'Syncope reported on follow-up call',
        urgency: 'P1',
        location: '12 Maple St',
      },
      { staffId: 'dr-1', name: 'Dr. Rivera' },
      'org-a',
    );

    expect(result.data.simulated).toBe(true);
    expect(result.data.disclaimer).toMatch(/simulat/i);
    expect(result.data.disclaimer).toMatch(/not connected to a real ambulance/i);
    expect(result.data.disclaimer).toMatch(/no real transport has been dispatched/i);
    expect(result.data.reason).toBe('Syncope reported on follow-up call');
    expect(result.data.urgency).toBe('P1');
    expect(result.data.location).toBe('12 Maple St');
    expect(result.data.requestedByName).toBe('Dr. Rivera');
    expect(result.data.requestedByStaffId).toBe('dr-1');
    expect(typeof result.data.requestedAt).toBe('string');
    expect(result.data.arrivalId).toBe(`ems-arrival-${patient.id}`);
  });

  it('defaults location to the requesting clinic when the physician does not provide one', () => {
    const patient = createOrgAPatient();

    const result = service.requestPhysicianTransport(
      { patientId: patient.id, reason: 'Confusion reported by family', urgency: 'P2' },
      { staffId: 'dr-1', name: 'Dr. Rivera' },
      'org-a',
    );

    expect(result.data.location).toMatch(/requesting clinic/i);
  });

  it("transitions the existing patient's record to state 'Arrival' and marks it EMS-pipeline-visible and simulated, without spawning a duplicate patient", () => {
    const patient = createOrgAPatient();
    const before = patientService.listPatients('org-a').length;

    service.requestPhysicianTransport(
      { patientId: patient.id, reason: 'Chest pain again', urgency: 'P1' },
      { staffId: 'dr-1', name: 'Dr. Rivera' },
      'org-a',
    );

    const after = patientService.listPatients('org-a');
    expect(after.length).toBe(before);
    const updated = patientService.getPatient(patient.id, 'org-a');
    expect(updated?.state).toBe('Arrival');
    expect(updated?.priority).toBe('P1');
    expect(updated?.flags).toContain('EMSArrival');
    expect(updated?.flags).toContain('PhysicianRequestedTransportSimulated');
  });

  it("surfaces on getEMSIntake()'s emsArrivals list, distinguishable from a real EMS-initiated arrival via requestSource/simulated", () => {
    const physicianPatient = createOrgAPatient();
    const realEmsPatient = patientService.createPatient(
      {
        firstName: 'Real',
        lastName: 'EmsArrival',
        state: 'Arrival',
        chiefComplaint: 'EMS pre-arrival: MVC',
        flags: ['EMSArrival'],
      },
      'org-a',
    );

    service.requestPhysicianTransport(
      {
        patientId: physicianPatient.id,
        reason: 'Worsening dyspnea',
        urgency: 'P2',
        location: 'Home address',
      },
      { staffId: 'dr-1', name: 'Dr. Rivera' },
      'org-a',
    );

    const intake = service.getEMSIntake('org-a');
    const simulatedArrival = intake.data.emsArrivals.find(
      (arrival: any) => arrival.id === `ems-arrival-${physicianPatient.id}`,
    );
    const realArrival = intake.data.emsArrivals.find(
      (arrival: any) => arrival.id === `ems-arrival-${realEmsPatient.id}`,
    );

    expect(simulatedArrival).toBeDefined();
    expect(simulatedArrival!.simulated).toBe(true);
    expect(simulatedArrival!.requestSource).toBe('physician_initiated_simulated');
    expect(simulatedArrival!.requestedByName).toBe('Dr. Rivera');
    expect(simulatedArrival!.requestReason).toBe('Worsening dyspnea');
    expect(simulatedArrival!.requestLocation).toBe('Home address');

    expect(realArrival).toBeDefined();
    expect(realArrival!.simulated).toBe(false);
    expect(realArrival!.requestSource).toBeUndefined();
  });

  it("writes a durable, actor+timestamp audit trail entry (WorkflowActionLogService, matching this session's established convention)", () => {
    const patient = createOrgAPatient();
    const recordSpy = jest.spyOn(workflowLogService, 'record');

    service.requestPhysicianTransport(
      { patientId: patient.id, reason: 'Fall reported by caregiver', urgency: 'P2' },
      { staffId: 'dr-9', name: 'Dr. Okafor' },
      'org-a',
    );

    const transportLogCall = recordSpy.mock.calls.find(
      ([entry]) => entry.type === 'ems_transport_request_created',
    );
    expect(transportLogCall).toBeDefined();
    const [entry] = transportLogCall as [any];
    expect(entry.actorStaffId).toBe('dr-9');
    expect(entry.actorName).toBe('Dr. Okafor');
    expect(entry.patientId).toBe(patient.id);
    expect(entry.metadata.simulated).toBe(true);
    expect(typeof entry.timestamp).toBe('string');

    const logs = workflowLogService.listLogs(patient.id);
    expect(logs.some((log) => log.type === 'ems_transport_request_created')).toBe(true);
  });
});
