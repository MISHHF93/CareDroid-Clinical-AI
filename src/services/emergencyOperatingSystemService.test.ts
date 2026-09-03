import { describe, expect, it } from 'vitest';
import EmergencyOperatingSystemService, {
  getEmergencyOperatingSystem,
} from './emergencyOperatingSystemService';

describe('EmergencyOperatingSystemService', () => {
  it('unifies CareDroid into one operating system payload', () => {
    const operatingSystem = getEmergencyOperatingSystem();

    expect(operatingSystem).toEqual(
      expect.objectContaining({
        serviceId: 'emergency-department-operating-system',
        title: 'Emergency Department Operating System',
        route: '/workspace/emergency',
        status: 'standalone-saas-ready',
        responsibilities: [
          'patient flow',
          'intake flow',
          'queue flow',
          'referral flow',
          'EMS flow',
          'capacity flow',
          'discharge flow',
        ],
      }),
    );
  });

  it('contains all required Emergency operating layers', () => {
    const operatingSystem = EmergencyOperatingSystemService.getOperatingSystem();

    expect(operatingSystem.patientFlow.engine.metrics.totalStates).toBe(12);
    expect(operatingSystem.patientFlow.engine.metrics.automationCount).toBe(22);
    expect(operatingSystem.smartArrival).toEqual(
      expect.objectContaining({
        title: 'Smart Arrival',
        generatedSnapshot: expect.objectContaining({
          status: 'finalized',
          contains: expect.arrayContaining(['demographics', 'arrival complaint']),
        }),
        confirmationGate: expect.objectContaining({
          requiredBeforeFinalizing: true,
          acceptedConfirmationActors: expect.arrayContaining(['patient', 'staff']),
        }),
        emergencyWorkspaceFeed: expect.objectContaining({
          separateIntakeAppCreated: false,
        }),
      }),
    );
    expect(
      operatingSystem.patientFlow.journey.find((stage) => stage.id === 'registration'),
    ).toEqual(
      expect.objectContaining({
        automations: expect.arrayContaining([
          expect.objectContaining({
            automationId: 'emergency-intake-smart-intake',
            title: 'Smart Intake',
            humanReviewRequired: true,
          }),
        ]),
      }),
    );
    expect(operatingSystem.queueFlow.metrics.queueCount).toBe(9);
    expect(operatingSystem.throughput.kpi.metricId).toBe('doorToDoctor');
    expect(operatingSystem.waitingRoom.riskState).toMatch(/Normal|Busy|Critical/);
    expect(operatingSystem.reassessment.queue.label).toBe('Reassessment Queue');
    expect(operatingSystem.reassessment.alerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Needs Reassessment',
          generatedFrom: 'Reassessment Intelligence',
        }),
      ]),
    );
    expect(operatingSystem.referralFlow.departments).toEqual(
      expect.arrayContaining([
        'Cardiology',
        'Neurology',
        'Psychiatry',
        'Internal Medicine',
        'Surgery',
        'ICU',
      ]),
    );
    expect(operatingSystem.emsFlow.metrics.incomingCount).toBeGreaterThan(0);
    expect(operatingSystem.emsOffload.metrics.waitingHandoffs).toBeGreaterThan(0);
    expect(operatingSystem.capacityFlow.score).toEqual(expect.any(Number));
    expect(operatingSystem.boardingFlow.metrics.boardingCount).toBeGreaterThan(0);
    expect(operatingSystem.resourceBoard.resources.map((resource) => resource.label)).toEqual(
      expect.arrayContaining([
        'Rooms',
        'Stretchers',
        'Monitors',
        'Telemetry Units',
        'Infusion Pumps',
      ]),
    );
    expect(operatingSystem.escalationEngine.metrics.activeEscalations).toBeGreaterThan(0);
    expect(operatingSystem.kpiLayer.metricById).toEqual(
      expect.objectContaining({
        doorToDoctor: expect.objectContaining({ label: 'Door-to-Doctor' }),
        boardingTime: expect.objectContaining({ label: 'Boarding Time' }),
      }),
    );
    expect(operatingSystem.simulationScenarios.scenarios).toHaveLength(5);
    expect(operatingSystem.demoEnvironment.metrics.patientCount).toBeGreaterThanOrEqual(100);
    expect(operatingSystem.digitalWhiteboard.summary.totalActivePatients).toBeGreaterThan(0);
    expect(operatingSystem.emsFlow).toEqual(
      expect.objectContaining({
        pipelineId: 'ems-handoff-pipeline',
        statuses: ['Incoming', 'En Route', 'Arriving', 'Arrived'],
        edHandoffSummaries: expect.arrayContaining([
          expect.objectContaining({
            title: 'ED Handoff Summary',
            attachedToPatientJourney: true,
          }),
        ]),
      }),
    );
    expect(operatingSystem.digitalWhiteboard.cards).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          patientId: 'DEMO-ED-1001',
          needsReassessment: true,
          alerts: expect.arrayContaining(['Needs Reassessment']),
        }),
        expect.objectContaining({
          patientId: expect.stringMatching(/^EMS-/),
          handoffStatus: expect.stringMatching(/Incoming|En Route|Arriving|Arrived/),
          edHandoffSummary: expect.objectContaining({ title: 'ED Handoff Summary' }),
        }),
      ]),
    );
    expect(operatingSystem.flowEngine).toEqual(
      expect.objectContaining({
        engineId: 'emergency-flow-engine',
        nextRecommendedActions: expect.arrayContaining([
          expect.objectContaining({
            action: expect.any(String),
            reason: expect.any(String),
          }),
        ]),
        metrics: expect.objectContaining({
          activeDetections: expect.any(Number),
        }),
      }),
    );
    expect(operatingSystem.patientPath).toEqual(
      expect.objectContaining({
        route: '/workspace/emergency/patient-path',
        metrics: expect.objectContaining({
          doorToDirectionMinutes: expect.any(Number),
          targetCompliance: expect.any(Number),
        }),
        milestones: expect.arrayContaining([
          expect.objectContaining({ label: 'Arrival Signal' }),
          expect.objectContaining({ label: 'Throughput Measured' }),
        ]),
        patients: expect.arrayContaining([
          expect.objectContaining({
            patientId: expect.stringMatching(/^EMS-/),
            edHandoffSummary: expect.objectContaining({ title: 'ED Handoff Summary' }),
          }),
        ]),
      }),
    );
    expect(operatingSystem.digitalWhiteboard.columns.map((column) => column.label)).toEqual([
      'EMS Incoming',
      'Waiting',
      'Triage',
      'In Assessment',
      'Orders Pending',
      'Results Pending',
      'Reassessment Due',
      'Disposition',
      'Discharge Ready',
    ]);
    expect(operatingSystem.copilot.copilotId).toBe('emergency-ai-copilot');
    expect(operatingSystem.analytics.route).toBe('/emergency/analytics');
    expect(operatingSystem.automationMarketplace.metrics.totalModules).toBe(10);
    expect(operatingSystem.automationRoi).toEqual(
      expect.objectContaining({
        route: '/workspace/emergency/automation-roi',
        metricDefinitions: [
          'time saved',
          'clicks reduced',
          'queue impact',
          'throughput impact',
          'adoption',
        ],
      }),
    );
    expect(operatingSystem.knowledgeLayer.results.length).toBeGreaterThan(5);
  });

  it('builds discharge flow from queue, capacity, and automation marketplace signals', () => {
    const operatingSystem = getEmergencyOperatingSystem();

    expect(operatingSystem.dischargeFlow).toEqual(
      expect.objectContaining({
        queue: expect.objectContaining({
          id: 'discharge-queue',
        }),
        dischargeCandidates: expect.any(Number),
        automations: expect.arrayContaining([
          expect.objectContaining({
            categories: expect.arrayContaining(['Discharge']),
          }),
        ]),
      }),
    );
  });

  it('summarizes leadership status for the Emergency hero dashboard', () => {
    const operatingSystem = getEmergencyOperatingSystem();

    expect(operatingSystem.leadershipSummary).toEqual(
      expect.objectContaining({
        activePatients: expect.any(Number),
        smartArrivalSummaries: expect.any(Number),
        waitingPatients: expect.any(Number),
        queueBottlenecks: expect.any(Number),
        doorToDirection: expect.any(Number),
        doorToDirectionCompliance: expect.any(Number),
        doorToDoctor: expect.any(Number),
        waitingRoomHealthScore: expect.any(Number),
        reassessmentQueue: expect.any(Number),
        emsArrivals: expect.any(Number),
        emsOffloadDelay: expect.any(Number),
        capacityScore: expect.any(Number),
        flowDetections: expect.any(Number),
        nextRecommendedActions: expect.any(Number),
        referralDelays: expect.any(Number),
        boardingCount: expect.any(Number),
        resourceShortages: expect.any(Number),
        activeEscalations: expect.any(Number),
        automationModules: 10,
      }),
    );
    expect(operatingSystem.positioning).toMatch(/standalone SaaS solution/i);
  });
});
