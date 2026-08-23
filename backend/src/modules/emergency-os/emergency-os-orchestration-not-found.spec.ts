import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
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
import { ChatService } from '../chat/chat.service';

// HEAL: getPatientOrchestration (GET /emergency/patients/:id/orchestration)
// and postTriageAssist (POST /emergency/triage/assist) both called their
// orchestrationService method directly with no try/catch -- confirmed live
// (physician role, whiteboard patient list, a demo-fixture patient id with
// no backend record): buildPatientOrchestration throws a plain Error for an
// unknown patient id, which NestJS's default filter turns into a bare 500,
// even though 3 sibling methods in this same controller (updatePatient etc.)
// already translate the identical "not found" Error shape into a clean 404.
describe('EmergencyOsController orchestration endpoints translate "not found" to 404', () => {
  let controller: EmergencyOsController;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [EmergencyOsController],
      providers: [
        { provide: ChatService, useValue: { processMessage: jest.fn() } },
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
        PatientOrchestrationService,
        PatientDocumentArtifactService,
        { provide: ConfigService, useValue: { get: jest.fn() } },
        {
          provide: EntitlementService,
          useValue: { assertLaunchAllowed: jest.fn().mockResolvedValue(undefined) },
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

  it('getPatientOrchestration throws NotFoundException, not a bare 500, for an unknown patient id', async () => {
    await expect(controller.getPatientOrchestration('no-such-patient-id')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('postTriageAssist throws NotFoundException, not a bare 500, for an unknown patient id', async () => {
    await expect(
      controller.postTriageAssist({ patientId: 'no-such-patient-id' } as any),
    ).rejects.toThrow(NotFoundException);
  });
});
