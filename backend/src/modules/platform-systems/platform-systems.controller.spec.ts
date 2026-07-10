import { PlatformSystemsController } from './platform-systems.controller';

describe('PlatformSystemsController', () => {
  const buildController = (governanceOverrides: Record<string, any> = {}) => {
    const platformSystemsService = {
      demo: jest.fn((capabilityId: string, id?: string, payload?: Record<string, unknown>) => ({
        capabilityId,
        id,
        payload,
        status: 'demo_review_required',
      })),
      getSourceProvenance: jest.fn((sourceId: string) => ({ sourceId, fallback: true })),
      getAuditRunTimeline: jest.fn((runId: string) => ({ runId, timeline: [] })),
      getAuditIntegrityStatus: jest.fn(() => ({ status: 'demo_verified' })),
      getOperationsHealth: jest.fn(() => ({ status: 'demo_degraded_until_configured' })),
      getObservabilitySummary: jest.fn(() => ({ degradedMode: true })),
    };
    const platformGovernanceService = {
      getPatientSourceData: jest.fn((patientId: string) => ({ patientId, sources: [] })),
      evaluateGate: jest.fn((body: Record<string, unknown>) => ({ allowed: true, ...body })),
      listPrivacyRequests: jest.fn(() => [{ id: 'privacy-1' }]),
      reviewPrivacyRequest: jest.fn(() => ({ id: 'privacy-1', status: 'resolved' })),
      listPolicies: jest.fn(() => [{ id: 'policy-1' }]),
      createPolicy: jest.fn((body: Record<string, unknown>) => ({ id: 'policy-2', ...body })),
      updatePolicy: jest.fn((policyId: string, body: Record<string, unknown>) => ({
        id: policyId,
        ...body,
      })),
      approvePolicy: jest.fn((policyId: string) => ({ id: policyId, status: 'active' })),
      listReleaseGates: jest.fn(() => [{ id: 'gate-1' }]),
      createReleaseGate: jest.fn((body: Record<string, unknown>) => ({ id: 'gate-2', ...body })),
      decideReleaseGate: jest.fn((gateId: string) => ({ id: gateId, status: 'blocked' })),
      listSafetyFindings: jest.fn(() => [{ id: 'finding-1' }]),
      reviewSafetyFinding: jest.fn((findingId: string) => ({ id: findingId, status: 'resolved' })),
      recordObservabilityEvent: jest.fn().mockResolvedValue({ id: 'event-1' }),
      getPrivacyAccessLog: jest.fn((patientId?: string) => ({ patientId, accessLog: [] })),
      recentObservability: jest.fn(() => ({ status: 'synthetic_ready' })),
      ...governanceOverrides,
    };
    const emergencyPatientService = {
      listPatients: jest.fn(() => [{ id: 'pt-001', firstName: 'Maya', lastName: 'Singh' }]),
      getPatient: jest.fn((patientId: string) =>
        patientId === 'pt-001' ? { id: 'pt-001', firstName: 'Maya', lastName: 'Singh' } : undefined,
      ),
      createPatient: jest.fn((input: Record<string, unknown>) => ({ id: 'pt-002', ...input })),
      updatePatient: jest.fn((patientId: string, patch: Record<string, unknown>) => {
        if (patientId !== 'pt-001') throw new Error('not found');
        return { id: patientId, ...patch };
      }),
      listStaff: jest.fn(() => [{ id: 'staff-1', active: true }]),
      listRooms: jest.fn(() => [{ id: 'room-1', status: 'Available' }]),
    };
    const referralService = {
      getReferrals: jest.fn(() => ({ data: { referrals: [{ id: 'ref-1' }] } })),
      createReferral: jest.fn((input: Record<string, unknown>) => ({
        data: { referral: { id: 'ref-2', ...input } },
      })),
    };
    const emsIntakeService = {
      getEMSIntake: jest.fn(() => ({ data: { arrivals: [], emsArrivals: [] } })),
    };

    return {
      controller: new PlatformSystemsController(
        platformSystemsService as any,
        emergencyPatientService as any,
        referralService as any,
        emsIntakeService as any,
        platformGovernanceService as any,
      ),
      platformSystemsService,
      platformGovernanceService,
      emergencyPatientService,
      referralService,
      emsIntakeService,
    };
  };

  it('routes patient source data and privacy requests through durable governance services', async () => {
    const { controller, platformGovernanceService } = buildController();

    await expect(controller.getPatientSourceData('patient-1')).resolves.toEqual({
      patientId: 'patient-1',
      sources: [],
    });
    await expect(controller.getPrivacyRequests()).resolves.toEqual([{ id: 'privacy-1' }]);

    expect(platformGovernanceService.getPatientSourceData).toHaveBeenCalledWith('patient-1');
    expect(platformGovernanceService.listPrivacyRequests).toHaveBeenCalled();
  });

  it('uses gate evaluation for prompt security instead of a demo-only response', async () => {
    const { controller, platformGovernanceService } = buildController();

    await controller.evaluatePromptSecurity({
      runId: 'run-1',
      capabilityId: 'clinical-chat',
      prompt: 'hello',
    });

    expect(platformGovernanceService.evaluateGate).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: 'run-1',
        capabilityId: 'clinical-chat',
        prompt: 'hello',
        action: 'ai-security/evaluate',
      }),
    );
  });

  it('routes clinical governance policies, release gates, and safety findings through durable services', async () => {
    const { controller, platformGovernanceService } = buildController();

    await expect(controller.getClinicalPolicies()).resolves.toEqual([{ id: 'policy-1' }]);
    await expect(
      controller.createClinicalPolicy({ capabilityId: 'clinical-governance' }),
    ).resolves.toEqual(expect.objectContaining({ id: 'policy-2' }));
    await expect(
      controller.approveClinicalPolicy('policy-1', { decision: 'approve' }),
    ).resolves.toEqual(expect.objectContaining({ status: 'active' }));
    await expect(controller.getClinicalReleaseGates()).resolves.toEqual([{ id: 'gate-1' }]);
    await expect(
      controller.decideClinicalReleaseGate('gate-1', { decision: 'reject' }),
    ).resolves.toEqual(expect.objectContaining({ status: 'blocked' }));
    await expect(controller.getGovernanceSafetyFindings()).resolves.toEqual([{ id: 'finding-1' }]);
    await expect(
      controller.reviewGovernanceSafetyFinding('finding-1', { decision: 'resolve' }),
    ).resolves.toEqual(expect.objectContaining({ status: 'resolved' }));

    expect(platformGovernanceService.listPolicies).toHaveBeenCalled();
    expect(platformGovernanceService.createPolicy).toHaveBeenCalled();
    expect(platformGovernanceService.approvePolicy).toHaveBeenCalledWith('policy-1', {
      decision: 'approve',
    });
    expect(platformGovernanceService.listReleaseGates).toHaveBeenCalled();
    expect(platformGovernanceService.decideReleaseGate).toHaveBeenCalledWith('gate-1', {
      decision: 'reject',
    });
    expect(platformGovernanceService.listSafetyFindings).toHaveBeenCalled();
    expect(platformGovernanceService.reviewSafetyFinding).toHaveBeenCalledWith('finding-1', {
      decision: 'resolve',
    });
  });

  it('opens a release gate when a validation run is created', async () => {
    const { controller, platformGovernanceService } = buildController();

    await expect(
      controller.createValidationRun({
        runId: 'run-1',
        capabilityId: 'clinical-governance',
        changeType: 'prompt',
      }),
    ).resolves.toEqual(expect.objectContaining({ status: 'release_gate_opened' }));

    expect(platformGovernanceService.createReleaseGate).toHaveBeenCalledWith(
      expect.objectContaining({
        capabilityId: 'clinical-governance',
        changeType: 'prompt',
        validationRunId: 'run-1',
      }),
    );
  });

  it('records audit timeline views but returns the audit timeline contract', async () => {
    const { controller, platformGovernanceService, platformSystemsService } = buildController();

    await expect(controller.getAuditRunTimeline('run-1')).resolves.toEqual({
      runId: 'run-1',
      timeline: [],
    });

    expect(platformGovernanceService.recordObservabilityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        correlationId: 'run-1',
        eventType: 'audit.ai_run.timeline_viewed',
      }),
    );
    expect(platformSystemsService.getAuditRunTimeline).toHaveBeenCalledWith('run-1');
  });

  it('falls back to demo contracts when a durable privacy review item is not found', async () => {
    const { controller, platformSystemsService } = buildController({
      reviewPrivacyRequest: jest.fn().mockResolvedValue(null),
    });

    await expect(
      controller.reviewPrivacyRequest('missing', { decision: 'reject' }),
    ).resolves.toEqual(expect.objectContaining({ capabilityId: 'privacy-center', id: 'missing' }));

    expect(platformSystemsService.demo).toHaveBeenCalledWith(
      'privacy-center',
      'missing',
      expect.objectContaining({ decision: 'reject' }),
    );
  });

  describe('emergency patient/staff/rooms/ems/referrals — delegate to the shared EmergencyPatientService', () => {
    it('lists and fetches patients through the shared service, not a local array', () => {
      const { controller, emergencyPatientService } = buildController();

      expect(controller.getEmergencyPatients()).toEqual([
        { id: 'pt-001', firstName: 'Maya', lastName: 'Singh' },
      ]);
      expect(emergencyPatientService.listPatients).toHaveBeenCalled();

      expect(controller.getEmergencyPatient('pt-001')).toEqual({
        id: 'pt-001',
        firstName: 'Maya',
        lastName: 'Singh',
      });
      expect(() => controller.getEmergencyPatient('missing')).toThrow(
        'Emergency patient missing was not found',
      );
    });

    it('creates a patient via the shared service and requires a chief complaint', () => {
      const { controller, emergencyPatientService } = buildController();

      expect(() => controller.createEmergencyPatient({})).toThrow(
        'chiefComplaint or complaint is required',
      );

      const created = controller.createEmergencyPatient({ complaint: 'Fever' });
      expect(emergencyPatientService.createPatient).toHaveBeenCalledWith(
        expect.objectContaining({ chiefComplaint: 'Fever' }),
      );
      expect(created).toEqual(expect.objectContaining({ chiefComplaint: 'Fever' }));
    });

    it('patches a patient via the shared service and 404s when not found', () => {
      const { controller } = buildController();

      expect(controller.updateEmergencyPatient('pt-001', { priority: 'P1' })).toEqual(
        expect.objectContaining({ id: 'pt-001', priority: 'P1' }),
      );
      expect(() => controller.updateEmergencyPatient('missing', {})).toThrow(
        'Emergency patient missing was not found',
      );
    });

    it('lists staff and rooms through the shared service', () => {
      const { controller, emergencyPatientService } = buildController();

      expect(controller.getEmergencyStaff()).toEqual([{ id: 'staff-1', active: true }]);
      expect(emergencyPatientService.listStaff).toHaveBeenCalled();

      expect(controller.getEmergencyRooms()).toEqual([{ id: 'room-1', status: 'Available' }]);
      expect(emergencyPatientService.listRooms).toHaveBeenCalled();
    });

    it('derives the active shift from on-shift staff instead of a static fixture', () => {
      const { controller } = buildController();

      expect(controller.getEmergencyShift()).toEqual(
        expect.objectContaining({ status: 'Active', staffIds: ['staff-1'] }),
      );
    });

    it('delegates EMS state to the shared EMSIntakeService', () => {
      const { controller, emsIntakeService } = buildController();

      expect(controller.getEmergencyEms()).toEqual({ data: { arrivals: [], emsArrivals: [] } });
      expect(emsIntakeService.getEMSIntake).toHaveBeenCalled();
    });

    it('lists and creates referrals through the shared ReferralService, validating the patient exists', () => {
      const { controller, referralService } = buildController();

      expect(controller.getEmergencyReferrals()).toEqual({
        data: { referrals: [{ id: 'ref-1' }] },
      });
      expect(referralService.getReferrals).toHaveBeenCalled();

      expect(() => controller.createEmergencyReferral({ patientId: 'missing' })).toThrow(
        'Emergency patient missing was not found',
      );

      const created = controller.createEmergencyReferral({
        patientId: 'pt-001',
        targetDepartment: 'Cardiology',
      });
      expect(created).toEqual(expect.objectContaining({ id: 'ref-2', patientId: 'pt-001' }));
    });
  });
});
