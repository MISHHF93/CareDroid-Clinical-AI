import { Test } from '@nestjs/testing';
import { AuthGuard } from '@nestjs/passport';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
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

describe('EmergencyOsController', () => {
  let controller: EmergencyOsController;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [EmergencyOsController],
      providers: [
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

  it('handles active Emergency Copilot query requests without optional Mongoose routes', async () => {
    const result = await controller.queryCopilot({
      query: 'Who waited longest?',
      user_role: 'charge-nurse',
    });

    expect(result).toMatchObject({
      module: 'ED Copilot Query',
      source: 'backend-fixture',
      data: {
        query: 'Who waited longest?',
        response: expect.stringContaining('waited'),
        safety_check_passed: true,
        safetyNotice: expect.stringContaining('not a replacement'),
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
    const handoffLogs = logs.data.logs.filter(
      (log) => log.metadata?.handoff === 'ems.handoff',
    );
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
});
