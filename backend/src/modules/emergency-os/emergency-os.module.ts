import { Module } from '@nestjs/common';
import { EmergencyOsController } from './emergency-os.controller';
import {
  AICallInterrogationController,
  ERPulseHandoverController,
  FederatedEMSController,
  LMECSController,
  OrganizationalDigitalTwinController,
} from './emergency-os.research.controller';
import {
  FederatedLearningService,
  HybridDigitalTwinService,
  RealTimeSimulationService,
} from './emergency-os.advanced-services';
import { AICallInterrogationService } from '../../services/ai-call-interrogation.service';
import { EdgeAIAmbulanceService } from '../../services/edge-ai-ambulance.service';
import { FederatedEMSService } from '../../services/federated-ems.service';
import { LMECSService } from '../../services/lmecs.service';
import { OrganizationalDigitalTwin } from '../../services/organizational-digital-twin.service';
import { ERPulseHandoverService } from '../../services/smart-handover-v2.service';
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
  controllers: [
    EmergencyOsController,
    ERPulseHandoverController,
    FederatedEMSController,
    LMECSController,
    AICallInterrogationController,
    OrganizationalDigitalTwinController,
  ],
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
    RealTimeSimulationService,
    FederatedLearningService,
    HybridDigitalTwinService,
    ERPulseHandoverService,
    FederatedEMSService,
    LMECSService,
    AICallInterrogationService,
    EdgeAIAmbulanceService,
    OrganizationalDigitalTwin,
  ],
})
export class EmergencyOsModule {}
