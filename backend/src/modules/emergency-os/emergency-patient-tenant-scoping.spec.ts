import {
  EmergencyPatientService,
  EmergencyWhiteboardService,
  BoardingService,
  ReassessmentService,
  QueueIntelligenceService,
  PatientJourneyService,
  EmergencyAnalyticsService,
  ReferralService,
  EMSIntakeService,
  ReceptionWorkspaceService,
  SmartIntakeService,
  ProvincialHealthService,
  EDCopilotService,
} from './emergency-os.services';

function makeService() {
  const workflowLogService = { record: jest.fn() } as unknown as { record: jest.Mock };
  const service = new EmergencyPatientService(workflowLogService as any);
  return { service, workflowLogService };
}

describe('EmergencyPatientService — organization tenant scoping (Emergency-OS Tenant Scoping Gap)', () => {
  // Every id-keyed read/mutation used to operate with zero organization
  // scoping -- any caller could read or PATCH any hospital's patient by id.
  // Patients with no `organizationId` (every pre-migration row, since no
  // reliable backfill signal exists) are treated as legacy/unscoped and stay
  // visible to every org until reconciled; a patient with a REAL org never
  // becomes visible to, or mutable by, a different real org.

  it('createPatient stamps the caller-resolved organizationId, overriding anything on the input body', () => {
    const { service } = makeService();
    const patient = service.createPatient(
      { firstName: 'Org', lastName: 'A', organizationId: 'org-spoofed' } as any,
      'org-a',
    );
    expect(patient.organizationId).toBe('org-a');
  });

  it('listPatients(organizationId) includes own-org and legacy/unscoped rows, excludes a different org', () => {
    const { service } = makeService();
    const before = service.listPatients().length;
    service.createPatient({ firstName: 'Own', lastName: 'Org' } as any, 'org-a');
    service.createPatient({ firstName: 'Other', lastName: 'Org' } as any, 'org-b');

    const scoped = service.listPatients('org-a');
    expect(scoped.some((p) => p.firstName === 'Own')).toBe(true);
    expect(scoped.some((p) => p.firstName === 'Other')).toBe(false);
    // Fixture-seeded demo patients carry no organizationId -- legacy/unscoped,
    // so they remain visible under any org's filter.
    expect(scoped.length).toBeGreaterThanOrEqual(before);
  });

  it('listPatients() with no organizationId argument is unfiltered (preserves existing internal-caller behavior)', () => {
    const { service } = makeService();
    service.createPatient({ firstName: 'Org', lastName: 'A' } as any, 'org-a');
    service.createPatient({ firstName: 'Org', lastName: 'B' } as any, 'org-b');

    const unscoped = service.listPatients();
    expect(unscoped.some((p) => p.firstName === 'Org' && p.lastName === 'A')).toBe(true);
    expect(unscoped.some((p) => p.firstName === 'Org' && p.lastName === 'B')).toBe(true);
  });

  it("getPatient hides a different org's patient and returns undefined, same as a genuinely missing id", () => {
    const { service } = makeService();
    const patient = service.createPatient({ firstName: 'Cross', lastName: 'Org' } as any, 'org-a');

    expect(service.getPatient(patient.id, 'org-b')).toBeUndefined();
    expect(service.getPatient(patient.id, 'org-a')).toBeDefined();
    expect(service.getPatient(patient.id)).toBeDefined();
  });

  it('updatePatient rejects a cross-org id with the same not-found error shape as a missing id (no existence leak)', () => {
    const { service } = makeService();
    const patient = service.createPatient({ firstName: 'Cross', lastName: 'Org' } as any, 'org-a');

    expect(() => service.updatePatient(patient.id, { priority: 'P1' }, 'org-b')).toThrow(
      /not found/i,
    );
    expect(() =>
      service.updatePatient('genuinely-missing-id', { priority: 'P1' }, 'org-b'),
    ).toThrow(/not found/i);
    expect(service.updatePatient(patient.id, { priority: 'P1' }, 'org-a').priority).toBe('P1');
  });

  it('assignStaffToPatient rejects a cross-org id and succeeds for the owning org', () => {
    const { service } = makeService();
    const patient = service.createPatient({ firstName: 'Cross', lastName: 'Org' } as any, 'org-a');

    expect(() => service.assignStaffToPatient(patient.id, 'staff-1', 'actor', 'org-b')).toThrow(
      /not found/i,
    );
    expect(
      service.assignStaffToPatient(patient.id, 'staff-1', 'actor', 'org-a').assignedStaffId,
    ).toBe('staff-1');
  });

  it("escalatePatient rejects a cross-org id, and the resulting alert inherits the patient's own organizationId", () => {
    const { service } = makeService();
    const patient = service.createPatient({ firstName: 'Cross', lastName: 'Org' } as any, 'org-a');

    expect(() => service.escalatePatient(patient.id, 'actor', 'org-b')).toThrow(/not found/i);

    service.escalatePatient(patient.id, 'actor', 'org-a');
    const alert = service.listAlerts().find((candidate) => candidate.patientId === patient.id);
    expect(alert?.organizationId).toBe('org-a');
  });

  it("createPatient refuses to shadow-create a second row when a client-supplied id collides with a different org's patient", () => {
    const { service } = makeService();
    const existing = service.createPatient(
      { id: 'shared-id', firstName: 'Original' } as any,
      'org-a',
    );

    expect(() =>
      service.createPatient({ id: 'shared-id', firstName: 'Impersonator' } as any, 'org-b'),
    ).toThrow(/already in use/i);
    expect(service.getPatient(existing.id, 'org-a')?.firstName).toBe('Original');
  });

  it('listAlerts(organizationId) includes own-org and legacy/unscoped alerts, excludes a different org', () => {
    const { service } = makeService();
    const patientA = service.createPatient({ firstName: 'Own', lastName: 'Org' } as any, 'org-a');
    const patientB = service.createPatient({ firstName: 'Other', lastName: 'Org' } as any, 'org-b');
    service.escalatePatient(patientA.id, 'actor', 'org-a');
    service.escalatePatient(patientB.id, 'actor', 'org-b');

    const scoped = service.listAlerts('org-a');
    expect(scoped.some((alert) => alert.patientId === patientA.id)).toBe(true);
    expect(scoped.some((alert) => alert.patientId === patientB.id)).toBe(false);

    // Unfiltered call preserves existing internal-caller behavior.
    const unscoped = service.listAlerts();
    expect(unscoped.some((alert) => alert.patientId === patientA.id)).toBe(true);
    expect(unscoped.some((alert) => alert.patientId === patientB.id)).toBe(true);
  });

  it("getPatientEnvelope(organizationId) scopes patients and alerts to the caller's org (BOLA audit: GET /emergency/patients previously returned every hospital's full roster)", () => {
    const { service } = makeService();
    const patientA = service.createPatient({ firstName: 'Own', lastName: 'Org' } as any, 'org-a');
    const patientB = service.createPatient({ firstName: 'Other', lastName: 'Org' } as any, 'org-b');

    const scoped = service.getPatientEnvelope('org-a').data.patients;
    expect(scoped.some((patient) => patient.id === patientA.id)).toBe(true);
    expect(scoped.some((patient) => patient.id === patientB.id)).toBe(false);
  });
});

describe('EmergencyWhiteboardService — the whiteboard, the single most-viewed clinical screen', () => {
  function makeWhiteboard() {
    const workflowLogService = { record: jest.fn() } as unknown as { record: jest.Mock };
    const patientService = new EmergencyPatientService(workflowLogService as any);
    const referralService = new ReferralService(patientService);
    return {
      patientService,
      referralService,
      whiteboard: new EmergencyWhiteboardService(patientService, referralService),
    };
  }

  it("getWhiteboard(organizationId) scopes patients and alerts to the caller's org (own-org or legacy/unscoped)", () => {
    const { patientService, whiteboard } = makeWhiteboard();
    const patientA = patientService.createPatient(
      { firstName: 'Own', lastName: 'Org' } as any,
      'org-a',
    );
    const patientB = patientService.createPatient(
      { firstName: 'Other', lastName: 'Org' } as any,
      'org-b',
    );
    patientService.escalatePatient(patientA.id, 'actor', 'org-a');
    patientService.escalatePatient(patientB.id, 'actor', 'org-b');

    const scoped = whiteboard.getWhiteboard('org-a').data;
    expect(scoped.patients.some((p) => p.id === patientA.id)).toBe(true);
    expect(scoped.patients.some((p) => p.id === patientB.id)).toBe(false);
    expect(scoped.alerts.some((a) => a.patientId === patientA.id)).toBe(true);
    expect(scoped.alerts.some((a) => a.patientId === patientB.id)).toBe(false);
  });

  it('getWhiteboard() with no organizationId stays unfiltered (preserves existing internal-caller behavior)', () => {
    const { patientService, whiteboard } = makeWhiteboard();
    patientService.createPatient({ firstName: 'Org', lastName: 'A' } as any, 'org-a');
    patientService.createPatient({ firstName: 'Org', lastName: 'B' } as any, 'org-b');

    const unscoped = whiteboard.getWhiteboard().data;
    expect(unscoped.patients.some((p) => p.firstName === 'Org' && p.lastName === 'A')).toBe(true);
    expect(unscoped.patients.some((p) => p.firstName === 'Org' && p.lastName === 'B')).toBe(true);
  });

  // HEAL-347.67: the public waiting-room kiosk (Permission.VIEW_PUBLIC_DISPLAY,
  // deliberately not READ_PHI -- see role-permissions.config.ts) previously had
  // no PHI-safe backend data source at all; its only path to any data was the
  // frontend's shared store, which requires READ_PHI to populate, so a
  // genuinely fresh public_display session (the real deployment model -- an
  // unauthenticated wall-mounted screen, per DisplayShell.tsx's own "no
  // sidebar, no copilot, PHI-safe layouts only" comment) could never see real
  // data. getPublicWaitingSnapshot is the fix: every identifier field a real
  // patient carries (mrn/firstName/lastName/dob/age/sex/chiefComplaint/
  // complaintCategory/vitals/notes/timeline/assignedStaffId/roomId/
  // highRiskComplaintFlags' own .label text/arrival.chiefComplaint) must never
  // appear on its output, on pain of being the exact PHI leak this permission
  // split exists to prevent.
  describe('getPublicWaitingSnapshot — public kiosk aggregate feed (HEAL-347.67)', () => {
    function makeRichPatient(overrides: Record<string, unknown> = {}) {
      return {
        firstName: 'Real',
        lastName: 'Patient',
        mrn: 'ED-999999',
        dob: '1980-01-01',
        age: 45,
        sex: 'F',
        chiefComplaint: 'Chest pain radiating to left arm',
        complaintCategory: 'Cardiac',
        vitals: [
          {
            hr: 110,
            sbp: 140,
            dbp: 90,
            spo2: 95,
            temp: 37.1,
            recordedAt: new Date().toISOString(),
          },
        ],
        notes: [
          {
            id: 'n1',
            text: 'Patient reports worsening symptoms',
            authorId: 'staff-1',
            timestamp: new Date().toISOString(),
          },
        ],
        assignedStaffId: 'staff-1',
        roomId: 'room-3',
        highRiskComplaintFlags: [
          {
            id: 'f1',
            label: 'Possible ACS from chest pain complaint text',
            detectedAt: new Date().toISOString(),
            source: 'complaint-text',
          },
        ],
        arrival: {
          arrivalMode: 'ambulance',
          arrivalTimestamp: new Date().toISOString(),
          chiefComplaint: 'Chest pain radiating to left arm',
          triageAcuity: { code: 'ESI-2', system: 'ESI', level: 2, status: 'confirmed' },
          waitingRoomStatus: 'waiting',
          registrationStatus: 'complete',
          queueDestination: 'triage',
          triagePending: true,
        },
        ...overrides,
      } as any;
    }

    // Every real identifier field, plus every field the trace confirmed is
    // read-but-structurally-discarded (so it must never leak even though it's
    // never load-bearing for the aggregation output either).
    const FORBIDDEN_KEYS = [
      'firstName',
      'lastName',
      'name',
      'mrn',
      'dob',
      'age',
      'sex',
      'chiefComplaint',
      'complaintCategory',
      'vitals',
      'notes',
      'timeline',
      'assignedStaffId',
      'roomId',
      'assignedPhysicianId',
      'arrival',
      'referral',
      'triageAssist',
      'highRiskComplaintFlags',
      'symptoms',
      'allergies',
      'medications',
      'phone',
      'mobilePhone',
      'healthCardNumber',
      'healthCard',
      'phn',
    ];

    it('never includes any PHI/identifier field on a real, fully-populated patient', () => {
      const { patientService, whiteboard } = makeWhiteboard();
      patientService.createPatient(makeRichPatient(), 'org-a');

      const result = whiteboard.getPublicWaitingSnapshot('org-a').data;
      expect(result.patients.length).toBeGreaterThan(0);
      for (const patient of result.patients) {
        const keys = Object.keys(patient);
        for (const forbidden of FORBIDDEN_KEYS) {
          expect(keys).not.toContain(forbidden);
        }
        // Serialize the whole record and confirm none of the actual PHI
        // *values* leaked through under some other key name either.
        const serialized = JSON.stringify(patient);
        expect(serialized).not.toContain('Real');
        expect(serialized).not.toContain('Patient');
        expect(serialized).not.toContain('ED-999999');
        expect(serialized).not.toContain('Chest pain');
        expect(serialized).not.toContain('Possible ACS');
      }
    });

    it('still carries the fields the public aggregation actually needs (state, timestamps, high-risk boolean)', () => {
      const { patientService, whiteboard } = makeWhiteboard();
      const created = patientService.createPatient(makeRichPatient(), 'org-a');

      // listPatients('org-a') also includes legacy/unscoped fixture-seeded
      // demo patients (see the tenant-scoping describe block above) -- find
      // the one this test actually created rather than assuming it's first.
      const patient = whiteboard
        .getPublicWaitingSnapshot('org-a')
        .data.patients.find((p) => p.id === created.id)!;
      expect(patient).toBeDefined();
      expect(patient.state).toBeDefined();
      expect(patient.arrivalTime).toBeDefined();
      expect(patient.hasHighRiskComplaintFlag).toBe(
        Boolean(created.highRiskComplaintFlags?.length),
      );
    });

    it('never exposes the raw clinical flags array -- only the booleanized hasHighRiskComplaintFlag', () => {
      // Item found in a design-system/AI-truthfulness audit pass: `flags`
      // (real values include SepsisAlert/DeteriorationRisk/HighRisk) used to
      // pass straight through to this VIEW_PUBLIC_DISPLAY-only endpoint,
      // inconsistent with hasHighRiskComplaintFlag's correct minimization
      // right next to it, and confirmed unused by the real frontend consumer.
      const { patientService, whiteboard } = makeWhiteboard();
      const created = patientService.createPatient(
        { ...makeRichPatient(), flags: ['SepsisAlert', 'DeteriorationRisk'] } as any,
        'org-a',
      );

      const patient = whiteboard
        .getPublicWaitingSnapshot('org-a')
        .data.patients.find((p) => p.id === created.id)!;
      expect(patient).toBeDefined();
      expect(patient).not.toHaveProperty('flags');
      const serialized = JSON.stringify(patient);
      expect(serialized).not.toContain('SepsisAlert');
      expect(serialized).not.toContain('DeteriorationRisk');
    });

    it("scopes to organization the same way getWhiteboard does (own-org and legacy/unscoped, never a different org's)", () => {
      const { patientService, whiteboard } = makeWhiteboard();
      const patientA = patientService.createPatient(makeRichPatient({ lastName: 'A' }), 'org-a');
      const patientB = patientService.createPatient(makeRichPatient({ lastName: 'B' }), 'org-b');

      const scoped = whiteboard.getPublicWaitingSnapshot('org-a').data;
      expect(scoped.patients.some((p) => p.id === patientA.id)).toBe(true);
      expect(scoped.patients.some((p) => p.id === patientB.id)).toBe(false);
    });

    it('includes capacity for the crowd-level/wait-range math', () => {
      const { whiteboard } = makeWhiteboard();
      const result = whiteboard.getPublicWaitingSnapshot('org-a').data;
      expect(result.capacity).toBeDefined();
    });

    it('strips referrals to {id, patientId, status} only -- never the free-text reason/clinicalSummary/targetDepartment', () => {
      const { patientService, referralService, whiteboard } = makeWhiteboard();
      const patient = patientService.createPatient(makeRichPatient(), 'org-a');
      referralService.createReferral(
        {
          patientId: patient.id,
          targetDepartment: 'Cardiology',
          reason: 'Suspected ACS, chest pain radiating to left arm',
          clinicalSummary: 'Real patient clinical detail that must never leave this endpoint',
          status: 'Sent',
        },
        'org-a',
      );

      const result = whiteboard.getPublicWaitingSnapshot('org-a').data;
      const referral = result.referrals.find((r) => r.patientId === patient.id);
      expect(referral).toBeDefined();
      expect(referral!.status).toBe('Sent');
      expect(Object.keys(referral!).sort()).toEqual(['id', 'patientId', 'status']);

      const serialized = JSON.stringify(result.referrals);
      expect(serialized).not.toContain('Cardiology');
      expect(serialized).not.toContain('ACS');
      expect(serialized).not.toContain('clinical detail');
    });

    it("referrals scope to organization the same way patients do (own-org and legacy/unscoped, never a different org's)", () => {
      const { patientService, referralService, whiteboard } = makeWhiteboard();
      const patientA = patientService.createPatient(makeRichPatient({ lastName: 'A' }), 'org-a');
      const patientB = patientService.createPatient(makeRichPatient({ lastName: 'B' }), 'org-b');
      referralService.createReferral({ patientId: patientA.id, status: 'Sent' }, 'org-a');
      referralService.createReferral({ patientId: patientB.id, status: 'Sent' }, 'org-b');

      const scoped = whiteboard.getPublicWaitingSnapshot('org-a').data;
      expect(scoped.referrals.some((r) => r.patientId === patientA.id)).toBe(true);
      expect(scoped.referrals.some((r) => r.patientId === patientB.id)).toBe(false);
    });
  });
});

describe('BoardingService and ReassessmentService — organization tenant scoping (HEAL-347.4 follow-up)', () => {
  function makeServices() {
    const workflowLogService = { record: jest.fn() } as unknown as { record: jest.Mock };
    const patientService = new EmergencyPatientService(workflowLogService as any);
    return {
      patientService,
      boarding: new BoardingService(patientService),
      reassessment: new ReassessmentService(patientService),
    };
  }

  it("BoardingService.getBoarding(organizationId) scopes boarding patients to the caller's org", () => {
    const { patientService, boarding } = makeServices();
    const patientA = patientService.createPatient(
      { firstName: 'Own', lastName: 'Org', flags: ['PendingAdmission'] } as any,
      'org-a',
    );
    const patientB = patientService.createPatient(
      { firstName: 'Other', lastName: 'Org', flags: ['PendingAdmission'] } as any,
      'org-b',
    );

    const scoped = boarding.getBoarding('org-a').data;
    expect(scoped.patients.some((p) => p.id === patientA.id)).toBe(true);
    expect(scoped.patients.some((p) => p.id === patientB.id)).toBe(false);

    const unscoped = boarding.getBoarding().data;
    expect(unscoped.patients.some((p) => p.id === patientA.id)).toBe(true);
    expect(unscoped.patients.some((p) => p.id === patientB.id)).toBe(true);
  });

  it("ReassessmentService.getReassessmentQueue(organizationId) scopes overdue patients to the caller's org", () => {
    const { patientService, reassessment } = makeServices();
    const patientA = patientService.createPatient(
      { firstName: 'Own', lastName: 'Org', flags: ['ReassessmentDue'] } as any,
      'org-a',
    );
    const patientB = patientService.createPatient(
      { firstName: 'Other', lastName: 'Org', flags: ['ReassessmentDue'] } as any,
      'org-b',
    );

    const scoped = reassessment.getReassessmentQueue('org-a').data;
    expect(scoped.patients.some((p) => p.id === patientA.id)).toBe(true);
    expect(scoped.patients.some((p) => p.id === patientB.id)).toBe(false);

    const unscoped = reassessment.getReassessmentQueue().data;
    expect(unscoped.patients.some((p) => p.id === patientA.id)).toBe(true);
    expect(unscoped.patients.some((p) => p.id === patientB.id)).toBe(true);
  });
});

describe('QueueIntelligenceService — organization tenant scoping (HEAL-347.4 follow-up)', () => {
  it("getQueues(organizationId) scopes each queue's patients to the caller's org", () => {
    const workflowLogService = { record: jest.fn() } as unknown as { record: jest.Mock };
    const patientService = new EmergencyPatientService(workflowLogService as any);
    const queueService = new QueueIntelligenceService(patientService);

    const patientA = patientService.createPatient(
      { firstName: 'Own', lastName: 'Org', state: 'Triage' } as any,
      'org-a',
    );
    const patientB = patientService.createPatient(
      { firstName: 'Other', lastName: 'Org', state: 'Triage' } as any,
      'org-b',
    );

    const scoped = queueService.getQueues('org-a').data;
    const scopedTriage = scoped.queues.find((queue) => queue.label === 'Triage');
    expect(scopedTriage?.patients.some((p) => p.id === patientA.id)).toBe(true);
    expect(scopedTriage?.patients.some((p) => p.id === patientB.id)).toBe(false);

    const unscoped = queueService.getQueues().data;
    const unscopedTriage = unscoped.queues.find((queue) => queue.label === 'Triage');
    expect(unscopedTriage?.patients.some((p) => p.id === patientA.id)).toBe(true);
    expect(unscopedTriage?.patients.some((p) => p.id === patientB.id)).toBe(true);
  });
});

describe('PatientJourneyService and EmergencyAnalyticsService — organization tenant scoping (HEAL-347.4 follow-up)', () => {
  function makeServices() {
    const workflowLogService = { record: jest.fn() } as unknown as { record: jest.Mock };
    const patientService = new EmergencyPatientService(workflowLogService as any);
    return {
      patientService,
      journey: new PatientJourneyService(patientService),
      analytics: new EmergencyAnalyticsService(patientService),
    };
  }

  it("PatientJourneyService.getJourney(organizationId) scopes timeline events to the caller's org", () => {
    const { patientService, journey } = makeServices();
    const patientA = patientService.createPatient(
      { firstName: 'Own', lastName: 'Org' } as any,
      'org-a',
    );
    const patientB = patientService.createPatient(
      { firstName: 'Other', lastName: 'Org' } as any,
      'org-b',
    );

    const scoped = journey.getJourney('org-a').data;
    expect(scoped.events.some((event) => event.patientId === patientA.id)).toBe(true);
    expect(scoped.events.some((event) => event.patientId === patientB.id)).toBe(false);

    const unscoped = journey.getJourney().data;
    expect(unscoped.events.some((event) => event.patientId === patientA.id)).toBe(true);
    expect(unscoped.events.some((event) => event.patientId === patientB.id)).toBe(true);
  });

  it("EmergencyAnalyticsService.getAnalytics(organizationId) scopes the active census to the caller's org", () => {
    const { patientService, analytics } = makeServices();
    const before = analytics.getAnalytics().data.activeCensus;
    patientService.createPatient({ firstName: 'Own', lastName: 'Org' } as any, 'org-a');
    patientService.createPatient({ firstName: 'Other', lastName: 'Org' } as any, 'org-b');

    const scoped = analytics.getAnalytics('org-a').data;
    // Legacy/unscoped fixture patients remain visible under any org's filter,
    // but a different real org's patient must not inflate this org's census.
    expect(scoped.activeCensus).toBeLessThan(analytics.getAnalytics().data.activeCensus);
    expect(scoped.activeCensus).toBeGreaterThanOrEqual(before);
  });
});

describe('ReferralService — organization tenant scoping (HEAL-347.5 follow-up, real persisted referrals)', () => {
  function makeReferralService() {
    const workflowLogService = { record: jest.fn() } as unknown as { record: jest.Mock };
    const patientService = new EmergencyPatientService(workflowLogService as any);
    return { patientService, referrals: new ReferralService(patientService) };
  }

  it('createReferral stamps the caller-resolved organizationId, overriding anything on the input body', () => {
    const { referrals } = makeReferralService();
    const result = referrals.createReferral(
      { patientId: 'patient-1', reason: 'Cardiology consult', organizationId: 'org-spoofed' },
      'org-a',
    );
    expect((result.data.referral as { organizationId?: string }).organizationId).toBe('org-a');
  });

  it("createReferral does not embed a different org's patient data even when patientId belongs to another organization (BOLA audit)", () => {
    // organizationId was already threaded through from the controller to
    // createReferral, but never actually used in the listPatients() lookup
    // that resolves the embedded `patient` field -- a caller in org-a
    // referencing a real patientId from org-b got that patient's full
    // record (name, vitals, chief complaint) embedded in the response.
    const { patientService, referrals } = makeReferralService();
    const otherOrgPatient = patientService.createPatient(
      { firstName: 'Other', lastName: 'OrgPatient' } as any,
      'org-b',
    );

    const result = referrals.createReferral(
      { patientId: otherOrgPatient.id, reason: 'Should not resolve' },
      'org-a',
    );

    expect((result.data.referral as { patient?: unknown }).patient).toBeUndefined();
  });

  it('getReferrals(organizationId) includes own-org and legacy/unscoped created referrals, excludes a different org', () => {
    const { referrals } = makeReferralService();
    referrals.createReferral({ patientId: 'patient-a', reason: 'Own org referral' }, 'org-a');
    referrals.createReferral({ patientId: 'patient-b', reason: 'Other org referral' }, 'org-b');

    const scoped = referrals.getReferrals('org-a').data.referrals as Array<{ reason: string }>;
    expect(scoped.some((referral) => referral.reason === 'Own org referral')).toBe(true);
    expect(scoped.some((referral) => referral.reason === 'Other org referral')).toBe(false);

    const unscoped = referrals.getReferrals().data.referrals as Array<{ reason: string }>;
    expect(unscoped.some((referral) => referral.reason === 'Own org referral')).toBe(true);
    expect(unscoped.some((referral) => referral.reason === 'Other org referral')).toBe(true);
  });

  it('updateReferralStatus rejects a cross-org id with the same not-found error shape as a missing id (no existence leak)', () => {
    const { referrals } = makeReferralService();
    const created = referrals.createReferral(
      { patientId: 'patient-a', reason: 'Own org referral' },
      'org-a',
    );
    const referralId = (created.data.referral as { id: string }).id;

    expect(() => referrals.updateReferralStatus(referralId, 'Accepted', 'org-b')).toThrow(
      /not found/i,
    );
    expect(() =>
      referrals.updateReferralStatus('genuinely-missing-id', 'Accepted', 'org-b'),
    ).toThrow(/not found/i);
    const result = referrals.updateReferralStatus(referralId, 'Accepted', 'org-a');
    expect((result.data.referral as { status: string }).status).toBe('Accepted');
  });
});

describe('EMSIntakeService — organization tenant scoping (HEAL-347.69)', () => {
  // updateArrivalStatus/completeHandoff/getEMSIntake previously took no
  // organizationId at all, unlike every sibling service in this file --
  // any authenticated caller could read another hospital's EMS intake feed,
  // or PATCH/complete another hospital's ambulance arrival by id/patientId.
  function makeEmsIntakeService() {
    // completeHandoff reads .id off record()'s return value (a real
    // WorkflowActionLog in production) -- give the mock the same shape.
    const workflowLogService = {
      record: jest.fn((entry) => ({ id: 'log-1', ...entry })),
    } as unknown as { record: jest.Mock };
    const patientService = new EmergencyPatientService(workflowLogService as any);
    const emsIntake = new EMSIntakeService(patientService, workflowLogService as any);
    return { patientService, workflowLogService, emsIntake };
  }

  function makeEmsPatient(patientService: EmergencyPatientService, organizationId: string) {
    return patientService.createPatient(
      { firstName: 'EMS', lastName: 'Arrival', flags: ['EMSArrival'] } as any,
      organizationId,
    );
  }

  it("getEMSIntake(organizationId) scopes inbound EMS arrivals to the caller's org", () => {
    const { patientService, emsIntake } = makeEmsIntakeService();
    const patientA = makeEmsPatient(patientService, 'org-a');
    const patientB = makeEmsPatient(patientService, 'org-b');

    const scoped = emsIntake.getEMSIntake('org-a').data as {
      arrivals: Array<{ patient: { id: string } }>;
    };
    expect(scoped.arrivals.some((row) => row.patient.id === patientA.id)).toBe(true);
    expect(scoped.arrivals.some((row) => row.patient.id === patientB.id)).toBe(false);

    const unscoped = emsIntake.getEMSIntake().data as {
      arrivals: Array<{ patient: { id: string } }>;
    };
    expect(unscoped.arrivals.some((row) => row.patient.id === patientA.id)).toBe(true);
    expect(unscoped.arrivals.some((row) => row.patient.id === patientB.id)).toBe(true);
  });

  it('updateArrivalStatus rejects a cross-org patientId, and succeeds for the owning org', () => {
    const { patientService, emsIntake } = makeEmsIntakeService();
    const patient = makeEmsPatient(patientService, 'org-a');
    const arrivalId = `ems-arrival-${patient.id}`;

    expect(() =>
      emsIntake.updateArrivalStatus(
        arrivalId,
        { patientId: patient.id, status: 'Arrived' },
        'org-b',
      ),
    ).toThrow(/not found/i);

    const result = emsIntake.updateArrivalStatus(
      arrivalId,
      { patientId: patient.id, status: 'Arrived' },
      'org-a',
    ).data as { ok: boolean; status?: string };
    expect(result.ok).toBe(true);
    expect(result.status).toBe('Arrived');
  });

  it('completeHandoff rejects a cross-org patientId outright (no note, no arrival mutation) and succeeds for the owning org', () => {
    const { patientService, workflowLogService, emsIntake } = makeEmsIntakeService();
    const patient = makeEmsPatient(patientService, 'org-a');
    const arrivalId = `ems-arrival-${patient.id}`;
    workflowLogService.record.mockClear();

    // The note-recording step is itself org-scoped (patientId resolves to no
    // patient), but completeHandoff still forwards the raw patientId into its
    // internal updateArrivalStatus() call -- which independently re-validates
    // and rejects the whole handoff for a cross-org patientId, same as a
    // direct updateArrivalStatus call would.
    expect(() =>
      emsIntake.completeHandoff(
        { arrivalId, patientId: patient.id, unitName: 'Medic 7' },
        {},
        'org-b',
      ),
    ).toThrow(/not found/i);
    expect(
      workflowLogService.record.mock.calls.some((call) => call[0]?.type === 'patient_note_added'),
    ).toBe(false);

    const ownOrgResult = emsIntake.completeHandoff(
      { arrivalId, patientId: patient.id, unitName: 'Medic 7' },
      {},
      'org-a',
    ).data as { ok: boolean };
    expect(ownOrgResult.ok).toBe(true);
    expect(
      workflowLogService.record.mock.calls.some((call) => call[0]?.type === 'patient_note_added'),
    ).toBe(true);
  });
});

describe('EmergencyPatientService.movePatientToState / patchPatient — organization tenant scoping (HEAL-347.71)', () => {
  // Unlike updatePatient/assignStaffToPatient/escalatePatient, these two
  // mutation methods had NO organizationId parameter at all -- any caller
  // could move or patch a different hospital's patient by id. Found while
  // fixing ReceptionWorkspaceService, which calls both internally.
  it('movePatientToState rejects a cross-org id with the same not-found error shape as a missing id, and succeeds for the owning org', () => {
    const { service } = makeService();
    const patient = service.createPatient({ firstName: 'Cross', lastName: 'Org' } as any, 'org-a');

    expect(() => service.movePatientToState(patient.id, 'Triage', {}, 'org-b')).toThrow(
      /not found/i,
    );
    expect(service.movePatientToState(patient.id, 'Triage', {}, 'org-a').state).toBe('Triage');
  });

  it('patchPatient rejects a cross-org id and succeeds for the owning org', () => {
    const { service } = makeService();
    const patient = service.createPatient({ firstName: 'Cross', lastName: 'Org' } as any, 'org-a');

    expect(() => service.patchPatient(patient.id, { priority: 'P1' }, 'org-b')).toThrow(
      /not found/i,
    );
    expect(service.patchPatient(patient.id, { priority: 'P1' }, 'org-a').priority).toBe('P1');
  });
});

describe('ReceptionWorkspaceService — organization tenant scoping (HEAL-347.71)', () => {
  function makeReceptionWorkspace() {
    const workflowLogService = {
      record: jest.fn(() => ({ id: 'log-1' })),
    } as unknown as { record: jest.Mock };
    const patientService = new EmergencyPatientService(workflowLogService as any);
    const emsIntakeService = new EMSIntakeService(patientService, workflowLogService as any);
    const queueService = new QueueIntelligenceService(patientService);
    const reception = new ReceptionWorkspaceService(
      patientService,
      emsIntakeService,
      queueService,
      workflowLogService as any,
    );
    return { patientService, workflowLogService, reception };
  }

  it("getSnapshot(organizationId) scopes patient-derived metrics to the caller's org", () => {
    const { patientService, reception } = makeReceptionWorkspace();
    // awaitingVerificationPatients is a `.slice(0, 12)` off the full
    // filtered list -- legacy/unscoped fixture-seeded patients can already
    // fill that window, so assert on the un-sliced metrics count's
    // before/after delta instead (same technique used elsewhere in this
    // file for exactly this reason).
    const before = (
      reception.getSnapshot('org-a').data as { metrics: { awaitingVerification: number } }
    ).metrics.awaitingVerification;

    patientService.createPatient(
      { firstName: 'Own', lastName: 'Org', state: 'Registration' } as any,
      'org-a',
    );
    patientService.createPatient(
      { firstName: 'Other', lastName: 'Org', state: 'Registration' } as any,
      'org-b',
    );

    const after = (
      reception.getSnapshot('org-a').data as { metrics: { awaitingVerification: number } }
    ).metrics.awaitingVerification;

    // Only org-a's own new Registration patient should count -- if scoping
    // were broken, org-b's patient would inflate this delta to 2.
    expect(after - before).toBe(1);
  });

  it('completeHandoff rejects a cross-org patientId with the same not-found shape as a missing id, and succeeds for the owning org', () => {
    const { patientService, reception } = makeReceptionWorkspace();
    const patient = patientService.createPatient(
      { firstName: 'Own', lastName: 'Org', state: 'Registration' } as any,
      'org-a',
    );

    expect(() => reception.completeHandoff({ patientId: patient.id }, 'org-b')).toThrow(
      /not found/i,
    );

    const result = reception.completeHandoff({ patientId: patient.id }, 'org-a').data as {
      ok: boolean;
      patient?: { state?: string };
    };
    expect(result.ok).toBe(true);
    expect(result.patient?.state).toBe('Triage');
  });

  it("raiseEscalation stamps the alert with the caller's own organizationId and falls back to the raw id (not a different org's patient name) for a cross-org patientId", () => {
    const { patientService, reception } = makeReceptionWorkspace();
    const patientA = patientService.createPatient(
      { firstName: 'Own', lastName: 'Org' } as any,
      'org-a',
    );
    const patientB = patientService.createPatient(
      { firstName: 'ShouldNotLeak', lastName: 'OrgB' } as any,
      'org-b',
    );

    const ownOrgResult = reception.raiseEscalation(
      { patientId: patientA.id, reasonId: 'urgent-triage-attention' },
      'org-a',
    ).data as { alert: { organizationId?: string }; record: { patientLabel?: string } };
    expect(ownOrgResult.record.patientLabel).toBe('Own Org');
    expect(ownOrgResult.alert.organizationId).toBe('org-a');

    const crossOrgResult = reception.raiseEscalation(
      { patientId: patientB.id, reasonId: 'urgent-triage-attention' },
      'org-a',
    ).data as { record: { patientLabel?: string } };
    // Cross-org patientId resolves to no patient -- falls back to the raw
    // id, never org-b's real patient name.
    expect(crossOrgResult.record.patientLabel).toBe(patientB.id);
    expect(crossOrgResult.record.patientLabel).not.toContain('ShouldNotLeak');
  });
});

// Found 2026-08-27 continuing this campaign: three more real, live,
// READ_PHI-gated routes (GET /emergency/intake, GET /emergency/provincial-health,
// GET /emergency/copilot) called listPatients() with zero organizationId at
// all -- any staff member at any hospital could see another hospital's
// most-recent patients (SmartIntake), real patient identifiers (Provincial
// Health, labeled placeholder records but with genuine patientId/mrn), or
// aggregate census counts blended across organizations (ED Copilot).
describe('SmartIntakeService, ProvincialHealthService, EDCopilotService — organization tenant scoping (2026-08-27)', () => {
  function makeServices() {
    const workflowLogService = { record: jest.fn() } as unknown as { record: jest.Mock };
    const patientService = new EmergencyPatientService(workflowLogService as any);
    return {
      patientService,
      smartIntake: new SmartIntakeService(patientService, workflowLogService as any),
      provincialHealth: new ProvincialHealthService(patientService, workflowLogService as any),
      copilot: new EDCopilotService(patientService, workflowLogService as any),
    };
  }

  it("SmartIntakeService.getSmartIntake(organizationId) scopes recentPatients to the caller's org", () => {
    const { patientService, smartIntake } = makeServices();
    const patientA = patientService.createPatient(
      { firstName: 'Own', lastName: 'Org' } as any,
      'org-a',
    );
    const patientB = patientService.createPatient(
      { firstName: 'Other', lastName: 'Org' } as any,
      'org-b',
    );

    const scoped = smartIntake.getSmartIntake('org-a').data as {
      recentPatients: Array<{ id: string }>;
    };
    expect(scoped.recentPatients.some((patient) => patient.id === patientA.id)).toBe(true);
    expect(scoped.recentPatients.some((patient) => patient.id === patientB.id)).toBe(false);

    const unscoped = smartIntake.getSmartIntake().data as { recentPatients: Array<{ id: string }> };
    expect(unscoped.recentPatients.some((patient) => patient.id === patientB.id)).toBe(true);
  });

  it('ProvincialHealthService.getProvincialHealth(organizationId) threads organizationId into the scoped patient lookup', () => {
    // getProvincialHealth() takes the first 3 of listPatients(organizationId)
    // -- append-order, not recency, so a positional/behavioral assertion
    // would depend on exactly how many legacy fixture patients already
    // precede whatever this test creates, making it unreliable either way.
    // Spying on listPatients() directly verifies the actual bug that was
    // fixed here (organizationId was never passed at all) without coupling
    // the test to fixture ordering.
    const { patientService, provincialHealth } = makeServices();
    const listPatientsSpy = jest.spyOn(patientService, 'listPatients');

    provincialHealth.getProvincialHealth('org-a');
    expect(listPatientsSpy).toHaveBeenCalledWith('org-a');

    provincialHealth.getProvincialHealth();
    expect(listPatientsSpy).toHaveBeenLastCalledWith(undefined);
  });

  it("EDCopilotService.getCopilotContext(organizationId) scopes the census used for prompt context to the caller's org", () => {
    const { patientService, copilot } = makeServices();
    const before = copilot.getCopilotContext().data.promptContext.patientCount;
    patientService.createPatient({ firstName: 'Own', lastName: 'Org' } as any, 'org-a');
    patientService.createPatient({ firstName: 'Other', lastName: 'Org' } as any, 'org-b');

    const scoped = copilot.getCopilotContext('org-a').data.promptContext.patientCount;
    const unscoped = copilot.getCopilotContext().data.promptContext.patientCount;
    // A different real org's patient must not inflate this org's Copilot
    // prompt context, even though it's aggregate-only (no identifiers).
    expect(scoped).toBeLessThan(unscoped);
    expect(scoped).toBeGreaterThanOrEqual(before);
  });
});

describe('WorkflowActionLogEntry tenantId threading (2026-08-27)', () => {
  // Every EmergencyPatientService call site into workflowLogService.record()
  // omitted metadata.tenantId, so every durable workflow_action_logs row
  // fell through record()'s own 'default-tenant' fallback regardless of
  // which real org the action belonged to -- durability existed (Cycle 92/
  // HEAL-252) but every org's rows landed in one shared bucket. Verifies the
  // real organizationId now reaches record()'s metadata for each mutation
  // that logs one, using the patient's own stamped organizationId (not just
  // whatever the caller passed) as the source of truth.
  function makeService() {
    const workflowLogService = { record: jest.fn(() => ({ id: 'log-1' })) } as unknown as {
      record: jest.Mock;
    };
    const service = new EmergencyPatientService(workflowLogService as any);
    return { service, workflowLogService };
  }

  it('assignStaffToPatient threads the patient organizationId into the workflow log metadata', () => {
    const { service, workflowLogService } = makeService();
    const patient = service.createPatient({ firstName: 'Org', lastName: 'A' } as any, 'org-a');

    service.assignStaffToPatient(patient.id, 'staff-1', 'actor-1', 'org-a');

    const call = workflowLogService.record.mock.calls.find((c) => c[0]?.type === 'staff_assigned');
    expect(call?.[0]?.metadata?.tenantId).toBe('org-a');
  });

  it('escalatePatient threads the patient organizationId into the workflow log metadata', () => {
    const { service, workflowLogService } = makeService();
    const patient = service.createPatient({ firstName: 'Org', lastName: 'A' } as any, 'org-a');

    service.escalatePatient(patient.id, 'actor-1', 'org-a');

    const call = workflowLogService.record.mock.calls.find(
      (c) => c[0]?.type === 'patient_escalated',
    );
    expect(call?.[0]?.metadata?.tenantId).toBe('org-a');
  });

  it('addPatientNote threads the patient organizationId into the workflow log metadata, with no organizationId parameter of its own', () => {
    const { service, workflowLogService } = makeService();
    const patient = service.createPatient({ firstName: 'Org', lastName: 'A' } as any, 'org-a');

    service.addPatientNote(patient.id, 'A note', 'actor-1');

    const call = workflowLogService.record.mock.calls.find(
      (c) => c[0]?.type === 'patient_note_added',
    );
    expect(call?.[0]?.metadata?.tenantId).toBe('org-a');
  });
});
