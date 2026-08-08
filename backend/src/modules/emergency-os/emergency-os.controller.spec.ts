import { Test } from '@nestjs/testing';
import { AuthGuard } from '@nestjs/passport';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { PERMISSIONS_KEY } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { EmergencyOsController } from './emergency-os.controller';
import {
  FederatedLearningService,
  HybridDigitalTwinService,
  RealTimeSimulationService,
} from './emergency-os.advanced-services';
import { EmergencyOsUpgradeHarnessService } from './emergency-os.upgrade-harness.service';
import {
  BoardingService,
  CareDroidCentralNodeService,
  CapacityService,
  CompleteImplementationReadinessService,
  EDCopilotService,
  EMSIntakeService,
  EmergencyAnalyticsService,
  EmergencyPatientService,
  EmergencySettingsService,
  EmergencyWhiteboardService,
  IntegrationHubService,
  PatientJourneyService,
  ProvincialHealthService,
  QueueIntelligenceService,
  ReceptionWorkspaceService,
  ReassessmentService,
  ReferralService,
  SmartIntakeService,
  WorkflowActionLogService,
} from './emergency-os.services';
import { OperationalIntelligenceService } from './emergency-os.operational-intelligence.service';
import { ClinicalDecisionSupportService } from './clinical-decision-support.service';
import { EmergencyPatientAuditService } from './emergency-patient-audit.service';
import { PatientOrchestrationService } from './emergency-os.orchestration.service';
import { PatientDocumentArtifactService } from './patient-document-artifact.service';
import { PatientFlowService } from './emergency-os.patient-flow.service';
import { WorkflowOrchestrationService } from './emergency-os.workflow-orchestration.service';
import { EmergencyOperatingSurfacesService } from './emergency-os.operating-surfaces.service';
import { EntitlementService } from '../platform-assets/entitlement.service';
import { OcrIntakeService } from './ocr-intake.service';
import { ChatService } from '../chat/chat.service';

describe('EmergencyOsController', () => {
  let controller: EmergencyOsController;
  let patientService: EmergencyPatientService;
  let chatService: { processMessage: jest.Mock };

  beforeEach(async () => {
    // ChatService itself has 20+ AI-orchestration dependencies (intent
    // classifier, MoE router, RAG, memory services, etc.) that are irrelevant
    // to this controller's own behavior (context assembly + response
    // shaping). Mocked here, matching how ChatController's own tests mock it
    // (rbac.spec.ts) -- ChatService.handleEdCopilotCommand()'s real
    // deterministic-dispatch and safety-floor logic is covered directly in
    // chat.service.spec.ts instead.
    chatService = { processMessage: jest.fn() };
    const moduleRef = await Test.createTestingModule({
      controllers: [EmergencyOsController],
      providers: [
        { provide: ChatService, useValue: chatService },
        EmergencyWhiteboardService,
        WorkflowActionLogService,
        EmergencyPatientService,
        PatientJourneyService,
        EMSIntakeService,
        SmartIntakeService,
        QueueIntelligenceService,
        ReceptionWorkspaceService,
        ReassessmentService,
        CapacityService,
        BoardingService,
        CareDroidCentralNodeService,
        OperationalIntelligenceService,
        ReferralService,
        ProvincialHealthService,
        IntegrationHubService,
        EDCopilotService,
        EmergencyAnalyticsService,
        EmergencySettingsService,
        CompleteImplementationReadinessService,
        RealTimeSimulationService,
        FederatedLearningService,
        HybridDigitalTwinService,
        EmergencyOsUpgradeHarnessService,
        ClinicalDecisionSupportService,
        EmergencyPatientAuditService,
        PatientFlowService,
        WorkflowOrchestrationService,
        EmergencyOperatingSurfacesService,
        OcrIntakeService,
        {
          provide: EntitlementService,
          useValue: {
            assertLaunchAllowed: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: PatientOrchestrationService,
          useValue: {
            buildPatientOrchestration: jest.fn(),
            buildTriageAssist: jest.fn(),
          },
        },
        {
          provide: PatientDocumentArtifactService,
          useValue: {
            getEnvelope: jest.fn(() => ({
              module: 'Patient Document Artifacts',
              generatedAt: new Date().toISOString(),
              source: 'backend-fixture',
              status: 'active',
              data: { artifacts: [] },
            })),
            extract: jest.fn(),
            review: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useValue({ canActivate: () => true })
      .overrideGuard(AuthorizationGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = moduleRef.get(EmergencyOsController);
    patientService = moduleRef.get(EmergencyPatientService);
  });

  it('returns backend envelopes for all normalized CareDroid modules', async () => {
    const modules = [
      controller.getWhiteboard(),
      controller.getCentralNodeSnapshot(),
      controller.getOperationalIntelligenceSnapshot(),
      controller.getOperationalIntelligenceModelHealth(),
      controller.getOperationalIntelligenceAlerts(),
      controller.getPatients(),
      controller.getJourney(),
      controller.getEMS(),
      controller.getIntake(),
      controller.getQueues(),
      controller.getReassessment(),
      controller.getCapacity(),
      controller.getBoarding(),
      controller.getReferrals(),
      controller.getProvincialHealth(),
      controller.getIntegrations(),
      await controller.getCopilot(),
      controller.getAnalytics(),
      controller.getSettings(),
      controller.getImplementationReadiness(),
      controller.getSimulationRecommendations(),
      controller.getFederatedDashboard(),
      controller.getDigitalTwinState(),
      controller.getUpgradeHarness(),
      controller.getUpgradeHarnessCapacity(),
      controller.getUpgradeHarnessPatientFlow(),
      controller.getUpgradeHarnessClinicalIntelligence(),
      controller.getUpgradeHarnessAuditSummary(),
    ];

    for (const envelope of modules) {
      expect(envelope).toMatchObject({
        generatedAt: expect.any(String),
        source: 'backend-fixture',
        data: expect.any(Object),
      });
    }
  });

  it('persists a Smart Intake patient into dependent module data', () => {
    const created = controller.createIntakePatient({
      mrn: 'ED-TEST-1',
      firstName: 'Test',
      lastName: 'Patient',
      chiefComplaint: 'Focused test intake',
      complaintCategory: 'Other',
    });

    expect(created.data.patient.mrn).toBe('ED-TEST-1');
    expect(
      controller.getPatients().data.patients.some((patient) => patient.mrn === 'ED-TEST-1'),
    ).toBe(true);
    expect(controller.getAnalytics().data.activeCensus).toBeGreaterThan(0);
  });

  it('persists referrals through the CareDroid referral surface', () => {
    const createdPatient = controller.createIntakePatient({
      mrn: 'ED-REF-1',
      firstName: 'Referral',
      lastName: 'Patient',
      chiefComplaint: 'Referral workflow validation',
      complaintCategory: 'Cardiac',
    });
    const createdReferral = controller.createReferral({
      patientId: createdPatient.data.patient.id,
      targetDepartment: 'Cardiology',
      urgency: 'Urgent',
      reason: 'Cardiology review requested.',
      clinicalSummary: 'Referral workflow validation patient requires review.',
      status: 'Sent',
    });

    expect(createdReferral).toMatchObject({
      module: 'Referral Created',
      data: {
        referral: expect.objectContaining({
          patientId: createdPatient.data.patient.id,
          targetDepartment: 'Cardiology',
          status: 'Sent',
        }),
      },
    });
    expect(controller.getReferrals().data.referrals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          patientId: createdPatient.data.patient.id,
          targetDepartment: 'Cardiology',
        }),
      ]),
    );
  });

  it('updates a created referral/transfer status via PATCH transfers/:id/status (ReferralPanel.tsx real caller)', () => {
    const createdPatient = controller.createIntakePatient({
      mrn: 'ED-REF-2',
      firstName: 'Transfer',
      lastName: 'Patient',
      chiefComplaint: 'Transfer workflow validation',
      complaintCategory: 'Cardiac',
    });
    const createdReferral = controller.createReferral({
      patientId: createdPatient.data.patient.id,
      targetDepartment: 'Cardiology',
      workflow: 'Transfer',
      status: 'Sent',
    });
    const referralId = (createdReferral.data.referral as { id: string }).id;

    const updated = controller.updateTransferStatus(referralId, { status: 'TransferRequested' });

    expect(updated).toMatchObject({
      module: 'Referral Status Updated',
      data: {
        referral: expect.objectContaining({ id: referralId, status: 'TransferRequested' }),
      },
    });
    expect(controller.getReferrals().data.referrals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: referralId, status: 'TransferRequested' }),
      ]),
    );
  });

  it('rejects a status update for a referral id that does not exist', () => {
    expect(() =>
      controller.updateTransferStatus('ref-does-not-exist', { status: 'PatientDeparted' }),
    ).toThrow('Referral ref-does-not-exist not found');
  });

  it('exposes normalized workflow action logs for admin and patient timeline views', async () => {
    const created = controller.createIntakePatient({
      id: 'workflow-log-patient-1',
      mrn: 'ED-WF-1',
      firstName: 'Workflow',
      lastName: 'Patient',
      chiefComplaint: 'Workflow logging validation',
      complaintCategory: 'Other',
    });
    controller.getProvincialHealth();
    controller.getIntegrations();
    await controller.getCopilot();

    const logs = controller.getWorkflowLogs().data.logs;
    expect(logs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'patient_created',
          patientId: created.data.patient.id,
          title: 'Patient created',
          timestamp: expect.any(String),
          source: expect.any(String),
          severity: expect.any(String),
          status: expect.any(String),
          metadata: expect.any(Object),
        }),
        expect.objectContaining({ type: 'provincial_data_viewed' }),
        expect.objectContaining({ type: 'integration_event_received' }),
        expect.objectContaining({ type: 'copilot_used' }),
      ]),
    );
    const patientLogs = await controller.getPatientWorkflowLogs(
      created.data.patient.id,
      undefined,
      {} as any,
    );
    expect(patientLogs.data.logs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'patient_created',
          patientId: created.data.patient.id,
        }),
      ]),
    );
  });

  it('returns and updates the cohesive CareDroid settings contract', () => {
    const settings = controller.getSettings();

    expect(settings.data).toMatchObject({
      tenantName: expect.any(String),
      defaultWorkspace: expect.any(String),
      defaultScreenMode: 'CHARGE_NURSE_SCREEN',
      enabledScreenModes: expect.arrayContaining([
        'WAITING_ROOM_DISPLAY',
        'COMMAND_CENTER_DISPLAY',
      ]),
      readOnlyDisplayMode: expect.any(Boolean),
      commandCenterMode: expect.any(Boolean),
      wallDisplayRefreshInterval: expect.any(Number),
      enabledModules: expect.arrayContaining([
        expect.objectContaining({ id: 'reassessment', enabled: true }),
      ]),
      aiSettings: expect.any(Object),
      integrationSettings: expect.any(Object),
      provincialHealthSettings: expect.any(Object),
      notificationSettings: expect.any(Object),
      reassessmentThresholds: expect.any(Object),
      capacityThresholds: expect.any(Object),
      emsThresholds: expect.any(Object),
      boardingThresholds: expect.any(Object),
    });

    const updated = controller.updateSettings({
      tenantName: 'North Command ED',
      capacityThresholds: { departmentCapacityTarget: 42, warningPercent: 76 },
      reassessmentThresholds: { P2: 25 },
      emsThresholds: { offloadTargetMinutes: 12 },
    });

    expect(updated.data).toMatchObject({
      tenantName: 'North Command ED',
      departmentCapacityTarget: 42,
      capacityThresholds: expect.objectContaining({
        departmentCapacityTarget: 42,
        warningPercent: 76,
      }),
      thresholds: expect.objectContaining({
        capacityWarningPercent: 76,
        emsOffloadTargetMinutes: 12,
        reassessmentIntervals: expect.objectContaining({ P2: 25 }),
      }),
    });
    expect(controller.getSettings().data.tenantName).toBe('North Command ED');
  });

  it('exposes a central node operational snapshot across CareDroid modules', () => {
    const snapshot = controller.getCentralNodeSnapshot();

    expect(snapshot).toMatchObject({
      module: 'CareDroid Central Node',
      status: 'active',
      data: {
        node: 'CareDroidCentralNode',
        patientsToday: expect.any(Number),
        activePatients: expect.any(Number),
        waitingPatients: expect.any(Number),
        longestWait: expect.any(Number),
        averageWait: expect.any(Number),
        emsInbound: expect.any(Number),
        emsPressure: expect.stringMatching(/normal|watch|strained|critical/),
        reassessmentsDue: expect.any(Number),
        capacityStatus: expect.any(Object),
        boarders: expect.any(Number),
        boardingRisk: expect.stringMatching(/normal|watch|strained|critical/),
        referralsPending: expect.any(Number),
        operationalAlerts: expect.any(Array),
        whiteboardColumns: expect.any(Array),
        queueMetrics: expect.any(Array),
        recentEvents: expect.any(Array),
        tenantSettings: expect.any(Object),
        enabledModules: expect.any(Array),
      },
    });
    expect(snapshot.data.whiteboardColumns.map((column) => column.id)).toEqual(
      expect.arrayContaining(['Waiting', 'Reassessment', 'EMS']),
    );
  });

  // Converged 2026-08-08: queryCopilot() now delegates to ChatService.processMessage()
  // (the canonical orchestration pipeline) instead of the removed
  // EDCopilotService.processQuery() keyword matcher. ChatService is mocked
  // here (see beforeEach) since its own 20+ AI-orchestration dependencies
  // are irrelevant to what this controller is responsible for: assembling
  // real ED operational context (patients, capacity, reassessment,
  // patient-safety context) and shaping the response envelope. The
  // deterministic dispatcher and priority-change safety-floor logic that
  // context feeds into is covered directly, end-to-end, in
  // chat.service.spec.ts.
  it('assembles real ED operational context and delegates Emergency Copilot queries to ChatService.processMessage()', async () => {
    controller.createIntakePatient({
      mrn: 'ED-COPILOT-CTX',
      firstName: 'Context',
      lastName: 'Patient',
      chiefComplaint: 'Copilot context validation',
      complaintCategory: 'Other',
    });
    chatService.processMessage.mockResolvedValue({
      text: '**Longest waiting patients**\n\n1. Context Patient - 0 min\n\n_Surface for human review before any clinical or operational action._',
      metadata: {
        safety: { requiresHumanReview: true },
        edCopilot: { command: 'longest_waiting' },
        // Canonical AI Core Node contract (lib/ai/provenanceContract.ts).
        provenance: {
          contractVersion: '1.1.0',
          responseSource: 'DETERMINISTIC_RULE',
          modelOrEngine: 'ed-copilot-deterministic-commands',
          requiresClinicianReview: true,
        },
      },
    });

    const result = await controller.queryCopilot({
      query: 'Who waited longest?',
      user_role: 'charge-nurse',
    });

    expect(chatService.processMessage).toHaveBeenCalledWith(
      'Who waited longest?',
      undefined,
      'ed-copilot',
      undefined,
      undefined,
      'charge-nurse',
      undefined,
      expect.objectContaining({
        edCopilot: expect.objectContaining({
          enabled: true,
          patients: expect.arrayContaining([expect.objectContaining({ name: 'Context Patient' })]),
          capacitySnapshot: expect.objectContaining({ score: expect.any(Number) }),
        }),
      }),
    );
    expect(result).toMatchObject({
      module: 'ED Copilot Query',
      source: 'chat-service',
      data: {
        query: 'Who waited longest?',
        response: expect.stringContaining('waiting'),
        requires_review: true,
        safetyNotice: expect.stringContaining('not a replacement'),
        provenance: expect.objectContaining({ responseSource: 'DETERMINISTIC_RULE' }),
      },
    });
    expect(controller.getWorkflowLogs().data.logs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'copilot_used',
          source: 'ed-copilot-query',
        }),
      ]),
    );
  });

  it('resolves the patient a copilot "move patient" query names into real patientArtifactContext for the priority-change safety floor', async () => {
    const created = controller.createIntakePatient({
      mrn: 'ED-COPILOT-FLOOR',
      firstName: 'Copilot',
      lastName: 'Floor',
      chiefComplaint: 'Copilot safety floor validation',
      complaintCategory: 'Other',
    });
    const patientId = created.data.patient.id;
    patientService.updatePatient(patientId, { priority: 'P1' });
    chatService.processMessage.mockResolvedValue({
      text: 'Priority change blocked by safety floor: DPS1/DPS2 patients cannot be de-escalated. No autonomous change was made.',
      metadata: {
        safety: { requiresHumanReview: true },
        edCopilot: { command: 'priority_change_safety_check', safetyCheckPassed: false },
        provenance: { contractVersion: '1.1.0', responseSource: 'DETERMINISTIC_RULE' },
      },
    });

    const result = await controller.queryCopilot({
      query: `Move patient ${patientId} to priority 5`,
      user_role: 'charge_nurse',
    });

    expect(chatService.processMessage).toHaveBeenCalledWith(
      expect.any(String),
      undefined,
      'ed-copilot',
      undefined,
      undefined,
      'charge_nurse',
      undefined,
      expect.objectContaining({
        edCopilot: expect.objectContaining({
          selectedPatientId: patientId,
          patientArtifactContext: expect.objectContaining({
            patientId,
            priority: 'P1',
          }),
        }),
      }),
    );
    expect(result).toMatchObject({
      data: {
        response: expect.stringMatching(/blocked by safety floor/i),
        requires_review: true,
        safety_check_passed: false,
      },
    });
  });

  it('copilot "move patient" query allows a priority escalation, pending human review', async () => {
    const created = controller.createIntakePatient({
      mrn: 'ED-COPILOT-ESCALATE',
      firstName: 'Copilot',
      lastName: 'Escalate',
      chiefComplaint: 'Copilot escalation validation',
      complaintCategory: 'Other',
    });
    const patientId = created.data.patient.id;
    patientService.updatePatient(patientId, { priority: 'P3' });
    chatService.processMessage.mockResolvedValue({
      text: 'Safety check passed for changing Copilot Escalate to DPS 2. Human review is required before applying.',
      metadata: {
        safety: { requiresHumanReview: true },
        edCopilot: { command: 'priority_change_safety_check', safetyCheckPassed: true },
        provenance: { contractVersion: '1.1.0', responseSource: 'DETERMINISTIC_RULE' },
      },
    });

    const result = await controller.queryCopilot({
      query: `Move patient ${patientId} to priority 2`,
      user_role: 'charge_nurse',
    });

    expect(result).toMatchObject({
      data: {
        response: expect.stringMatching(/safety check passed/i),
        requires_review: true,
        safety_check_passed: true,
      },
    });
  });

  it('records clinical calculator results and copilot interactions', () => {
    const calc = controller.recordClinicalCalculatorResult({
      calculatorId: 'qsofa',
      patientId: 'p1',
      inputs: { respiratoryRate: 24 },
      score: 2,
      riskCategory: 'qSOFA-positive (≥2)',
      interpretation: 'Higher risk context',
      disclaimer: 'Clinical decision support only.',
      referenceLine: 'Sepsis-3',
    });
    expect(calc.data.calculatorId).toBe('qsofa');

    const copilot = controller.recordCopilotInteraction({
      question: 'Summarize reassessment needs',
      patientId: 'p1',
      draftGuidance: 'Review vitals and reassessment queue.',
      requiresHumanReview: true,
    });
    expect(copilot.data.requiresHumanReview).toBe(true);
    expect(copilot.data.safetyDisclaimer).toMatch(/clinician review/i);

    const listed = controller.listClinicalCalculatorResults('p1');
    expect(listed.data.count).toBeGreaterThan(0);
  });

  it('classifies the complete implementation prompt against the active CareDroid spine', () => {
    const readiness = controller.getImplementationReadiness();

    expect(readiness).toMatchObject({
      module: 'Complete Implementation Prompt Reconciliation',
      status: 'placeholder',
      data: {
        activeSpine: {
          frontendRoot: 'src/',
          appShell: 'src/components/AppShell.tsx',
          apiBase: '/api/emergency',
          pilotRouteCount: 12,
        },
        clinicalSafetyNotice: expect.stringContaining('not clinical validation'),
      },
    });
    expect(readiness.data.summary.SAFE_TO_IMPLEMENT_NOW).toBeGreaterThan(0);
    expect(readiness.data.summary.CONFLICTS_WITH_ACTIVE_SPINE).toBeGreaterThan(0);
    expect(readiness.data.summary.REQUIRES_MANUAL_APPROVAL).toBeGreaterThan(0);
    expect(readiness.data.summary.DEMO_FACADE_ONLY).toBeGreaterThan(0);
    expect(readiness.data.requirements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'new-frontend-src-shell',
          classification: 'CONFLICTS_WITH_ACTIVE_SPINE',
          approvalsRequired: expect.arrayContaining([
            expect.stringContaining('Architecture owner approval'),
          ]),
        }),
        expect.objectContaining({
          id: 'api-v1-surface',
          classification: 'CONFLICTS_WITH_ACTIVE_SPINE',
        }),
        expect.objectContaining({
          id: 'ai-governance-ml',
          classification: 'DEMO_FACADE_ONLY',
        }),
      ]),
    );
  });

  it('runs the Smart Intake vertical slice through whiteboard, queues, reassessment, and capacity', () => {
    const result = controller.createSmartIntakeVerticalSlice({
      id: 'slice-patient-001',
      mrn: 'ED-SLICE-001',
      firstName: 'Slice',
      lastName: 'Patient',
      chiefComplaint: 'Chest pressure with abnormal heart rate',
      complaintCategory: 'Cardiac',
      priority: 'P2',
      vitals: [
        {
          hr: 128,
          sbp: 148,
          dbp: 92,
          spo2: 96,
          temp: 36.8,
          rr: 18,
          gcs: 15,
          pain: 7,
          recordedAt: new Date().toISOString(),
          recordedBy: 'test',
        },
      ],
    });

    expect(result.data.patient).toMatchObject({
      id: 'slice-patient-001',
      state: 'Triage',
      flags: expect.arrayContaining(['HighRisk', 'ReassessmentDue']),
    });
    expect(result.data.encounter).toMatchObject({
      patientId: 'slice-patient-001',
      source: 'smart-intake',
      status: 'active',
    });
    expect(result.data.validation).toMatchObject({
      patientCreated: true,
      encounterCreated: true,
      movedToArrival: true,
      movedToTriage: true,
      visibleOnWhiteboard: true,
      visibleInQueueMetrics: true,
      reassessmentTriggered: true,
      visibleInReassessment: true,
      capacityUpdated: true,
    });
    expect(
      result.data.queueMetrics.queues
        .find((queue) => queue.label === 'Triage')
        ?.patients.some((patient) => patient.id === 'slice-patient-001'),
    ).toBe(true);
    expect(result.data.capacity.capacity.reassessmentDue).toBeGreaterThan(0);
  });

  it('evaluates deterministic real-time simulation interventions', () => {
    const live = controller.updateLiveSimulation({
      census: 54,
      waitingPatients: 18,
      boardingCount: 8,
      staffedBeds: 36,
      physicians: 4,
      nurses: 12,
    });
    const evaluation = controller.evaluateSimulation({ type: 'open_fast_track', intensity: 1 });
    const comparison = controller.compareSimulation({});

    expect(live.data.currentStatus.resourceUtilization).toBeGreaterThan(0);
    expect(evaluation.data.evaluation.fourHourForecast).toHaveLength(5);
    expect(evaluation.data.evaluation.expectedImprovement.waitMinutes).toBeGreaterThanOrEqual(0);
    expect(comparison.data.rankedInterventions[0].recoveryTimeMinutes).toBeLessThanOrEqual(
      comparison.data.rankedInterventions[comparison.data.rankedInterventions.length - 1]
        .recoveryTimeMinutes,
    );
  });

  it('registers hospitals and performs weighted FedAvg aggregation', () => {
    controller.registerFederatedHospital({
      hospitalId: 'ed-a',
      name: 'ED A',
      sampleCapacity: 1000,
    });
    controller.updateFederatedModel({
      hospitalId: 'ed-a',
      sampleCount: 100,
      weights: { intercept: 0.1, waitingPatients: 0.2 },
      metrics: { auc: 0.8, calibration: 0.9, sensitivity: 0.7, specificity: 0.75 },
    });
    controller.updateFederatedModel({
      hospitalId: 'ed-b',
      sampleCount: 300,
      weights: { intercept: 0.3, waitingPatients: 0.4 },
      metrics: { auc: 0.84, calibration: 0.92, sensitivity: 0.74, specificity: 0.79 },
    });

    const aggregate = controller.aggregateFederatedRound();
    const model = controller.getFederatedGlobalModel('ed-a');

    expect(aggregate.data.aggregated).toBe(true);
    expect(aggregate.data.globalModel.weights.intercept).toBe(0.25);
    expect(model.data.authorized).toBe(true);
    expect(controller.getFederatedDashboard().data.currentRound).toBe(1);
  });

  it('initializes and simulates a hybrid DES-ABM digital twin', () => {
    const initialized = controller.initializeDigitalTwin({ twinId: 'test-twin', census: 50 });
    const simulated = controller.simulateDigitalTwin({ horizonMinutes: 120, includeTrace: true });
    const scenario = controller.evaluateDigitalTwinScenario({
      interventions: [{ type: 'increase_staff', intensity: 1 }],
      includeTrace: true,
    });

    expect(initialized.data.twin.twinId).toBe('test-twin');
    expect(simulated.data.metrics.throughput).toBeGreaterThan(0);
    expect(simulated.data.eventTrace.length).toBeGreaterThan(0);
    expect(scenario.data.scenario.metrics.confidenceIntervals.averageWaitMinutes).toHaveLength(2);
  });

  it('exposes the Advanced CareDroid upgrade harness with safety and audit metadata', () => {
    const harness = controller.getUpgradeHarness();

    expect(harness).toMatchObject({
      module: 'Advanced CareDroid Upgrade Harness',
      status: 'placeholder',
      data: {
        harnessId: 'advanced-emergency-os-upgrade-harness',
        mode: 'deterministic-pilot-harness',
        apiBase: '/api/emergency',
        blockedAutonomousActions: expect.arrayContaining([
          'autonomous diagnosis',
          'autonomous prescribing',
          'autonomous disposition',
          'autonomous patient matching',
        ]),
        pilotReadiness: expect.objectContaining({
          totalCapabilities: 10,
          reviewRequired: 10,
          externalDependenciesConnected: false,
          canonicalEndpoints: expect.arrayContaining(['/api/emergency/upgrade-harness']),
        }),
      },
    });

    const allSignals = [
      ...harness.data.capacityAndForecasting,
      ...harness.data.patientFlow,
      ...harness.data.clinicalDecisionSupport,
      ...harness.data.governance,
    ];

    expect(allSignals.map((signal) => signal.capability)).toEqual(
      expect.arrayContaining([
        'real_time_simulation_adaptive_policy',
        'brag_forecast_10h',
        'multimodal_cdss',
        'modular_mixed_pathology_units',
        'virtual_visit_track',
        'nurse_led_split_flow',
        'wearable_iomt_processing',
        'federated_learning_harness',
        'telephone_triage_diversion',
        'immutable_audit_abstraction',
      ]),
    );
    for (const signal of allSignals) {
      expect(signal).toMatchObject({
        confidence: expect.any(Number),
        provenance: expect.objectContaining({
          generatedBy: 'EmergencyOsUpgradeHarnessService',
          provider: expect.any(String),
          sourceSystems: expect.any(Array),
          limitations: expect.any(Array),
        }),
        safety: expect.objectContaining({
          status: 'review_required',
          humanReviewMessage: expect.stringContaining('cannot trigger diagnosis'),
          autonomousActionsBlocked: expect.arrayContaining(['autonomous disposition']),
        }),
        audit: expect.objectContaining({
          eventId: expect.any(String),
          immutableLedgerHash: expect.stringMatching(/^[a-f0-9]{64}$/),
          reviewRequired: true,
        }),
      });
    }
  });

  it('persists EMS handoff completion as a workflow audit record', () => {
    const created = controller.createIntakePatient({
      mrn: 'ED-EMS-HANDOFF-1',
      firstName: 'EMS',
      lastName: 'Handoff',
      chiefComplaint: 'EMS pre-arrival: chest pain',
      complaintCategory: 'Cardiac',
      flags: ['EMSArrival'],
    });
    const patientId = created.data.patient.id;
    const result = controller.postEmsHandoff({
      arrivalId: 'ems-arrival-test-1',
      patientId,
      actorName: 'Charge Nurse',
      unitId: 'Unit-7',
      unitName: 'Medic 7',
      chiefComplaint: 'Chest pain',
      handoffAcceptedAt: '2026-07-15T12:00:00.000Z',
      checklist: { handoffAccepted: true },
    });

    expect(result).toMatchObject({
      module: 'EMS Handoff',
      data: {
        ok: true,
        arrivalId: 'ems-arrival-test-1',
        patientId,
        status: 'Complete',
        handoffCompletedAt: '2026-07-15T12:00:00.000Z',
        workflowLogId: expect.any(String),
      },
    });

    const logs = controller.getWorkflowLogs();
    const handoffLogs = logs.data.logs.filter((log) => log.metadata?.handoff === 'ems.handoff');
    expect(handoffLogs.length).toBeGreaterThanOrEqual(1);
    expect(handoffLogs[0]).toMatchObject({
      patientId,
      source: 'ems-pipeline',
    });
  });

  it('rejects EMS handoff without arrivalId', () => {
    const result = controller.postEmsHandoff({ patientId: 'p-1' });
    expect(result).toMatchObject({
      module: 'EMS Handoff',
      data: { ok: false, error: 'arrivalId is required' },
    });
  });

  it('filters patient-flow and clinical intelligence harness endpoints by patient id', () => {
    const created = controller.createIntakePatient({
      id: 'upgrade-harness-patient-1',
      mrn: 'ED-UPGRADE-1',
      firstName: 'Upgrade',
      lastName: 'Harness',
      priority: 'P2',
      chiefComplaint: 'Chest pressure with abnormal heart rate',
      complaintCategory: 'Cardiac',
      flags: ['HighRisk'],
    });

    const patientFlow = controller.getUpgradeHarnessPatientFlowForPatient(created.data.patient.id);
    const clinical = controller.getUpgradeHarnessClinicalIntelligenceForPatient(
      created.data.patient.id,
    );

    expect(patientFlow.data.patientId).toBe(created.data.patient.id);
    expect(
      patientFlow.data.signals.find(
        (signal) => signal.capability === 'modular_mixed_pathology_units',
      )?.data.selectedPatientIds,
    ).toContain(created.data.patient.id);
    expect(clinical.data.patientId).toBe(created.data.patient.id);
    expect(
      clinical.data.signals.find((signal) => signal.capability === 'multimodal_cdss')?.data
        .reviewQueue,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          patientId: created.data.patient.id,
          blockedClinicalClaims: expect.stringContaining('No diagnosis'),
        }),
      ]),
    );
  });

  // extract/review were reachable by any authenticated user with no
  // permission check at all and skipped the HIPAA patient-access audit
  // trail their own sibling GET route performs on the same resource — the
  // same "PHI-writing route open" bug class already fixed once in
  // ArtifactsController (see artifacts.controller.spec.ts). Locks in that
  // both now require WRITE_PHI, matching the module's ems/handoff and
  // reception/handoff mutation routes.
  const documentArtifactWriteRoutes: Array<keyof EmergencyOsController> = [
    'extractPatientDocumentArtifacts',
    'reviewPatientDocumentArtifact',
  ];

  it.each(documentArtifactWriteRoutes)('%s requires WRITE_PHI permission', (method) => {
    const permissions = Reflect.getMetadata(
      PERMISSIONS_KEY,
      EmergencyOsController.prototype[method],
    );
    expect(permissions).toEqual([Permission.WRITE_PHI]);
  });

  it('logs a HIPAA patient-access audit entry when extracting document artifacts', async () => {
    const auditSpy = jest.spyOn(EmergencyPatientAuditService.prototype, 'logPatientAccess');

    await controller.extractPatientDocumentArtifacts(
      'patient-doc-artifact-1',
      { rawText: 'Chief complaint: chest pain' } as any,
      undefined,
      {} as any,
    );

    expect(auditSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        patientId: 'patient-doc-artifact-1',
        resource: 'emergency/patients/patient-doc-artifact-1/document-artifacts/extract',
      }),
    );
    auditSpy.mockRestore();
  });

  it('logs a HIPAA patient-access audit entry when reviewing a document artifact', async () => {
    const auditSpy = jest.spyOn(EmergencyPatientAuditService.prototype, 'logPatientAccess');

    await controller.reviewPatientDocumentArtifact(
      'patient-doc-artifact-1',
      'artifact-1',
      { reviewStatus: 'accepted', reviewer: 'nurse-1' } as any,
      undefined,
      {} as any,
    );

    expect(auditSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        patientId: 'patient-doc-artifact-1',
        resource: 'emergency/patients/patient-doc-artifact-1/document-artifacts/artifact-1/review',
      }),
    );
    auditSpy.mockRestore();
  });
});
