import { describe, expect, it } from 'vitest';
import WorkspaceDataPipelineService, {
  getWorkspaceAIContext,
  getWorkspaceAlerts,
  getWorkspaceAnalytics,
  getWorkspaceRecommendations,
  normalizeWorkspaceData,
} from './workspaceDataPipelineService';

describe('WorkspaceDataPipelineService', () => {
  it('normalizes workspace data through the canonical pipeline stages', () => {
    const data = normalizeWorkspaceData('emergency');

    expect(data.pipelineStages).toEqual([
      'Source',
      'Ingestion',
      'Normalization',
      'Workspace Context',
      'Asset Recommendations',
      'Dashboard Widgets',
      'Alerts',
      'AI Context',
      'Reports',
    ]);
    expect(data.workspace.id).toBe('emergency');
    expect(data.mode.modeName).toMatch(/Emergency/);
    expect(data.recommendations.some((item) => item.assetId === 'qsofa')).toBe(true);
    expect(data.analytics.counts.automations).toBe(10);
    expect(data.analytics.solutionPackage.title).toBe('Emergency Flow Intelligence Platform');
    expect(data.emergency.patientJourney.map((stage) => stage.id)).toEqual([
      'arrival',
      'registration',
      'triage',
      'waiting',
      'assessment',
      'orders',
      'results',
      'reassessment',
      'disposition',
      'admission',
      'discharge',
      'follow-up',
    ]);
    expect(data.emergency.patientJourney[0]).toEqual(
      expect.objectContaining({
        automationCount: expect.any(Number),
        metrics: expect.objectContaining({
          activePatients: expect.any(Number),
          targetMinutes: expect.any(Number),
        }),
      })
    );
    expect(data.emergency.patientJourneyEngine).toEqual(
      expect.objectContaining({
        metrics: expect.objectContaining({
          totalStates: 12,
          automationCount: 22,
          automationCoveragePercent: 100,
        }),
        bottlenecks: expect.arrayContaining([
          expect.objectContaining({
            stateId: expect.any(String),
          }),
        ]),
        recommendations: expect.arrayContaining([
          expect.objectContaining({
            stateId: expect.any(String),
          }),
        ]),
      })
    );
    expect(data.emergency.patientJourney.find((stage) => stage.id === 'registration')).toEqual(
      expect.objectContaining({
        automations: expect.arrayContaining([
          expect.objectContaining({
            automationId: 'emergency-intake-smart-intake',
            title: 'Smart Intake',
            humanReviewRequired: true,
          }),
        ]),
      })
    );
    expect(data.emergency.intakeOperatingSystem).toEqual(
      expect.objectContaining({
        serviceId: 'emergency-intake-operating-system',
        commandCenter: expect.objectContaining({
          route: '/workspace/emergency/intake',
          trackedStates: expect.arrayContaining([
            expect.objectContaining({ label: 'Arrivals' }),
            expect.objectContaining({ label: 'Pending verification' }),
            expect.objectContaining({ label: 'Triage-ready patients' }),
          ]),
        }),
        patientSnapshot: expect.objectContaining({
          route: '/workspace/emergency/patient-context',
          clinicianReviewStatus: 'review required',
          structuredSummary: expect.objectContaining({
            referralReason: expect.stringMatching(/chest pain/i),
            arrivalComplaint: 'Chest Pain',
          }),
        }),
        smartArrival: expect.objectContaining({
          route: '/workspace/emergency/intake',
          generatedSnapshot: expect.objectContaining({
            status: 'finalized',
            contains: expect.arrayContaining(['demographics', 'allergies', 'medications']),
          }),
          confirmationGate: expect.objectContaining({
            requiredBeforeFinalizing: true,
            acceptedConfirmationActors: expect.arrayContaining(['patient', 'staff']),
          }),
          emergencyWorkspaceFeed: expect.objectContaining({
            route: '/workspace/emergency',
            separateIntakeAppCreated: false,
            arrivalState: expect.stringMatching(/inside Emergency OS already summarized/i),
          }),
        }),
        analytics: expect.objectContaining({
          route: '/workspace/emergency/intake-analytics',
        }),
        implementationTraceability: expect.objectContaining({
          totalPlans: 19,
          implementedPlans: 19,
          routes: expect.arrayContaining(['/workspace/emergency/intake', '/workspace/emergency/patient-context']),
        }),
      })
    );
    expect(data.emergency.operatingSystem).toEqual(
      expect.objectContaining({
        responsibilities: expect.arrayContaining(['intake flow']),
        smartArrival: expect.objectContaining({
          title: 'Smart Arrival',
        }),
        intakeOperatingSystem: expect.objectContaining({
          serviceId: 'emergency-intake-operating-system',
        }),
        leadershipSummary: expect.objectContaining({
          smartArrivalSummaries: expect.any(Number),
          registrationCompletionScore: expect.any(Number),
          triageReadyFromIntake: expect.any(Number),
        }),
      })
    );
    expect(data.emergency.smartArrival).toBe(data.emergency.intakeOperatingSystem.smartArrival);
    expect(data.emergency.queueIntelligence).toEqual(
      expect.objectContaining({
        metrics: expect.objectContaining({
          queueCount: 9,
          patientsToday: expect.any(Number),
          patientsNeedingReassessment: expect.any(Number),
          bottleneckQueue: expect.any(String),
          bottleneckCount: expect.any(Number),
          highestRiskQueue: expect.objectContaining({
            queueId: expect.any(String),
          }),
        }),
        queues: expect.arrayContaining([
          expect.objectContaining({
            label: 'Waiting Room',
            count: expect.any(Number),
            waitTime: expect.any(Number),
            oldestPatient: expect.objectContaining({ waitMinutes: expect.any(Number) }),
            riskLevel: expect.any(String),
            throughput: expect.any(Number),
          }),
        ]),
        recommendations: expect.arrayContaining([
          expect.objectContaining({
            action: expect.stringMatching(/before downstream queues degrade/i),
          }),
        ]),
      })
    );
    expect(data.emergency.doorToDoctorIntelligence).toEqual(
      expect.objectContaining({
        checkpoints: ['arrivalTime', 'triageTime', 'providerTime'],
        kpi: expect.objectContaining({
          metricId: 'doorToDoctor',
          value: expect.any(Number),
          targetCompliance: expect.any(Number),
        }),
        delays: expect.arrayContaining([
          expect.objectContaining({
            affectedInterval: expect.any(String),
          }),
        ]),
      })
    );
    expect(data.emergency.waitingRoomIntelligence).toEqual(
      expect.objectContaining({
        healthScore: expect.any(Number),
        riskState: expect.stringMatching(/Normal|Busy|Critical/),
        reassessmentIntelligence: expect.objectContaining({
          engineId: 'reassessment-intelligence',
          preventionGoal: expect.stringMatching(/Prevent forgotten patients/i),
          alerts: expect.arrayContaining([
            expect.objectContaining({ label: 'Needs Reassessment' }),
          ]),
        }),
        reassessmentQueue: expect.objectContaining({
          label: 'Reassessment Queue',
          count: expect.any(Number),
          thresholds: expect.arrayContaining([
            'waiting duration',
            'risk score changes',
            'abnormal vitals',
            'reassessment intervals',
          ]),
          alerts: expect.arrayContaining([
            expect.objectContaining({ label: 'Needs Reassessment' }),
          ]),
        }),
      })
    );
    expect(data.emergency.reassessmentAutomation.queue.items.length).toBeGreaterThan(0);
    expect(data.emergency.emsPreArrival).toEqual(
      expect.objectContaining({
        pipelineId: 'ems-handoff-pipeline',
        inputSchema: ['complaint', 'vitals', 'ETA', 'risk indicators'],
        statuses: ['Incoming', 'En Route', 'Arriving', 'Arrived'],
        output: 'ED Handoff Summary',
        workflow: expect.arrayContaining([
          expect.objectContaining({ label: 'EMS Assessment' }),
          expect.objectContaining({ label: 'Arrival' }),
        ]),
        metrics: expect.objectContaining({
          incomingCount: 3,
          nextEtaMinutes: expect.any(Number),
          handoffReadyCount: 3,
        }),
        queue: expect.objectContaining({
          label: 'Pre-arrival queue',
          incomingPatients: expect.arrayContaining([
            expect.objectContaining({
              etaMinutes: expect.any(Number),
              handoffStatus: expect.stringMatching(/Incoming|En Route|Arriving|Arrived/),
              riskIndicators: expect.arrayContaining([expect.any(String)]),
              riskScoreBundle: expect.arrayContaining([
                expect.objectContaining({ label: expect.any(String) }),
              ]),
              handoffSummary: expect.any(String),
              edHandoffSummary: expect.objectContaining({
                title: 'ED Handoff Summary',
                attachedToPatientJourney: true,
              }),
            }),
          ]),
        }),
        edHandoffSummaries: expect.arrayContaining([
          expect.objectContaining({
            title: 'ED Handoff Summary',
            attachedToPatientJourney: true,
          }),
        ]),
        recommendations: expect.arrayContaining([
          expect.objectContaining({
            action: expect.stringMatching(/before arrival/i),
          }),
        ]),
      })
    );
    expect(data.emergency.emsOffload).toEqual(
      expect.objectContaining({
        metrics: expect.objectContaining({
          incomingAmbulances: expect.any(Number),
          waitingHandoffs: expect.any(Number),
          longestOffloadDelay: expect.any(Number),
        }),
        handoffs: expect.arrayContaining([
          expect.objectContaining({
            status: expect.any(String),
            offloadDelayMinutes: expect.any(Number),
          }),
        ]),
      })
    );
    expect(data.emergency.capacityIntelligence).toEqual(
      expect.objectContaining({
        engineId: 'capacity-engine',
        inputSchema: ['occupancy', 'boarding', 'pending admissions', 'discharge candidates', 'EMS arrivals'],
        output: 'Capacity Score',
        score: expect.any(Number),
        riskLevel: expect.stringMatching(/Green|Yellow|Orange|Red/),
        occupancyPercent: expect.any(Number),
        signals: expect.arrayContaining([
          expect.objectContaining({ id: 'currentCensus', value: expect.any(Number) }),
          expect.objectContaining({ id: 'occupiedSpaces', value: expect.any(Number) }),
          expect.objectContaining({ id: 'availableSpaces', value: expect.any(Number) }),
          expect.objectContaining({ id: 'pendingAdmissions', value: expect.any(Number) }),
          expect.objectContaining({ id: 'boardingPatients', value: expect.any(Number) }),
          expect.objectContaining({ id: 'emsArrivals', value: expect.any(Number) }),
          expect.objectContaining({ id: 'dischargeCandidates', value: expect.any(Number) }),
        ]),
        recommendations: expect.arrayContaining([
          expect.objectContaining({
            category: expect.stringMatching(/discharge opportunities|bottlenecks|overloaded queues/),
            action: expect.any(String),
          }),
        ]),
        recommendationCategories: expect.objectContaining({
          dischargeOpportunities: expect.any(Array),
          bottlenecks: expect.any(Array),
          overloadedQueues: expect.any(Array),
        }),
      })
    );
    expect(data.emergency.referralHub).toEqual(
      expect.objectContaining({
        flowStages: expect.arrayContaining([
          expect.objectContaining({ label: 'Request' }),
          expect.objectContaining({ label: 'Closed' }),
        ]),
        departments: expect.arrayContaining(['Cardiology', 'Neurology', 'Psychiatry', 'Internal Medicine', 'Surgery', 'ICU']),
        metrics: expect.objectContaining({
          total: expect.any(Number),
          delayed: expect.any(Number),
          accepted: expect.any(Number),
          closed: expect.any(Number),
        }),
        delays: expect.arrayContaining([
          expect.objectContaining({
            department: expect.any(String),
            delayMinutes: expect.any(Number),
          }),
        ]),
        recommendations: expect.arrayContaining([
          expect.objectContaining({
            action: expect.stringMatching(/Confirm assigned staff/i),
          }),
        ]),
      })
    );
    expect(data.emergency.boardingIntelligence).toEqual(
      expect.objectContaining({
        score: expect.any(Number),
        metrics: expect.objectContaining({
          boardingCount: expect.any(Number),
          boardingTime: expect.any(Number),
          longestBoardingMinutes: expect.any(Number),
          pendingBeds: expect.any(Number),
          bedPressure: expect.any(String),
        }),
        longestBoarders: expect.arrayContaining([
          expect.objectContaining({
            patientLabel: expect.any(String),
            boardingMinutes: expect.any(Number),
            pendingBedType: expect.any(String),
          }),
        ]),
        recommendations: expect.arrayContaining([
          expect.objectContaining({
            action: expect.any(String),
          }),
        ]),
      })
    );
    expect(data.emergency.resourceBoard).toEqual(
      expect.objectContaining({
        metrics: expect.objectContaining({
          available: expect.any(Number),
          occupied: expect.any(Number),
          outOfService: expect.any(Number),
          shortageCount: expect.any(Number),
        }),
        resources: expect.arrayContaining([
          expect.objectContaining({ label: 'Rooms' }),
          expect.objectContaining({ label: 'Infusion Pumps' }),
        ]),
      })
    );
    expect(data.emergency.escalationEngine).toEqual(
      expect.objectContaining({
        metrics: expect.objectContaining({
          activeEscalations: expect.any(Number),
        }),
        escalations: expect.arrayContaining([
          expect.objectContaining({
            trigger: expect.stringMatching(/Capacity overload|Boarding overload|EMS congestion|High-risk queue growth|Critical device outage/),
          }),
        ]),
      })
    );
    expect(data.emergency.kpiLayer).toEqual(
      expect.objectContaining({
        id: 'EmergencyKPILayer',
        metricById: expect.objectContaining({
          doorToDoctor: expect.objectContaining({
            label: 'Door-to-Doctor',
            median: expect.any(Number),
            p90: expect.any(Number),
            longestActiveDuration: expect.any(Number),
          }),
          emsOffload: expect.objectContaining({ label: 'EMS Offload' }),
        }),
      })
    );
    expect(data.emergency.simulationScenarios.scenarios.map((scenario) => scenario.scenarioName)).toEqual(
      expect.arrayContaining(['Mass Casualty', 'Sepsis Surge', 'Stroke Surge', 'EMS Overload', 'Boarding Crisis'])
    );
    expect(data.emergency.demoEnvironment.metrics.patientCount).toBeGreaterThanOrEqual(100);
    expect(data.emergency.firstCustomerDeployment.minimumSellableCapabilities).toEqual([
      'Patient Journey Engine',
      'Queue Intelligence',
      'ED Copilot',
      'Referral Intelligence',
      'EMS Intelligence',
      'Analytics',
    ]);
    expect(data.emergency.firstCustomerDeployment.rolloutPlans.map((plan) => plan.label)).toEqual([
      '30-day pilot plan',
      '60-day rollout plan',
      '90-day expansion plan',
    ]);
    expect(data.emergency.implementationSummary).toEqual(
      expect.objectContaining({
        route: '/workspace/emergency/implementation',
        title: 'Emergency OS MVP Implementation Summary',
        sourceDocument: 'docs/emergency-os-mvp-implementation-summary.md',
        coverage: expect.arrayContaining([
          expect.objectContaining({
            doc: 'door-to-doctor-intelligence.md',
            route: '/workspace/emergency/throughput',
            service: 'DoorToDoctorIntelligenceService',
            status: 'implemented',
          }),
          expect.objectContaining({
            doc: 'first-customer-path.md',
            route: '/workspace/emergency/deployment',
            status: 'implemented',
          }),
        ]),
        verification: expect.objectContaining({
          testFiles: 9,
          tests: 69,
          status: 'passing',
        }),
      })
    );
    expect(data.emergency.automationMarketplace).toEqual(
      expect.objectContaining({
        metrics: expect.objectContaining({
          totalModules: 10,
          enabledModules: expect.any(Number),
          disabledModules: expect.any(Number),
          categories: 10,
        }),
        categories: expect.arrayContaining([
          expect.objectContaining({ category: 'Triage' }),
          expect.objectContaining({ category: 'Referral' }),
          expect.objectContaining({ category: 'Documentation' }),
          expect.objectContaining({ category: 'EMS' }),
          expect.objectContaining({ category: 'Capacity' }),
          expect.objectContaining({ category: 'Boarding' }),
          expect.objectContaining({ category: 'Equipment' }),
          expect.objectContaining({ category: 'Discharge' }),
          expect.objectContaining({ category: 'Simulation' }),
          expect.objectContaining({ category: 'Analytics' }),
        ]),
        modules: expect.arrayContaining([
          expect.objectContaining({
            enabled: expect.any(Boolean),
            disabled: expect.any(Boolean),
            subscriptionTier: expect.any(String),
            workspaceVisibility: expect.any(Array),
            roiEstimate: expect.any(String),
          }),
        ]),
      })
    );
    expect(data.emergency.digitalWhiteboard).toEqual(
      expect.objectContaining({
        route: '/workspace/emergency/whiteboard',
        primaryWorkspaceRoute: '/workspace/emergency',
        primarySurface: true,
        operatingAreas: expect.arrayContaining(['patients', 'queues', 'alerts', 'referrals', 'EMS arrivals', 'boarding', 'capacity']),
        emsHandoffPipeline: expect.objectContaining({
          pipelineId: 'ems-handoff-pipeline',
          statuses: ['Incoming', 'En Route', 'Arriving', 'Arrived'],
          output: 'ED Handoff Summary',
        }),
        reassessmentIntelligence: expect.objectContaining({
          engineId: 'reassessment-intelligence',
          alerts: expect.arrayContaining([
            expect.objectContaining({ label: 'Needs Reassessment' }),
          ]),
          thresholds: expect.arrayContaining([
            'waiting duration',
            'risk score changes',
            'abnormal vitals',
            'reassessment intervals',
          ]),
        }),
        capacityEngine: expect.objectContaining({
          engineId: 'capacity-engine',
          output: 'Capacity Score',
          score: expect.any(Number),
          riskLevel: expect.stringMatching(/Green|Yellow|Orange|Red/),
          recommendations: expect.arrayContaining([
            expect.objectContaining({
              category: expect.stringMatching(/discharge opportunities|bottlenecks|overloaded queues/),
            }),
          ]),
        }),
        flowEngine: expect.objectContaining({
          engineId: 'emergency-flow-engine',
          monitoredStages: expect.arrayContaining([
            expect.objectContaining({ label: 'Arrival' }),
            expect.objectContaining({ label: 'Disposition' }),
          ]),
          nextRecommendedActions: expect.arrayContaining([
            expect.objectContaining({
              action: expect.any(String),
              reason: expect.any(String),
            }),
          ]),
        }),
        summary: expect.objectContaining({
          patientsToday: expect.any(Number),
          totalActivePatients: expect.any(Number),
          waitingPatients: expect.any(Number),
          currentAverageWait: expect.any(Number),
          highRiskPatients: expect.any(Number),
          reassessmentDue: expect.any(Number),
          needsReassessment: expect.any(Number),
          reassessmentAlerts: expect.any(Number),
          referralDelays: expect.any(Number),
          emsArrivals: expect.any(Number),
          emsHandoffSummaries: expect.any(Number),
          boardingPatients: expect.any(Number),
          capacityScore: expect.any(Number),
          capacityRiskLevel: expect.stringMatching(/Green|Yellow|Orange|Red/),
          capacityRecommendations: expect.any(Number),
          capacityPressure: expect.any(Number),
          flowDetections: expect.any(Number),
          nextRecommendedActions: expect.any(Number),
        }),
        cards: expect.arrayContaining([
          expect.objectContaining({
            patientId: 'DEMO-ED-1001',
            acuity: expect.any(String),
            assignedClinician: expect.any(String),
            needsReassessment: true,
            alerts: expect.arrayContaining(['Needs Reassessment']),
            reassessmentAlert: expect.objectContaining({
              label: 'Needs Reassessment',
            }),
          }),
          expect.objectContaining({
            patientId: expect.stringMatching(/^EMS-/),
            handoffStatus: expect.stringMatching(/Incoming|En Route|Arriving|Arrived/),
            edHandoffSummary: expect.objectContaining({
              title: 'ED Handoff Summary',
            }),
          }),
        ]),
        columns: expect.arrayContaining([
          expect.objectContaining({ label: 'EMS Incoming' }),
          expect.objectContaining({ label: 'Waiting' }),
          expect.objectContaining({ label: 'Triage' }),
          expect.objectContaining({ label: 'In Assessment' }),
          expect.objectContaining({ label: 'Orders Pending' }),
          expect.objectContaining({ label: 'Results Pending' }),
          expect.objectContaining({ label: 'Reassessment Due' }),
          expect.objectContaining({ label: 'Disposition' }),
          expect.objectContaining({ label: 'Discharge Ready' }),
        ]),
      })
    );
    expect(data.emergency.patientPath).toEqual(
      expect.objectContaining({
        route: '/workspace/emergency/patient-path',
        metrics: expect.objectContaining({
          doorToDirectionMinutes: expect.any(Number),
          targetCompliance: expect.any(Number),
          patientsWithoutDirection: expect.any(Number),
        }),
        milestones: expect.arrayContaining([
          expect.objectContaining({ label: 'Patient Known' }),
          expect.objectContaining({ label: 'Next Action Known' }),
        ]),
        patients: expect.arrayContaining([
          expect.objectContaining({
            patientId: expect.stringMatching(/^EMS-/),
            arrivalMode: 'EMS',
            handoffStatus: expect.stringMatching(/Incoming|En Route|Arriving|Arrived/),
            edHandoffSummary: expect.objectContaining({
              title: 'ED Handoff Summary',
              attachedToPatientJourney: true,
            }),
          }),
          expect.objectContaining({
            patientId: expect.stringMatching(/^DEMO-ED-/),
            assignedQueue: expect.objectContaining({ label: expect.any(String) }),
            destination: expect.objectContaining({ label: expect.any(String) }),
            nextAction: expect.any(String),
          }),
        ]),
      })
    );
    expect(data.emergency.knowledgeLayer).toEqual(
      expect.objectContaining({
        route: '/workspace/emergency/knowledge',
        design: 'search-first',
        domains: expect.arrayContaining(['protocol', 'calculator', 'pathway', 'simulation', 'evidence', 'workflow']),
        results: expect.arrayContaining([
          expect.objectContaining({
            title: 'Chest Pain / ACS Guidance',
            relatedCalculators: expect.arrayContaining(['heart-score']),
          }),
        ]),
      })
    );
    expect(data.emergency.automationRoi).toEqual(
      expect.objectContaining({
        route: '/workspace/emergency/automation-roi',
        metricDefinitions: ['time saved', 'clicks reduced', 'queue impact', 'throughput impact', 'adoption'],
        totals: expect.objectContaining({
          automationsTracked: 10,
          estimatedMinutesSaved: expect.any(Number),
          estimatedClicksReduced: expect.any(Number),
        }),
        automations: expect.arrayContaining([
          expect.objectContaining({
            valueScore: expect.any(Number),
            timeSaved: expect.objectContaining({ totalMinutes: expect.any(Number) }),
            queueImpact: expect.objectContaining({ estimatedMinutesReduced: expect.any(Number) }),
          }),
        ]),
      })
    );
    expect(data.emergency.operatingSystem).toEqual(
      expect.objectContaining({
        title: 'Emergency Department Operating System',
        route: '/workspace/emergency',
        status: 'standalone-saas-ready',
        responsibilities: expect.arrayContaining([
          'patient flow',
          'intake flow',
          'queue flow',
          'referral flow',
          'EMS flow',
          'capacity flow',
          'discharge flow',
        ]),
        patientFlow: expect.any(Object),
        queueFlow: expect.any(Object),
        referralFlow: expect.any(Object),
        emsFlow: expect.any(Object),
        capacityFlow: expect.any(Object),
        dischargeFlow: expect.objectContaining({
          dischargeCandidates: expect.any(Number),
        }),
        copilot: expect.objectContaining({
          copilotId: 'emergency-ai-copilot',
        }),
        analytics: expect.objectContaining({
          route: '/workspace/emergency/analytics',
        }),
        automationMarketplace: expect.objectContaining({
          metrics: expect.objectContaining({ totalModules: 10 }),
        }),
        automationRoi: expect.objectContaining({
          route: '/workspace/emergency/automation-roi',
        }),
        knowledgeLayer: expect.objectContaining({
          route: '/workspace/emergency/knowledge',
        }),
        digitalWhiteboard: expect.objectContaining({
          route: '/workspace/emergency/whiteboard',
        }),
        patientPath: expect.objectContaining({
          route: '/workspace/emergency/patient-path',
        }),
      })
    );
    expect(data.emergency.dashboardWidgets.map((widget) => widget.label)).toEqual(
      expect.arrayContaining(['Waiting Room', 'Active Patients', 'Documentation Queue'])
    );
    expect(data.emergency.commandCenterWidgets.map((widget) => widget.label)).toEqual([
      'Current Patients',
      'Waiting Room',
      'High Risk Queue',
      'EMS Arrivals',
      'Referral Queue',
      'Bed Pressure',
      'Equipment Status',
      'Staffing Pressure',
      'Alerts',
    ]);
    expect(data.emergency.commandCenterWidgets[0]).toEqual(
      expect.objectContaining({
        targetSurface: 'patients',
        primaryAction: expect.objectContaining({
          label: 'Open patient flow',
          target: '/workspace/emergency/patients',
        }),
        secondaryAction: expect.objectContaining({
          actionType: 'assistant',
        }),
      })
    );
    expect(data.emergency.commandCenterWidgets.find((widget) => widget.id === 'ems-arrivals')).toEqual(
      expect.objectContaining({
        targetSurface: 'pre-arrival',
        primaryAction: expect.objectContaining({
          target: '/workspace/emergency/pre-arrival',
        }),
      })
    );
    expect(data.subpages.map((subpage) => subpage.id)).toEqual(
      expect.arrayContaining([
        'automation-roi',
        'boarding',
        'capacity',
        'charge-nurse',
        'command-center',
        'demo',
        'deployment',
        'director',
        'flow',
        'knowledge',
        'onboarding',
        'patient-path',
        'pre-arrival',
        'queues',
        'roi',
        'whiteboard',
      ])
    );
    expect(data.emergency.demoTenant).toEqual(
      expect.objectContaining({
        tenantName: 'Emergency OS Demo Hospital',
        dataPosture: expect.stringMatching(/Demo\/local data only/i),
        samplePatients: expect.arrayContaining([
          expect.objectContaining({ dataLabel: 'Demo data', integrationLabel: 'No live integration' }),
        ]),
        sampleAlerts: expect.arrayContaining([
          expect.objectContaining({ dataLabel: 'Demo data', integrationLabel: 'No live integration' }),
        ]),
        sampleWorkflows: expect.arrayContaining([
          expect.objectContaining({ dataLabel: 'Demo data', integrationLabel: 'No live integration' }),
        ]),
        sampleProtocols: expect.arrayContaining([
          expect.objectContaining({ dataLabel: 'Demo data', integrationLabel: 'No live integration' }),
        ]),
        sampleAnalytics: expect.arrayContaining([
          expect.objectContaining({ dataLabel: 'Demo data', integrationLabel: 'No live integration' }),
        ]),
      })
    );
    expect(data.emergency.firstCustomerDeployment).toEqual(
      expect.objectContaining({
        route: '/workspace/emergency/deployment',
        phases: expect.arrayContaining([
          expect.objectContaining({ title: 'Standalone Emergency OS' }),
          expect.objectContaining({ title: 'Protocol Library' }),
          expect.objectContaining({ title: 'AI Copilot' }),
          expect.objectContaining({ title: 'Analytics' }),
          expect.objectContaining({ title: 'Optional Integrations' }),
        ]),
        acceptance: expect.stringMatching(/without requiring a full hospital-wide deployment/i),
      })
    );
    expect(data.emergency.flowIntelligencePlatform).toEqual(
      expect.objectContaining({
        route: '/workspace/emergency/flow',
        primaryObjective: 'Reduce ED bottlenecks.',
        marketPains: expect.arrayContaining(['Too many patients', 'Too much coordination']),
        valueDrivers: expect.arrayContaining([
          expect.objectContaining({ title: 'Throughput' }),
          expect.objectContaining({ title: 'Capacity' }),
          expect.objectContaining({ title: 'Coordination' }),
          expect.objectContaining({ title: 'Cognitive Load' }),
        ]),
        firstCustomerReadiness: expect.objectContaining({
          noIntegrationPosture: expect.stringMatching(/without ADT, EHR, EMS CAD/i),
        }),
        solutions: expect.arrayContaining([
          expect.objectContaining({ title: 'Pre-Hospital Intelligence' }),
          expect.objectContaining({ title: 'EMS-to-ED Handoff' }),
          expect.objectContaining({ title: 'Dynamic Triage' }),
          expect.objectContaining({ title: 'Bed Flow Intelligence' }),
          expect.objectContaining({ title: 'Referral Automation' }),
          expect.objectContaining({ title: 'Discharge Acceleration' }),
          expect.objectContaining({ title: 'Equipment Intelligence' }),
          expect.objectContaining({ title: 'Surge Prediction' }),
          expect.objectContaining({ title: 'ED Copilot' }),
          expect.objectContaining({ title: 'ED Command Center' }),
        ]),
        automationRegistry: expect.arrayContaining([
          expect.objectContaining({ title: 'Dynamic Triage', humanReviewRequirement: expect.any(String) }),
        ]),
        saasPackagingModel: expect.objectContaining({
          productName: 'Emergency Flow Intelligence Platform',
        }),
      })
    );
    expect(data.emergency.flowEngine).toEqual(
      expect.objectContaining({
        engineId: 'emergency-flow-engine',
        monitoredStages: expect.arrayContaining([
          expect.objectContaining({ label: 'Arrival' }),
          expect.objectContaining({ label: 'Triage' }),
          expect.objectContaining({ label: 'Waiting' }),
          expect.objectContaining({ label: 'Assessment' }),
          expect.objectContaining({ label: 'Orders' }),
          expect.objectContaining({ label: 'Results' }),
          expect.objectContaining({ label: 'Disposition' }),
        ]),
        detectionTypes: expect.arrayContaining([
          'stalled patients',
          'delayed referrals',
          'delayed reassessments',
          'excessive wait times',
          'boarding pressure',
        ]),
        nextRecommendedActions: expect.arrayContaining([
          expect.objectContaining({
            action: expect.any(String),
            reason: expect.any(String),
          }),
        ]),
        metrics: expect.objectContaining({
          activeDetections: expect.any(Number),
        }),
      })
    );
    expect(data.emergency.flowIntelligencePlatform.solutions).toHaveLength(10);
    expect(data.emergency.flowIntelligencePlatform.workflowRegistry.length).toBeGreaterThan(10);
    expect(data.emergency.flowIntelligencePlatform.analyticsModel.events.length).toBeGreaterThan(10);
    expect(data.emergency.onboarding).toEqual(
      expect.objectContaining({
        route: '/workspace/emergency/onboarding',
        sections: expect.arrayContaining([
          expect.objectContaining({ label: 'Emergency OS overview' }),
          expect.objectContaining({ label: 'Calculators' }),
          expect.objectContaining({ label: 'Protocols' }),
          expect.objectContaining({ label: 'AI Copilot' }),
          expect.objectContaining({ label: 'Workflows' }),
          expect.objectContaining({ label: 'Analytics' }),
        ]),
        walkthrough: expect.arrayContaining([
          expect.objectContaining({
            minute: '9-10',
            targetRoute: '/workspace/emergency/analytics',
          }),
        ]),
      })
    );
    expect(data.emergency.roiEstimator).toEqual(
      expect.objectContaining({
        route: '/workspace/emergency/roi',
        inputFields: expect.arrayContaining([
          expect.objectContaining({ id: 'annualEdVolume' }),
          expect.objectContaining({ id: 'physicianCount' }),
          expect.objectContaining({ id: 'nursingCount' }),
          expect.objectContaining({ id: 'averageAssessmentsPerDay' }),
        ]),
      })
    );
    expect(data.emergency.roiEstimate.outputs).toEqual(
      expect.objectContaining({
        estimatedTimeSavedHours: expect.any(Number),
        workflowEfficiencyPercent: expect.any(Number),
        adoptionPotential: expect.stringMatching(/High|Medium|Low/),
      })
    );
    expect(data.emergency.triageOrchestrator.calculatorSequence.map((calculator) => calculator.id)).toEqual(
      expect.arrayContaining(['qsofa', 'news2', 'heart-score', 'wells-pe', 'wells-dvt-calculator', 'shock-index'])
    );
    expect(data.emergency.triageOrchestrator.dynamicRiskBundleEngine).toEqual(
      expect.objectContaining({
        engineId: 'dynamic-risk-bundle-engine',
        inputSchema: ['chief complaint', 'age', 'vitals', 'risk factors'],
        outputSchema: ['Risk Bundle', 'Emergency Risk Profile'],
        displayRule: expect.stringMatching(/one consolidated Emergency Risk Profile/i),
      })
    );
    expect(data.emergency.ragComplaintContext.map((context) => context.complaint)).toEqual(
      expect.arrayContaining([
        'Chest Pain',
        'Stroke Symptoms',
        'Sepsis Concern',
        'Trauma',
        'Shortness of Breath',
        'Abdominal Pain',
        'Psychiatric Crisis',
      ])
    );
    expect(data.emergency.chiefComplaintRoutes.map((route) => route.complaint)).toEqual([
      'Chest Pain',
      'Stroke Symptoms',
      'Sepsis Concern',
      'Trauma',
      'Shortness of Breath',
      'Abdominal Pain',
      'Psychiatric Crisis',
    ]);
    expect(data.emergency.chiefComplaintRoutes[0]).toEqual(
      expect.objectContaining({
        calculators: [expect.objectContaining({ label: 'HEART' })],
        workflows: ['ACS Workflow'],
        referrals: ['Cardiology Referral'],
        simulations: ['ACS chest pain simulation'],
        navigationSteps: ['Complaint', 'Workflow', 'Calculators', 'Protocols', 'Referrals', 'AI Copilot'],
        safetyStatement: expect.stringMatching(/does not diagnose/i),
      })
    );
    expect(data.emergency.clinicalIntentRouter).toEqual(
      expect.objectContaining({
        outputSchema: ['complaint', 'workflow', 'calculators', 'protocols', 'referrals', 'aiCopilot'],
        routes: expect.arrayContaining([
          expect.objectContaining({
            complaint: 'Trauma',
            workflows: ['Trauma Pathway'],
          }),
          expect.objectContaining({
            complaint: 'Abdominal Pain',
            workflows: ['Abdominal Pain Workflow'],
          }),
          expect.objectContaining({
            complaint: 'Psychiatric Crisis',
            workflows: ['Psychiatric Crisis Workflow'],
          }),
        ]),
      })
    );
    expect(data.emergency.aiCopilot).toEqual(
      expect.objectContaining({
        copilotId: 'emergency-ai-copilot',
        inputSchema: ['complaint', 'vitals', 'workspaceContext', 'surfacedCalculators'],
        sampleGuidance: expect.objectContaining({
          surfacedCalculators: expect.arrayContaining([expect.objectContaining({ label: 'HEART' })]),
          reasoning: expect.any(Array),
        }),
      })
    );
    expect(data.analytics.emergency).toEqual(
      expect.objectContaining({
        route: '/workspace/emergency/analytics',
        trackedEvents: [
          'assessments_completed',
          'calculators_used',
          'protocol_retrievals',
          'workflow_launches',
          'ai_requests',
          'simulation_completion',
        ],
        metrics: expect.arrayContaining([
          expect.objectContaining({ label: 'Assessments completed' }),
          expect.objectContaining({ label: 'Calculators used' }),
          expect.objectContaining({ label: 'Protocol retrievals' }),
          expect.objectContaining({ label: 'Workflow launches' }),
          expect.objectContaining({ label: 'AI requests' }),
          expect.objectContaining({ label: 'Simulation completion' }),
        ]),
        roiSummary: expect.objectContaining({
          adoption: expect.stringMatching(/pilot signals/i),
          valueProof: expect.stringMatching(/time saved/i),
        }),
      })
    );
    expect(data.emergency.analyticsMvp).toBe(data.analytics.emergency);
    expect(data.emergency.productTiers.map((tier) => tier.title)).toEqual([
      'Emergency Flow Starter',
      'Emergency Flow Professional',
      'Emergency Flow Enterprise',
    ]);
    expect(data.emergency.mvpPackage).toEqual(
      expect.objectContaining({
        packageId: 'emergency-core-mvp',
        billingMetric: expect.stringMatching(/ED site/i),
        implementationDependency: 'Low',
        integrationDependency: 'Not required for MVP pilot',
        humanReviewRequirement: 'Required for every clinical output',
      })
    );
    expect(data.emergency.mvpPackage.includedCapabilities.find((capability) => capability.label === 'qSOFA')).toEqual(
      expect.objectContaining({
        label: 'qSOFA',
        reason: expect.stringMatching(/sepsis screening/i),
        dependencyPosture: 'Standalone/manual input',
      })
    );
    expect(data.emergency.mvpPackage.includedCapabilities.map((capability) => capability.label)).toEqual(
      expect.arrayContaining([
        'Patient Journey Engine',
        'Queue Intelligence',
        'ED Copilot',
        'Referral Intelligence',
        'EMS Intelligence',
        'Analytics',
        'qSOFA',
        'NEWS2',
        'HEART',
        'Protocol Retrieval',
        'Workflow Guidance',
        'Emergency Whiteboard',
      ])
    );
    expect(data.emergency.optionalAddOns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: 'Documentation Integrity',
          billingMetric: 'Feature add-on per ED site per month',
          implementationDependency: 'Medium',
        }),
        expect.objectContaining({
          title: 'Referral Routing',
          trialPosture: expect.stringMatching(/Flow Starter acceptance/i),
        }),
        expect.objectContaining({
          title: 'Prior Authorization',
          implementationDependency: 'High',
        }),
      ])
    );
    expect(data.emergency.customerReadiness.summary).toEqual(
      expect.objectContaining({
        readyToSell: expect.any(Number),
        needsWiring: expect.any(Number),
        needsIntegration: expect.any(Number),
        futureRoadmap: expect.any(Number),
      })
    );
    expect(data.emergency.customerReadiness.fastestToMarketOfferings.map((offering) => offering.title)).toEqual(
      expect.arrayContaining(['Emergency Flow Starter', 'ED Evidence Companion'])
    );
    expect(data.emergency.customerReadiness.capabilities.every((capability) => capability.classification)).toBe(true);
    expect(data.alerts.length).toBeGreaterThan(0);
  });

  it('returns honest backend status labels instead of claiming unavailable live services', () => {
    const data = WorkspaceDataPipelineService.getWorkspaceData('medical-iot');

    expect(data.backendConnections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'devices',
          status: 'demo-local-fallback',
          statusLabel: 'Demo/local fallback',
          isBackendWired: false,
        }),
      ])
    );
    expect(data.sourceStatus).toMatch(/demo\/local fallback/i);
  });

  it('returns non-null AI context for operational workspaces', () => {
    for (const workspaceId of ['emergency', 'laboratory', 'medical-iot', 'fleet', 'governance']) {
      const context = getWorkspaceAIContext(workspaceId);
      expect(context.workspaceId).toBe(workspaceId);
      expect(context.assistantContext).toEqual(expect.any(String));
      expect(context.assistantContext.length).toBeGreaterThan(12);
      expect(context.tools.length).toBeGreaterThan(0);
      expect(context.automations).toEqual(expect.any(Array));
    }
    expect(getWorkspaceAIContext('emergency').emergency.chiefComplaintRoutes.map((route) => route.complaint)).toEqual(
      expect.arrayContaining(['Chest Pain', 'Sepsis Concern', 'Shortness of Breath', 'Abdominal Pain', 'Psychiatric Crisis'])
    );
    expect(getWorkspaceAIContext('emergency').emergency.aiCopilot).toEqual(
      expect.objectContaining({
        copilotId: 'emergency-ai-copilot',
        safetyBoundary: expect.stringMatching(/No autonomous/i),
      })
    );
  });

  it('returns workspace-specific asset, alert, and analytics slices', () => {
    expect(getWorkspaceRecommendations('laboratory').map((item) => item.assetId)).toContain('lab-interp');
    expect(getWorkspaceRecommendations('fleet').map((item) => item.assetId)).toContain('fleet-live-map');
    expect(getWorkspaceRecommendations('governance').map((item) => item.assetId)).toEqual(
      expect.arrayContaining(['ai-governance', 'ai-security'])
    );
    expect(getWorkspaceAlerts('medical-iot').map((item) => item.label).join(' ')).toMatch(/telemetry|offline|battery/i);
    expect(getWorkspaceAnalytics('fleet').counts.tools).toBeGreaterThan(0);
  });
});
