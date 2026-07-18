import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { CigModule } from '../cig/cig.module';
import { EncryptionModule } from '../encryption/encryption.module';
import { ChatModule } from '../chat/chat.module';
import { PlatformAssetsModule } from '../platform-assets/platform-assets.module';
import { CollaborationHubModule } from '../collaboration-hub/collaboration-hub.module';
import { EmergencyOsController } from './emergency-os.controller';
import { EdCopilotNestParityController } from './ed-copilot.nest-parity.controller';
import { EmergencyRealtimeController } from './emergency-realtime.controller';
import { EmergencyRealtimeService } from './emergency-realtime.service';
import { JwtQueryAuthGuard } from './guards/jwt-query-auth.guard';
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
import { PatientDocumentArtifactService } from './patient-document-artifact.service';
import { OcrIntakeService } from './ocr-intake.service';
import { ClinicalDecisionSupportService } from './clinical-decision-support.service';
import { EmergencyPatientAuditService } from './emergency-patient-audit.service';
import { PatientFlowService } from './emergency-os.patient-flow.service';
import { AdministrativeAutomationQueueService } from './administrative-automation-queue.service';
import { AdministrativeAutomationTaskEntity } from './entities/administrative-automation-task.entity';
import { Patient } from './entities/patient.entity';
import { Room } from './entities/room.entity';
import { Staff } from './entities/staff.entity';
import { Alert } from './entities/alert.entity';
import { WorkflowActionLogEntry } from './entities/workflow-action-log-entry.entity';
import { EmergencyReferenceDataSeedService } from './emergency-reference-data.seed.service';
import { WorkflowOrchestrationService } from './emergency-os.workflow-orchestration.service';
import { EmergencyOperatingSurfacesService } from './emergency-os.operating-surfaces.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AdministrativeAutomationTaskEntity,
      Patient,
      Room,
      Staff,
      Alert,
      WorkflowActionLogEntry,
    ]),
    ConfigModule,
    AuthModule,
    AuditModule,
    EncryptionModule,
    CigModule,
    forwardRef(() => ChatModule),
    PlatformAssetsModule,
    CollaborationHubModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const config = configService.get<{
          secret?: string;
          accessTokenExpiry?: string;
          issuer?: string;
          audience?: string;
        }>('jwt');
        return {
          secret: config?.secret,
          signOptions: {
            expiresIn: config?.accessTokenExpiry as StringValue | undefined,
            issuer: config?.issuer,
            audience: config?.audience,
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [
    EmergencyOsController,
    EdCopilotNestParityController,
    EmergencyRealtimeController,
    ERPulseHandoverController,
    FederatedEMSController,
    LMECSController,
    AICallInterrogationController,
    OrganizationalDigitalTwinController,
  ],
  providers: [
    EmergencyRealtimeService,
    JwtQueryAuthGuard,
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
    PatientDocumentArtifactService,
    OcrIntakeService,
    ClinicalDecisionSupportService,
    EmergencyPatientAuditService,
    PatientFlowService,
    AdministrativeAutomationQueueService,
    WorkflowOrchestrationService,
    EmergencyOperatingSurfacesService,
    EmergencyReferenceDataSeedService,
  ],
  exports: [EmergencyPatientService, ReferralService, EMSIntakeService],
})
export class EmergencyOsModule {}
