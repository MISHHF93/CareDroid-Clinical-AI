import { Test } from '@nestjs/testing';
import { EmergencyOsController } from './emergency-os.controller';
import {
  FederatedLearningService,
  HybridDigitalTwinService,
  RealTimeSimulationService,
} from './emergency-os.advanced-services';
import {
  BoardingService,
  CapacityService,
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
  ReassessmentService,
  ReferralService,
  SmartIntakeService,
  WorkflowActionLogService,
} from './emergency-os.services';

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
        ReassessmentService,
        CapacityService,
        BoardingService,
        ReferralService,
        ProvincialHealthService,
        IntegrationHubService,
        EDCopilotService,
        EmergencyAnalyticsService,
        EmergencySettingsService,
        RealTimeSimulationService,
        FederatedLearningService,
        HybridDigitalTwinService,
      ],
    }).compile();

    controller = moduleRef.get(EmergencyOsController);
  });

  it('returns backend envelopes for all normalized Emergency OS modules', () => {
    const modules = [
      controller.getWhiteboard(),
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
      controller.getCopilot(),
      controller.getAnalytics(),
      controller.getSettings(),
      controller.getSimulationRecommendations(),
      controller.getFederatedDashboard(),
      controller.getDigitalTwinState(),
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

  it('exposes normalized workflow action logs for admin and patient timeline views', () => {
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
    controller.getCopilot();

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
    expect(controller.getPatientWorkflowLogs(created.data.patient.id).data.logs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'patient_created',
          patientId: created.data.patient.id,
        }),
      ]),
    );
  });

  it('returns and updates the cohesive Emergency OS settings contract', () => {
    const settings = controller.getSettings();

    expect(settings.data).toMatchObject({
      tenantName: expect.any(String),
      defaultWorkspace: expect.any(String),
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
});
