import { Test } from '@nestjs/testing';
import { EmergencyOsController } from './emergency-os.controller';
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
} from './emergency-os.services';

describe('EmergencyOsController', () => {
  let controller: EmergencyOsController;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [EmergencyOsController],
      providers: [
        EmergencyWhiteboardService,
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
});
