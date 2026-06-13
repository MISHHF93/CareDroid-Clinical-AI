import { Module } from '@nestjs/common';
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

@Module({
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
})
export class EmergencyOsModule {}
