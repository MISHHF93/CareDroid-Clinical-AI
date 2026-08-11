import {
  Body,
  Controller,
  Get,
  Logger,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { TenantContext } from '../tenant-context/tenant-context.decorator';
import type { TenantContext as TenantContextValue } from '../tenant-context/tenant-context.types';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { HUMAN_REVIEW_DISCLAIMER } from '../../../../lib/ai/safetyPolicy';
import {
  FederatedLearningService,
  HybridDigitalTwinService,
  RealTimeSimulationService,
} from './emergency-os.advanced-services';
import { EmergencyOsUpgradeHarnessService } from './emergency-os.upgrade-harness.service';
import { OperationalIntelligenceService } from './emergency-os.operational-intelligence.service';
import { PatientOrchestrationService } from './emergency-os.orchestration.service';
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
  type SmartIntakeCreateInput,
  WorkflowActionLogService,
} from './emergency-os.services';
import { PatientDocumentArtifactService } from './patient-document-artifact.service';
import { ClinicalDecisionSupportService } from './clinical-decision-support.service';
import { EmergencyPatientAuditService } from './emergency-patient-audit.service';
import { PatientFlowService } from './emergency-os.patient-flow.service';
import { WorkflowOrchestrationService } from './emergency-os.workflow-orchestration.service';
import {
  EmergencyOperatingSurfacesService,
  type OperatingSurfaceId,
} from './emergency-os.operating-surfaces.service';
import { EntitlementService } from '../platform-assets/entitlement.service';
import { assertEntitlementLaunchFromRequest } from '../platform-assets/entitlement-launch.util';
import type { RecordClinicalCalculatorDto } from './clinical-decision-support.types';
import { EmergencyOsSettingsPatchDto } from './dto/emergency-os-settings-patch.dto';
import { OcrIntakeService } from './ocr-intake.service';
import { ChatService } from '../chat/chat.service';
import {
  EvaluateOperationalIntelligenceDto,
  ExtractDocumentArtifactsDto,
  PatientDocumentArtifactReviewDto,
  CreateOcrJobDto,
  OcrFieldReviewDto,
  ApplyOcrJobToIntakeDto,
  PostEmsHandoffDto,
  PatchEmergencyPatientDto,
  AssignPatientStaffDto,
  EscalatePatientDto,
  PatchEmsArrivalStatusDto,
  PostWaitingRoomEscalationNotifyDto,
  PostReceptionEscalationDto,
  PostReceptionHandoffDto,
  PostTriageAssistDto,
  ReviewWorkflowAutomationDto,
  CreateReferralDto,
  UpdateReferralStatusDto,
  QueryCopilotDto,
  RecordClinicalCalculatorResultDto,
  RecordCopilotInteractionDto,
  UpdateLiveSimulationDto,
  EvaluateSimulationDto,
  CompareSimulationDto,
  RegisterFederatedHospitalDto,
  UpdateFederatedModelDto,
  InitializeDigitalTwinDto,
  SimulateDigitalTwinDto,
  EvaluateDigitalTwinScenarioDto,
} from './dto/emergency-os-actions.dto';

@ApiTags('emergency')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), AuthorizationGuard)
@Controller('emergency')
export class EmergencyOsController {
  private readonly logger = new Logger(EmergencyOsController.name);

  constructor(
    private readonly whiteboardService: EmergencyWhiteboardService,
    private readonly patientService: EmergencyPatientService,
    private readonly journeyService: PatientJourneyService,
    private readonly emsIntakeService: EMSIntakeService,
    private readonly smartIntakeService: SmartIntakeService,
    private readonly queueService: QueueIntelligenceService,
    private readonly reassessmentService: ReassessmentService,
    private readonly capacityService: CapacityService,
    private readonly boardingService: BoardingService,
    private readonly referralService: ReferralService,
    private readonly provincialHealthService: ProvincialHealthService,
    private readonly integrationHubService: IntegrationHubService,
    private readonly copilotService: EDCopilotService,
    private readonly analyticsService: EmergencyAnalyticsService,
    private readonly settingsService: EmergencySettingsService,
    private readonly workflowActionLogService: WorkflowActionLogService,
    private readonly implementationReadinessService: CompleteImplementationReadinessService,
    private readonly realTimeSimulationService: RealTimeSimulationService,
    private readonly federatedLearningService: FederatedLearningService,
    private readonly hybridDigitalTwinService: HybridDigitalTwinService,
    private readonly upgradeHarnessService: EmergencyOsUpgradeHarnessService,
    private readonly centralNodeService: CareDroidCentralNodeService,
    private readonly operationalIntelligenceService: OperationalIntelligenceService,
    private readonly receptionWorkspaceService: ReceptionWorkspaceService,
    private readonly orchestrationService: PatientOrchestrationService,
    private readonly documentArtifactService: PatientDocumentArtifactService,
    private readonly clinicalDecisionSupportService: ClinicalDecisionSupportService,
    private readonly patientAuditService: EmergencyPatientAuditService,
    private readonly patientFlowService: PatientFlowService,
    private readonly workflowOrchestrationService: WorkflowOrchestrationService,
    private readonly operatingSurfacesService: EmergencyOperatingSurfacesService,
    private readonly entitlementService: EntitlementService,
    private readonly ocrIntakeService: OcrIntakeService,
    private readonly chatService: ChatService,
  ) {}

  @RequirePermission(Permission.READ_PHI)
  @Get('whiteboard')
  getWhiteboard() {
    return this.whiteboardService.getWhiteboard();
  }

  @RequirePermission(Permission.READ_PHI)
  @Get('central-node/snapshot')
  getCentralNodeSnapshot() {
    return this.centralNodeService.getSnapshot();
  }

  @RequirePermission(Permission.VIEW_OBSERVABILITY)
  @Get('operational-intelligence/snapshot')
  getOperationalIntelligenceSnapshot() {
    return this.operationalIntelligenceService.getSnapshotEnvelope();
  }

  @RequirePermission(Permission.VIEW_OBSERVABILITY)
  @Get('operational-intelligence/model-health')
  getOperationalIntelligenceModelHealth() {
    return this.operationalIntelligenceService.getModelHealthEnvelope();
  }

  @RequirePermission(Permission.VIEW_OBSERVABILITY)
  @Get('operational-intelligence/alerts')
  getOperationalIntelligenceAlerts() {
    return this.operationalIntelligenceService.getAlertsEnvelope();
  }

  @RequirePermission(Permission.VIEW_OBSERVABILITY)
  @Post('operational-intelligence/evaluate')
  evaluateOperationalIntelligence(@Body() body: EvaluateOperationalIntelligenceDto) {
    const events = Array.isArray(body?.events) ? body.events : [];
    return this.operationalIntelligenceService.evaluate(
      events as import('./emergency-os.types').OperationalInputEvent[],
    );
  }

  @RequirePermission(Permission.READ_PHI)
  @Get('patients')
  getPatients() {
    return this.patientService.getPatientEnvelope();
  }

  @RequirePermission(Permission.WRITE_PHI)
  @Post('patients')
  createPatient(@Body() dto: SmartIntakeCreateInput) {
    return this.smartIntakeService.createFromIntake(dto);
  }

  /** Durable patient state-transition/field persistence -- see MB-P0-6:
   * the frontend journey state machine (movePatientToState etc.) was
   * client-memory-only with no route to reach this, even though
   * EmergencyPatientService.updatePatient already persists + broadcasts. */
  @RequirePermission(Permission.WRITE_PHI)
  @Patch('patients/:patientId')
  patchPatient(
    @Param('patientId') patientId: string,
    @Body() body: PatchEmergencyPatientDto,
  ) {
    // staffId/note are accepted for future audit-trail use but are not
    // EmergencyPatient fields -- only forward the real patient field(s).
    const patch: Partial<import('./emergency-os.types').EmergencyPatient> = {};
    if (body.state) patch.state = body.state;
    // addVitals (MB-P0-6 follow-up): vitals/flags are the RESULT of the
    // frontend's own vitals-recording pipeline (NEWS2 scoring, alert
    // generation, reassessment-completion flag clearing) -- updatePatient
    // already normalizes both, no new backend logic needed.
    if (body.vitals) patch.vitals = body.vitals as import('./emergency-os.types').EmergencyVitals[];
    if (body.flags) patch.flags = body.flags as string[];
    try {
      return this.patientService.updatePatient(patientId, patch);
    } catch (error) {
      // updatePatient throws a plain Error for an unknown id (shared with 2
      // other internal callers, left untouched) -- translate it to a real
      // 404 at this HTTP boundary instead of NestJS's default 500, so a
      // caller can tell "you don't have permission" / "transient failure"
      // apart from "this patient id doesn't exist on the backend at all".
      if (error instanceof Error && /not found/i.test(error.message)) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }

  /** Durable staff-assignment persistence -- see MB-P0-6 follow-up: like
   * movePatientToState/dischargePatient before HEAL-089, the frontend's
   * assignStaff store action was client-memory-only with no route to reach
   * EmergencyPatientService.assignStaffToPatient, which already persists,
   * records a real staff_assigned workflow-log entry, and broadcasts. */
  @RequirePermission(Permission.WRITE_PHI)
  @Patch('patients/:patientId/staff')
  assignPatientStaff(
    @Param('patientId') patientId: string,
    @Body() body: AssignPatientStaffDto,
  ) {
    try {
      return this.patientService.assignStaffToPatient(
        patientId,
        body.staffId,
        body.actorStaffId,
      );
    } catch (error) {
      if (error instanceof Error && /not found/i.test(error.message)) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }

  /** Durable manual-escalation persistence -- see MB-P0-6 follow-up: same
   * gap shape as assignStaff. EmergencyPatientService.escalatePatient
   * already persists, dispatches a real Critical operational alert, records
   * a patient_escalated workflow-log entry, and broadcasts -- its only
   * caller was internal (administrative automation), so a human pressing
   * "Escalate" in the UI never reached it. */
  @RequirePermission(Permission.WRITE_PHI)
  @Patch('patients/:patientId/escalate')
  escalatePatient(
    @Param('patientId') patientId: string,
    @Body() body: EscalatePatientDto,
  ) {
    try {
      return this.patientService.escalatePatient(patientId, body.actorStaffId);
    } catch (error) {
      if (error instanceof Error && /not found/i.test(error.message)) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }

  @RequirePermission(Permission.READ_PHI)
  @Get('journey')
  getJourney() {
    return this.journeyService.getJourney();
  }

  @RequirePermission(Permission.READ_PHI)
  @Get('workflow-logs')
  getWorkflowLogs() {
    return this.workflowActionLogService.getEnvelope();
  }

  @RequirePermission(Permission.VIEW_OPERATIONS)
  @Get('implementation-readiness')
  getImplementationReadiness() {
    return this.implementationReadinessService.getReadiness();
  }

  @RequirePermission(Permission.READ_PHI)
  @Get('patients/:patientId/workflow-logs')
  async getPatientWorkflowLogs(
    @Param('patientId') patientId: string,
    @TenantContext() tenantContext: TenantContextValue | undefined,
    @Req() request: Request,
  ) {
    await this.patientAuditService.logPatientAccess({
      request,
      tenantContext,
      patientId,
      resource: `emergency/patients/${patientId}/workflow-logs`,
    });
    return this.workflowActionLogService.getEnvelope(patientId);
  }

  @RequirePermission(Permission.READ_PHI)
  @Get('patients/:patientId/document-artifacts')
  async getPatientDocumentArtifacts(
    @Param('patientId') patientId: string,
    @TenantContext() tenantContext: TenantContextValue | undefined,
    @Req() request: Request,
  ) {
    await this.patientAuditService.logPatientAccess({
      request,
      tenantContext,
      patientId,
      resource: `emergency/patients/${patientId}/document-artifacts`,
    });
    return this.documentArtifactService.getEnvelope(patientId);
  }

  @RequirePermission(Permission.WRITE_PHI)
  @Post('patients/:patientId/document-artifacts/extract')
  async extractPatientDocumentArtifacts(
    @Param('patientId') patientId: string,
    @Body() body: ExtractDocumentArtifactsDto,
    @TenantContext() tenantContext: TenantContextValue | undefined,
    @Req() request: Request,
  ) {
    await this.patientAuditService.logPatientAccess({
      request,
      tenantContext,
      patientId,
      resource: `emergency/patients/${patientId}/document-artifacts/extract`,
    });
    return this.documentArtifactService.extract(patientId, { ...body, patientId });
  }

  @RequirePermission(Permission.WRITE_PHI)
  @Patch('patients/:patientId/document-artifacts/:artifactId/review')
  async reviewPatientDocumentArtifact(
    @Param('patientId') patientId: string,
    @Param('artifactId') artifactId: string,
    @Body() body: PatientDocumentArtifactReviewDto,
    @TenantContext() tenantContext: TenantContextValue | undefined,
    @Req() request: Request,
  ) {
    await this.patientAuditService.logPatientAccess({
      request,
      tenantContext,
      patientId,
      resource: `emergency/patients/${patientId}/document-artifacts/${artifactId}/review`,
    });
    return this.documentArtifactService.review(patientId, artifactId, {
      ...body,
      artifactId,
    });
  }

  @RequirePermission(Permission.WRITE_PHI)
  @Post('intake/ocr-jobs')
  createOcrJob(@Body() body: CreateOcrJobDto) {
    return this.ocrIntakeService.createJob(body);
  }

  @RequirePermission(Permission.READ_PHI)
  @Get('intake/ocr-jobs')
  listOcrJobs(
    @Query('patientId') patientId?: string,
    @Query('intakeSessionId') intakeSessionId?: string,
  ) {
    return { jobs: this.ocrIntakeService.listJobs({ patientId, intakeSessionId }) };
  }

  @RequirePermission(Permission.READ_PHI)
  @Get('intake/ocr-health')
  getOcrIntakeHealth() {
    return this.ocrIntakeService.getHealth();
  }

  @RequirePermission(Permission.READ_PHI)
  @Get('intake/ocr-jobs/:jobId')
  async getOcrJob(
    @Param('jobId') jobId: string,
    @TenantContext() tenantContext: TenantContextValue | undefined,
    @Req() request: Request,
  ) {
    const job = this.ocrIntakeService.getJob(jobId);
    if (job.patientId) {
      await this.patientAuditService.logPatientAccess({
        request,
        tenantContext,
        patientId: job.patientId,
        resource: `emergency/intake/ocr-jobs/${jobId}`,
      });
    }
    return job;
  }

  @RequirePermission(Permission.WRITE_PHI)
  @Post('intake/ocr-jobs/:jobId/fields/:field/review')
  reviewOcrJobField(
    @Param('jobId') jobId: string,
    @Param('field') field: string,
    @Body() body: OcrFieldReviewDto,
  ) {
    return this.ocrIntakeService.reviewField(jobId, field, body);
  }

  @RequirePermission(Permission.WRITE_PHI)
  @Post('intake/ocr-jobs/:jobId/apply')
  applyOcrJobToIntake(@Param('jobId') jobId: string, @Body() body: ApplyOcrJobToIntakeDto) {
    return this.ocrIntakeService.applyToIntake(jobId, body?.actor || 'unknown', {
      autoAcceptHighConfidence: body?.autoAcceptHighConfidence,
    });
  }

  @RequirePermission(Permission.READ_PHI)
  @Get('patients/:patientId/orchestration')
  async getPatientOrchestration(
    @Param('patientId') patientId: string,
    @Query('role') roleQuery?: string,
    @TenantContext() tenantContext?: TenantContextValue,
    @Req() request?: Request,
  ) {
    await this.patientAuditService.logPatientAccess({
      request,
      tenantContext,
      patientId,
      resource: `emergency/patients/${patientId}/orchestration`,
    });
    const allowedRoles = new Set([
      'registration_clerk',
      'triage_nurse',
      'physician',
      'charge_nurse',
      'ed_manager',
      'ems_user',
      'admin',
    ]);
    const role = (
      allowedRoles.has(String(roleQuery || '')) ? roleQuery : 'physician'
    ) as import('../../../../lib/patient-orchestration').EmergencyRoleId;
    const orchestration = this.orchestrationService.buildPatientOrchestration(patientId, role);
    return {
      module: 'Patient Card Orchestration',
      generatedAt: orchestration.generatedAt,
      source: 'backend-fixture',
      status: 'active',
      data: {
        ok: true,
        patientId,
        orchestration,
      },
      remainingGaps: [],
    };
  }

  @RequirePermission(Permission.READ_PHI)
  @Get('ems')
  getEMS() {
    return this.emsIntakeService.getEMSIntake();
  }

  @RequirePermission(Permission.WRITE_PHI)
  @Post('ems/handoff')
  postEmsHandoff(@Body() body: PostEmsHandoffDto) {
    return this.emsIntakeService.completeHandoff(body);
  }

  /** Durable EMS arrival status transitions (arrived / handoff-started) -- see
   * EMSIntakeService.updateArrivalStatus's own doc comment for why this exists. */
  @RequirePermission(Permission.WRITE_PHI)
  @Patch('ems/arrivals/:arrivalId/status')
  patchEmsArrivalStatus(
    @Param('arrivalId') arrivalId: string,
    @Body() body: PatchEmsArrivalStatusDto,
  ) {
    return this.emsIntakeService.updateArrivalStatus(arrivalId, { ...body });
  }

  @RequirePermission(Permission.READ_PHI)
  @Get('reception/snapshot')
  getReceptionSnapshot() {
    return this.receptionWorkspaceService.getSnapshot();
  }

  @RequirePermission(Permission.WRITE_PHI)
  @Post('reception/escalation')
  postReceptionEscalation(@Body() body: PostReceptionEscalationDto) {
    return this.receptionWorkspaceService.raiseEscalation(body || {});
  }

  @RequirePermission(Permission.WRITE_PHI)
  @Post('reception/handoff')
  async postReceptionHandoff(@Body() body: PostReceptionHandoffDto) {
    let triageAssist = body.triageAssist as Awaited<
      ReturnType<PatientOrchestrationService['buildTriageAssist']>
    > | null;
    if (!triageAssist && body.patientId) {
      try {
        triageAssist = await this.orchestrationService.buildTriageAssist(body.patientId, body);
      } catch (error) {
        // D9: keep deliberate fallback, but surface the degradation for ops.
        this.logger.warn(
          `buildTriageAssist failed during reception handoff for patient ${body.patientId}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        triageAssist = null;
      }
    }
    return this.receptionWorkspaceService.completeHandoff({
      ...body,
      triageAssist: triageAssist || undefined,
      triageAssistGeneratedAt: triageAssist?.generatedAt,
    });
  }

  @RequirePermission(Permission.WRITE_PHI)
  @Post('triage/assist')
  async postTriageAssist(@Body() body: PostTriageAssistDto) {
    const patientId = String(body.patientId || '').trim();
    if (!patientId) {
      return {
        module: 'Triage Assist',
        generatedAt: new Date().toISOString(),
        source: 'backend-fixture',
        status: 'placeholder',
        data: { ok: false, error: 'patientId is required' },
        remainingGaps: [],
      };
    }
    const triageAssist = await this.orchestrationService.buildTriageAssist(patientId, body);
    return {
      module: 'Triage Assist',
      generatedAt: new Date().toISOString(),
      source: 'backend-fixture',
      status: 'active',
      data: {
        ok: true,
        patientId,
        triageAssist,
        triageAssistGeneratedAt: triageAssist.generatedAt,
      },
      remainingGaps: [],
    };
  }

  @RequirePermission(Permission.READ_PHI)
  @Get('intake')
  getIntake() {
    return this.smartIntakeService.getSmartIntake();
  }

  @RequirePermission(Permission.WRITE_PHI)
  @Post('intake')
  createIntakePatient(@Body() dto: SmartIntakeCreateInput) {
    return this.smartIntakeService.createFromIntake(dto);
  }

  @RequirePermission(Permission.WRITE_PHI)
  @Post('intake/vertical-slice')
  createSmartIntakeVerticalSlice(
    @Body()
    dto: SmartIntakeCreateInput & { patient?: SmartIntakeCreateInput; staffId?: string },
  ) {
    const slice = this.smartIntakeService.createVerticalSlice({
      ...(dto.patient || dto),
      confirmDuplicateOverride:
        dto.patient?.confirmDuplicateOverride ?? dto.confirmDuplicateOverride,
      staffId: dto.staffId,
    });
    const whiteboard = this.whiteboardService.getWhiteboard().data;
    const queueMetrics = this.queueService.getQueues().data;
    const reassessment = this.reassessmentService.getReassessmentQueue().data;
    const capacity = this.capacityService.getCapacity().data;

    return {
      module: 'Smart Intake Vertical Slice',
      generatedAt: new Date().toISOString(),
      source: 'backend-fixture',
      status: 'active',
      data: {
        ...slice,
        whiteboard,
        queueMetrics,
        reassessment,
        capacity,
        validation: {
          patientCreated: whiteboard.patients.some((patient) => patient.id === slice.patient.id),
          encounterCreated: slice.encounter.patientId === slice.patient.id,
          movedToArrival: slice.transitions.some((event) => event.to === 'Arrival'),
          movedToTriage: slice.patient.state === 'Triage',
          visibleOnWhiteboard: whiteboard.patients.some(
            (patient) => patient.id === slice.patient.id,
          ),
          visibleInQueueMetrics: queueMetrics.queues.some((queue) =>
            queue.patients.some((patient) => patient.id === slice.patient.id),
          ),
          reassessmentTriggered: slice.reassessmentTriggered,
          visibleInReassessment: reassessment.patients.some(
            (patient) => patient.id === slice.patient.id,
          ),
          capacityUpdated: Boolean(capacity.capacity.updatedAt),
        },
      },
    };
  }

  @RequirePermission(Permission.READ_PHI)
  @Get('queues')
  getQueues() {
    return this.queueService.getQueues();
  }

  @RequirePermission(Permission.READ_PHI)
  @Get('reassessment')
  getReassessment() {
    return this.reassessmentService.getReassessmentQueue();
  }

  /** Real out-of-band notification for the waiting-room-safety escalation transition --
   * see ReassessmentService.notifyWaitingRoomEscalation's own doc comment for why this
   * exists and which mechanism it actually extends. */
  @RequirePermission(Permission.WRITE_PHI)
  @Post('waiting-room-safety/escalation-notify')
  postWaitingRoomEscalationNotify(@Body() body: PostWaitingRoomEscalationNotifyDto) {
    return this.reassessmentService.notifyWaitingRoomEscalation(body);
  }

  @RequirePermission(Permission.READ_PHI)
  @Get('operating-surfaces/:surfaceId')
  getOperatingSurface(
    @Param('surfaceId') surfaceId: OperatingSurfaceId,
    @TenantContext() tenantContext?: TenantContextValue,
  ) {
    return this.operatingSurfacesService.getSurface(surfaceId, tenantContext);
  }

  @RequirePermission(Permission.READ_PHI)
  @Get('workflow-orchestration')
  getWorkflowOrchestration(@TenantContext() tenantContext?: TenantContextValue) {
    return this.workflowOrchestrationService.getWorkflowOrchestration(tenantContext);
  }

  @RequirePermission(Permission.WRITE_PHI)
  @Post('workflow-orchestration/review')
  reviewWorkflowAutomation(
    @Body() body: ReviewWorkflowAutomationDto,
    @TenantContext() tenantContext?: TenantContextValue,
  ) {
    return this.workflowOrchestrationService.reviewTask(body, tenantContext);
  }

  @RequirePermission(Permission.READ_PHI)
  @Get('patient-flow')
  getPatientFlow() {
    return this.patientFlowService.getPatientFlow();
  }

  @RequirePermission(Permission.READ_PHI)
  @Get('patient-flow/:patientId')
  getPatientFlowForPatient(@Param('patientId') patientId: string) {
    return this.patientFlowService.getPatientFlow(patientId);
  }

  @RequirePermission(Permission.READ_PHI)
  @Get('capacity')
  getCapacity() {
    return this.capacityService.getCapacity();
  }

  @RequirePermission(Permission.READ_PHI)
  @Get('boarding')
  getBoarding() {
    return this.boardingService.getBoarding();
  }

  @RequirePermission(Permission.READ_PHI)
  @Get('referrals')
  getReferrals() {
    return this.referralService.getReferrals();
  }

  @RequirePermission(Permission.WRITE_PHI)
  @Post('referrals')
  createReferral(@Body() dto: CreateReferralDto) {
    return this.referralService.createReferral({ ...dto });
  }

  /** ReferralPanel.tsx's updateEmergencyTransferWorkflow() has called this
   * exact path (via emergencyTransportApi.ts) since before this route
   * existed on the backend -- found 2026-08-06, the frontend was silently
   * 404ing and falling back to "live sync is pending" every time. Mounted
   * under /emergency/transfers (not /emergency/referrals) to match the real
   * caller's URL exactly, not the sibling GET/POST referrals routes' prefix. */
  @RequirePermission(Permission.WRITE_PHI)
  @Patch('transfers/:id/status')
  updateTransferStatus(@Param('id') id: string, @Body() dto: UpdateReferralStatusDto) {
    return this.referralService.updateReferralStatus(id, dto.status);
  }

  @RequirePermission(Permission.READ_PHI)
  @Get('provincial-health')
  getProvincialHealth() {
    return this.provincialHealthService.getProvincialHealth();
  }

  @RequirePermission(Permission.VIEW_INTEGRATIONS)
  @Get('integrations')
  getIntegrations() {
    return this.integrationHubService.getIntegrationHub();
  }

  @RequirePermission(Permission.USE_AI_CHAT)
  @Get('copilot')
  async getCopilot(@Req() request?: Request, @TenantContext() tenantContext?: TenantContextValue) {
    await assertEntitlementLaunchFromRequest(
      this.entitlementService,
      { user: (request as any)?.user, tenantContext },
      'agent-clinical',
    );
    return this.copilotService.getCopilotContext();
  }

  // Converged 2026-08-08: this endpoint previously called EDCopilotService.processQuery(),
  // a keyword-if/else matcher with zero LLM invocation (chest-pain/sepsis/stroke
  // guidance was hardcoded canned text presented as if the assistant reasoned about
  // it). A repository-wide call-graph trace found this route has zero real frontend
  // callers -- so this change cannot break real traffic -- but the entitlement
  // check, patient-audit logging, and governance review-item creation below ARE
  // real and worth keeping stable for any future caller. Now delegates to
  // ChatService.processMessage(), the same canonical orchestration pipeline the
  // live copilot chat UI (CopilotPanel.tsx) actually uses, instead of a second,
  // fake-AI runtime. See AI_ORCHESTRATION_AUDIT.md and the priority-change
  // safety-floor fix in chat.service.ts's handleEdCopilotPriorityChange().
  @RequirePermission(Permission.USE_AI_CHAT)
  @Post('copilot/query')
  async queryCopilot(
    @Body() dto: QueryCopilotDto,
    @TenantContext() tenantContext?: TenantContextValue,
    @Req() request?: Request,
  ) {
    await assertEntitlementLaunchFromRequest(
      this.entitlementService,
      { user: (request as any)?.user, tenantContext },
      'agent-clinical',
    );
    const query = String(dto?.query || '');
    const context = (dto?.context || {}) as Record<string, unknown>;
    const explicitPatientId = typeof context.patientId === 'string' ? context.patientId : undefined;
    const edCopilotContext = this.buildEdCopilotOperationalContext(query, explicitPatientId);
    const patientId = explicitPatientId || edCopilotContext.selectedPatientId;
    const chatResponse = await this.chatService.processMessage(
      query,
      undefined,
      'ed-copilot',
      undefined,
      (request as any)?.user?.id,
      dto?.user_role,
      undefined,
      { edCopilot: { enabled: true, ...edCopilotContext, ...context, patientId } },
    );
    const requiresReview = chatResponse.metadata?.safety?.requiresHumanReview ?? true;
    const responseText = chatResponse.text || '';
    const edCopilotData = (chatResponse.metadata?.edCopilot || {}) as Record<string, unknown>;
    const safetyCheckPassed =
      typeof edCopilotData.safetyCheckPassed === 'boolean'
        ? edCopilotData.safetyCheckPassed
        : undefined;
    // Best-effort legacy-envelope compatibility for this route's pre-existing
    // response contract (there are no real consumers to break, confirmed by
    // whole-repo grep, but keeping the shape stable costs nothing and protects
    // any future integration or test written against it).
    const response = {
      module: 'ED Copilot Query',
      generatedAt: new Date().toISOString(),
      source: 'chat-service',
      status: 'active',
      data: {
        id: `copilot-query-${Date.now()}`,
        query,
        response: responseText,
        answer: responseText,
        message: responseText,
        data: edCopilotData,
        requires_review: requiresReview,
        safetyStatus: requiresReview ? 'review-required' : 'safe',
        safety_check_passed: safetyCheckPassed,
        safetyNotice: HUMAN_REVIEW_DISCLAIMER,
        provenance: chatResponse.metadata?.provenance,
        userRole: dto?.user_role || 'unknown',
        createdAt: new Date().toISOString(),
      },
      remainingGaps: [] as string[],
    };
    this.workflowActionLogService.record({
      type: 'copilot_used',
      title: 'Copilot query processed',
      summary: query || 'Empty Copilot query received.',
      source: 'ed-copilot-query',
      metadata: {
        userRole: dto?.user_role || 'unknown',
        requiresReview,
        safetyCheckPassed: safetyCheckPassed ?? null,
      },
    });
    if (patientId) {
      await this.patientAuditService.logPatientAccess({
        request,
        tenantContext,
        patientId,
        resource: `emergency/copilot/query`,
      });
    }
    const data = response.data;
    this.clinicalDecisionSupportService.recordCopilotInteraction(
      {
        question: query,
        patientId,
        userRole: dto?.user_role,
        patientContextSummary: typeof context.summary === 'string' ? context.summary : undefined,
        draftGuidance: String(data?.response || ''),
        requiresHumanReview: Boolean(data?.requires_review),
      },
      {
        tenantId: tenantContext?.organizationId,
        userId: tenantContext?.userId,
      },
    );
    return response;
  }

  /**
   * Builds real ED-operational context (patients, capacity, reassessment
   * queue, and -- when the query names a patient -- verified patient-safety
   * context) from this controller's already-injected services, so the
   * canonical ChatService.handleEdCopilotCommand() dispatcher this route
   * delegates to can answer deterministically instead of always falling
   * through to the LLM. Mirrors, with real data, the shape
   * handleEdCopilotCommand()/handleEdCopilotPriorityChange() already expect
   * (chat.service.ts) -- this only assembles context, it does not classify
   * intent or generate any response text itself.
   */
  private buildEdCopilotOperationalContext(
    query: string,
    explicitPatientId?: string,
  ): {
    patients: Array<Record<string, unknown>>;
    patientCount: number;
    flaggedReassessments: Array<Record<string, unknown>>;
    capacitySnapshot: Record<string, unknown>;
    selectedPatientId?: string;
    patientArtifactContext?: Record<string, unknown>;
  } {
    const patients = this.patientService.listPatients();
    const capacity = this.patientService.computeCapacity();

    const mappedPatients = patients.map((patient) => ({
      id: patient.id,
      name: `${patient.firstName} ${patient.lastName}`,
      location: patient.roomId || patient.state,
      state: patient.state,
      complaint: patient.chiefComplaint,
      priority: patient.priority,
      waitMinutes: Math.max(
        0,
        Math.round((Date.now() - new Date(patient.arrivalTime).getTime()) / 60000),
      ),
    }));

    const flaggedReassessments = patients
      .filter((patient) => patient.flags.includes('ReassessmentDue'))
      .map((patient) => ({
        patientId: patient.id,
        patientName: `${patient.firstName} ${patient.lastName}`,
        reasons: ['Reassessment due'],
      }));

    const capacitySnapshot = {
      score: capacity.score,
      band: capacity.band,
      currentOccupancy: capacity.occupiedRooms,
      maxCapacity: capacity.totalRooms,
      occupancyPercent: capacity.occupancyPercent,
      boardingCount: capacity.boardingCount,
      reassessmentQueueLength: capacity.reassessmentDue,
    };

    const patientMatch = query.match(/patient\s+([A-Za-z0-9_-]+)/i);
    const referencedPatientId = explicitPatientId || patientMatch?.[1];
    const targetPatient = referencedPatientId
      ? patients.find((patient) => patient.id === referencedPatientId)
      : undefined;
    const latestVitals =
      targetPatient && Array.isArray(targetPatient.vitals)
        ? targetPatient.vitals.at(-1)
        : undefined;

    return {
      patients: mappedPatients,
      patientCount: patients.length,
      flaggedReassessments,
      capacitySnapshot,
      selectedPatientId: targetPatient?.id,
      patientArtifactContext: targetPatient
        ? {
            patientId: targetPatient.id,
            name: `${targetPatient.firstName} ${targetPatient.lastName}`,
            chiefComplaint: targetPatient.chiefComplaint,
            flags: targetPatient.flags,
            priority: targetPatient.priority,
            vitals: latestVitals
              ? {
                  hr: latestVitals.hr,
                  rr: latestVitals.rr,
                  spo2: latestVitals.spo2,
                  sbp: latestVitals.sbp,
                  dbp: latestVitals.dbp,
                  temp: latestVitals.temp,
                }
              : {},
          }
        : undefined,
    };
  }

  @RequirePermission(Permission.USE_CALCULATORS)
  @Post('clinical-calculators/results')
  recordClinicalCalculatorResult(
    @Body() dto: RecordClinicalCalculatorResultDto,
    @TenantContext() tenantContext?: TenantContextValue,
  ) {
    return this.clinicalDecisionSupportService.recordCalculatorResult(dto, {
      tenantId: tenantContext?.organizationId,
      userId: tenantContext?.userId,
    });
  }

  @RequirePermission(Permission.USE_CALCULATORS)
  @Get('clinical-calculators/results')
  listClinicalCalculatorResults(
    @Query('patientId') patientId?: string,
    @Query('calculatorId') calculatorId?: string,
  ) {
    return this.clinicalDecisionSupportService.listCalculatorResults({
      patientId,
      calculatorId: calculatorId as RecordClinicalCalculatorDto['calculatorId'] | undefined,
    });
  }

  @RequirePermission(Permission.USE_AI_CHAT)
  @Get('copilot/interactions')
  listCopilotInteractions(@Query('patientId') patientId?: string) {
    return this.clinicalDecisionSupportService.listCopilotInteractions({ patientId });
  }

  @RequirePermission(Permission.USE_AI_CHAT)
  @Post('copilot/interactions')
  recordCopilotInteraction(
    @Body() dto: RecordCopilotInteractionDto,
    @TenantContext() tenantContext?: TenantContextValue,
  ) {
    return this.clinicalDecisionSupportService.recordCopilotInteraction(dto, {
      tenantId: tenantContext?.organizationId,
      userId: tenantContext?.userId,
    });
  }

  @RequirePermission(Permission.VIEW_ANALYTICS)
  @Get('analytics')
  getAnalytics() {
    return this.analyticsService.getAnalytics();
  }

  @RequirePermission(Permission.READ_PHI)
  @Get('upgrade-harness')
  getUpgradeHarness() {
    return this.upgradeHarnessService.getHarness();
  }

  @RequirePermission(Permission.READ_PHI)
  @Get('upgrade-harness/capacity')
  getUpgradeHarnessCapacity() {
    return this.upgradeHarnessService.getCapacityAndForecasting();
  }

  @RequirePermission(Permission.READ_PHI)
  @Get('upgrade-harness/patient-flow')
  getUpgradeHarnessPatientFlow() {
    return this.upgradeHarnessService.getPatientFlow();
  }

  @RequirePermission(Permission.READ_PHI)
  @Get('upgrade-harness/patient-flow/:patientId')
  getUpgradeHarnessPatientFlowForPatient(@Param('patientId') patientId: string) {
    return this.upgradeHarnessService.getPatientFlow(patientId);
  }

  @RequirePermission(Permission.READ_PHI)
  @Get('upgrade-harness/clinical-intelligence')
  getUpgradeHarnessClinicalIntelligence() {
    return this.upgradeHarnessService.getClinicalDecisionSupport();
  }

  @RequirePermission(Permission.READ_PHI)
  @Get('upgrade-harness/clinical-intelligence/:patientId')
  getUpgradeHarnessClinicalIntelligenceForPatient(@Param('patientId') patientId: string) {
    return this.upgradeHarnessService.getClinicalDecisionSupport(patientId);
  }

  @RequirePermission(Permission.READ_PHI)
  @Get('upgrade-harness/audit-summary')
  getUpgradeHarnessAuditSummary() {
    return this.upgradeHarnessService.getAuditSummary();
  }

  @RequirePermission(Permission.CONFIGURE_SYSTEM)
  @Get('settings')
  getSettings(@TenantContext() tenantContext?: TenantContextValue) {
    return this.settingsService.getSettings(tenantContext?.organizationId);
  }

  @RequirePermission(Permission.CONFIGURE_SYSTEM)
  @Patch('settings')
  updateSettings(
    @Body() dto: EmergencyOsSettingsPatchDto,
    @TenantContext() tenantContext?: TenantContextValue,
  ) {
    return this.settingsService.updateSettings({ ...dto }, tenantContext?.organizationId);
  }

  @RequirePermission(Permission.VIEW_ANALYTICS)
  @Post('simulation/update-live')
  updateLiveSimulation(@Body() dto: UpdateLiveSimulationDto): any {
    return this.realTimeSimulationService.updateLiveState(dto);
  }

  @RequirePermission(Permission.VIEW_ANALYTICS)
  @Post('simulation/evaluate')
  evaluateSimulation(@Body() dto: EvaluateSimulationDto): any {
    return this.realTimeSimulationService.evaluateIntervention(dto);
  }

  @RequirePermission(Permission.VIEW_ANALYTICS)
  @Post('simulation/compare')
  compareSimulation(@Body() dto: CompareSimulationDto): any {
    return this.realTimeSimulationService.compareInterventions(dto);
  }

  @RequirePermission(Permission.VIEW_ANALYTICS)
  @Get('simulation/recommendations')
  getSimulationRecommendations(): any {
    return this.realTimeSimulationService.getRecommendations();
  }

  @Post('federated-learning/register')
  registerFederatedHospital(@Body() dto: RegisterFederatedHospitalDto): any {
    return this.federatedLearningService.registerHospital(dto);
  }

  @Post('federated-learning/update')
  updateFederatedModel(@Body() dto: UpdateFederatedModelDto): any {
    return this.federatedLearningService.receiveLocalUpdate(dto);
  }

  @Post('federated-learning/aggregate')
  aggregateFederatedRound(): any {
    return this.federatedLearningService.aggregateRound();
  }

  @Get('federated-learning/global-model/:hospitalId')
  getFederatedGlobalModel(@Param('hospitalId') hospitalId: string): any {
    return this.federatedLearningService.getGlobalModel(hospitalId);
  }

  @Get('federated-learning/dashboard')
  getFederatedDashboard(): any {
    return this.federatedLearningService.getDashboard();
  }

  @Post('digital-twin/initialize')
  initializeDigitalTwin(@Body() dto: InitializeDigitalTwinDto): any {
    return this.hybridDigitalTwinService.initialize(dto);
  }

  @Post('digital-twin/simulate')
  simulateDigitalTwin(@Body() dto: SimulateDigitalTwinDto): any {
    return this.hybridDigitalTwinService.simulate(dto);
  }

  @Get('digital-twin/state')
  getDigitalTwinState(): any {
    return this.hybridDigitalTwinService.getState();
  }

  @Post('digital-twin/scenario')
  evaluateDigitalTwinScenario(@Body() dto: EvaluateDigitalTwinScenarioDto): any {
    return this.hybridDigitalTwinService.evaluateScenario(dto);
  }
}
