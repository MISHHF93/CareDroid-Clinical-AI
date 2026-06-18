import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { ChatModule } from '../chat/chat.module';
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
import { EmergencyOsUpgradeHarnessService } from './emergency-os.upgrade-harness.service';
import { OperationalIntelligenceService } from './emergency-os.operational-intelligence.service';
import { PatientOrchestrationService } from './emergency-os.orchestration.service';
import { AICallInterrogationService } from '../../services/ai-call-interrogation.service';
import { EdgeAIAmbulanceService } from '../../services/edge-ai-ambulance.service';
import { FederatedEMSService } from '../../services/federated-ems.service';
import { LMECSService } from '../../services/lmecs.service';
import { OrganizationalDigitalTwin } from '../../services/organizational-digital-twin.service';
import { ERPulseHandoverService } from '../../services/smart-handover-v2.service';
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

@Module({
  imports: [ConfigModule, AuthModule, AuditModule, ChatModule],
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
    WorkflowActionLogService,
    EmergencyPatientService,
    PatientJourneyService,
    EMSIntakeService,
    SmartIntakeService,
    QueueIntelligenceService,
    ReassessmentService,
    CapacityService,
    BoardingService,
    CareDroidCentralNodeService,
    OperationalIntelligenceService,
    ReferralService,
    ReceptionWorkspaceService,
    PatientOrchestrationService,
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
    ERPulseHandoverService,
    FederatedEMSService,
    LMECSService,
    AICallInterrogationService,
    EdgeAIAmbulanceService,
    OrganizationalDigitalTwin,
  ],
})
export class EmergencyOsModule {}
