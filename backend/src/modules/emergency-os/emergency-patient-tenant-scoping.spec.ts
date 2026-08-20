import {
  EmergencyPatientService,
  EmergencyWhiteboardService,
  BoardingService,
  ReassessmentService,
  QueueIntelligenceService,
  PatientJourneyService,
  EmergencyAnalyticsService,
  ReferralService,
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
});

describe('EmergencyWhiteboardService — the whiteboard, the single most-viewed clinical screen', () => {
  function makeWhiteboard() {
    const workflowLogService = { record: jest.fn() } as unknown as { record: jest.Mock };
    const patientService = new EmergencyPatientService(workflowLogService as any);
    return { patientService, whiteboard: new EmergencyWhiteboardService(patientService) };
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
