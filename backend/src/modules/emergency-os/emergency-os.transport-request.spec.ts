import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  EMSIntakeService,
  EmergencyPatientService,
  WorkflowActionLogService,
} from './emergency-os.services';
import { EmergencyRealtimeService } from './emergency-realtime.service';

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
    expect(simulatedArrival!.requestPatientName).toBe('Follow Uppatient');

    expect(realArrival).toBeDefined();
    expect(realArrival!.simulated).toBe(false);
    expect(realArrival!.requestPatientName).toBeUndefined();
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

/**
 * Real-time ED advance notice: before a physician's simulated transport request,
 * the whiteboard/EMS pipeline only found out on next poll/reload. This reuses the
 * SAME real (not fake) EmergencyRealtimeService SSE mechanism other EMS actions
 * already broadcast through (EMSIntakeService.updateArrivalStatus() already calls
 * realtimeService.publishEmsUpdate(), and requestPhysicianTransport() already
 * delegates through it) -- these tests assert that live behavior actually fires,
 * with a real (uninstantiated-mock) EmergencyRealtimeService wired in, not just
 * that the code path theoretically exists.
 */
describe('EMSIntakeService.requestPhysicianTransport realtime broadcast', () => {
  let module: TestingModule;
  let service: EMSIntakeService;
  let patientService: EmergencyPatientService;
  let realtimeService: EmergencyRealtimeService;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        WorkflowActionLogService,
        EmergencyPatientService,
        EMSIntakeService,
        EmergencyRealtimeService,
      ],
    }).compile();

    service = module.get<EMSIntakeService>(EMSIntakeService);
    patientService = module.get<EmergencyPatientService>(EmergencyPatientService);
    realtimeService = module.get<EmergencyRealtimeService>(EmergencyRealtimeService);
  });

  it('broadcasts a live ems_updated event carrying the new simulated arrival', () => {
    const patient = patientService.createPatient(
      { firstName: 'Live', lastName: 'Patient', chiefComplaint: 'Chest pain' },
      'org-a',
    );
    const arrivalId = `ems-arrival-${patient.id}`;

    const emsUpdatedEvents: any[] = [];
    realtimeService.subscribe((event) => {
      if (event.type === 'ems_updated') emsUpdatedEvents.push(event);
    }, 'org-a');

    service.requestPhysicianTransport(
      {
        patientId: patient.id,
        reason: 'Syncope on follow-up call',
        urgency: 'P1',
        location: '12 Maple St',
      },
      { staffId: 'dr-1', name: 'Dr. Rivera' },
      'org-a',
    );

    expect(emsUpdatedEvents.length).toBeGreaterThan(0);
    const arrivalsSeen = emsUpdatedEvents.map((event) =>
      (event.payload?.data?.emsArrivals || []).find((arrival: any) => arrival.id === arrivalId),
    );
    // The arrival must actually appear, correctly labeled simulated, in at least
    // one live broadcast -- this is the "ED staff see it appear live" behavior.
    expect(arrivalsSeen.some((arrival) => arrival?.simulated === true)).toBe(true);

    // Regression guard: no broadcast may ever show this arrival WITHOUT the
    // simulated label -- a workstation catching a "looks real" intermediate
    // broadcast would violate this feature's core honesty invariant (see
    // requestPhysicianTransport's own doc comment: "the ED side can never
    // mistake this for a genuine ambulance dispatch"). Found live before this
    // fix: reordering the metadata write ahead of the patient state
    // transition eliminated exactly this window.
    expect(arrivalsSeen.some((arrival) => arrival && arrival.simulated === false)).toBe(false);
  });

  it('only broadcasts to subscribers in the same organization', () => {
    const patient = patientService.createPatient(
      { firstName: 'Tenant', lastName: 'Scoped', chiefComplaint: 'Abdominal pain' },
      'org-a',
    );

    const orgBEvents: any[] = [];
    realtimeService.subscribe((event) => {
      if (event.type === 'ems_updated') orgBEvents.push(event);
    }, 'org-b');

    service.requestPhysicianTransport(
      { patientId: patient.id, reason: 'Worsening pain', urgency: 'P2' },
      { staffId: 'dr-2', name: 'Dr. Singh' },
      'org-a',
    );

    expect(orgBEvents.length).toBe(0);
  });
});

/**
 * ATMIST handover summary -- auto-derived, read-time view over data CareDroid
 * already has (age, the request's own reason/timestamp, active safety flags,
 * latest vitals, latest clinical note), never a new field the physician has to
 * type. Every field must trace to real data; a genuinely missing field renders
 * an honest "Not recorded"/"None recorded" rather than fabricated content.
 */
describe('EMSIntakeService.requestPhysicianTransport ATMIST handover summary', () => {
  let module: TestingModule;
  let service: EMSIntakeService;
  let patientService: EmergencyPatientService;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [WorkflowActionLogService, EmergencyPatientService, EMSIntakeService],
    }).compile();

    service = module.get<EMSIntakeService>(EMSIntakeService);
    patientService = module.get<EmergencyPatientService>(EmergencyPatientService);
  });

  function findSimulatedArrival(patientId: string): any {
    const intake = service.getEMSIntake('org-a');
    const arrival = intake.data.emsArrivals.find(
      (candidate: any) => candidate.id === `ems-arrival-${patientId}`,
    );
    expect(arrival).toBeDefined();
    return arrival;
  }

  it('derives every ATMIST field from real chart data when it is on file', () => {
    const now = new Date().toISOString();
    // Deliberately a few seconds before "now", not "now" itself: this note must
    // predate requestPhysicianTransport's own timestamp (see
    // buildAtmistHandoverSummary's isRecentPriorEntry doc comment) -- a value
    // computed via `new Date().toISOString()` moments before the request call
    // can land in the SAME millisecond as it under fast synchronous test
    // execution, which would flakily fail this assertion.
    const shortlyBefore = new Date(Date.now() - 5000).toISOString();
    const patient = patientService.createPatient(
      {
        firstName: 'Rich',
        lastName: 'Record',
        age: 54,
        chiefComplaint: 'Follow-up call',
        flags: ['DeteriorationRisk', 'SepsisAlert'],
        vitals: [
          {
            hr: 118,
            sbp: 96,
            dbp: 58,
            spo2: 91,
            temp: 38.9,
            rr: 26,
            gcs: 14,
            pain: 6,
            recordedAt: now,
            recordedBy: 'rn-1',
          },
        ],
        notes: [
          {
            id: 'note-1',
            text: 'Administered 1L NS bolus and O2 4L NC prior to callback.',
            authorId: 'rn-1',
            timestamp: shortlyBefore,
          },
        ],
      },
      'org-a',
    );

    const result = service.requestPhysicianTransport(
      {
        patientId: patient.id,
        reason: 'Sepsis red flags on phone triage',
        urgency: 'P1',
        location: '9 Birch Ave',
      },
      { staffId: 'dr-3', name: 'Dr. Alvarez' },
      'org-a',
    );

    const arrival = findSimulatedArrival(patient.id);
    expect(arrival).toBeDefined();
    expect(arrival.atmist).toBeDefined();

    // A - age from the chart.
    expect(arrival.atmist.age).toBe('54 years');
    // T (onset) - the request's own timestamp, not some other clock.
    expect(arrival.atmist.timeOfOnset).toBe(result.data.requestedAt);
    // M - the request's own reason, not a stale chiefComplaint.
    expect(arrival.atmist.mechanismOrComplaint).toBe('Sepsis red flags on phone triage');
    // I - real active safety flags, humanized, excluding the pipeline-only markers
    // this same request adds (EMSArrival / PhysicianRequestedTransportSimulated).
    expect(arrival.atmist.injuriesOrInformation).toBe('Deterioration Risk, Sepsis Alert');
    expect(arrival.atmist.injuriesOrInformation).not.toMatch(/EMSArrival|Simulated/i);
    // S - the most recent recorded vitals.
    expect(arrival.atmist.signsAndSymptoms).toBe(
      'HR 118, BP 96/58, SpO2 91%, Temp 38.9°C, RR 26, GCS 14, Pain 6/10',
    );
    // T (treatments) - the most recent clinical note, since it's recent.
    expect(arrival.atmist.treatmentsGiven).toBe(
      'Administered 1L NS bolus and O2 4L NC prior to callback.',
    );
  });

  it('renders honest "Not recorded"/"None recorded" for fields with genuinely nothing on file, never fabricated content', () => {
    const patient = patientService.createPatient(
      { firstName: 'Sparse', lastName: 'Record', chiefComplaint: 'Follow-up call' },
      'org-a',
    );

    service.requestPhysicianTransport(
      { patientId: patient.id, reason: 'Confusion reported by family', urgency: 'P2' },
      { staffId: 'dr-4', name: 'Dr. Chen' },
      'org-a',
    );

    const arrival = findSimulatedArrival(patient.id);
    expect(arrival.atmist).toBeDefined();

    // No age was ever provided -- createPatient() defaults it to 0, which is
    // not a real recorded age.
    expect(arrival.atmist.age).toBe('Not recorded');
    // No safety flags beyond this request's own pipeline markers.
    expect(arrival.atmist.injuriesOrInformation).toBe('None recorded');
    // No vitals were ever recorded for this patient.
    expect(arrival.atmist.signsAndSymptoms).toBe('Not recorded');
    // No notes and only auto-generated timeline entries -- none of them a
    // genuine "treatment given".
    expect(arrival.atmist.treatmentsGiven).toBe('None recorded');
  });

  it('ignores a stale note from well outside the recent-treatment window rather than presenting it as given for this request', () => {
    const staleTimestamp = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days ago
    const patient = patientService.createPatient(
      {
        firstName: 'Stale',
        lastName: 'Note',
        chiefComplaint: 'Follow-up call',
        notes: [
          {
            id: 'note-old',
            text: 'Unrelated note from a prior, much earlier visit.',
            authorId: 'rn-2',
            timestamp: staleTimestamp,
          },
        ],
      },
      'org-a',
    );

    service.requestPhysicianTransport(
      { patientId: patient.id, reason: 'New complaint entirely', urgency: 'P3' },
      { staffId: 'dr-5', name: 'Dr. Lee' },
      'org-a',
    );

    const arrival = findSimulatedArrival(patient.id);
    expect(arrival.atmist.treatmentsGiven).toBe('None recorded');
  });

  it('is absent (undefined) on a normal, non-simulated EMS-initiated arrival', () => {
    const realEmsPatient = patientService.createPatient(
      {
        firstName: 'Real',
        lastName: 'Ems',
        state: 'Arrival',
        chiefComplaint: 'EMS pre-arrival: MVC',
        flags: ['EMSArrival'],
      },
      'org-a',
    );

    const intake = service.getEMSIntake('org-a');
    const arrival: any = intake.data.emsArrivals.find(
      (row: any) => row.id === `ems-arrival-${realEmsPatient.id}`,
    );
    expect(arrival).toBeDefined();
    expect(arrival.simulated).toBe(false);
    expect(arrival.atmist).toBeUndefined();
  });
});
