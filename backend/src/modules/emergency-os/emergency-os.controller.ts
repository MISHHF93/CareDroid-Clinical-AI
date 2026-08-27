import {
  Body,
  Controller,
  ForbiddenException,
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
  ReconcilePatientIdentityDto,
  RequestEmergencyTransportDto,
  PostWaitingRoomEscalationNotifyDto,
  UpdateStaffDutyStatusDto,
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

/**
 * Emergency roles whose own permission registry (src/config/
 * emergencyRolePermissions.ts) grants BOTH writeVitals and manageFlags.
 * Ported directly from that file's per-role `actions` arrays -- used by
 * patchPatient's field-level check below since backend Permission is only
 * as granular as WRITE_PHI and can't distinguish a state transition from a
 * vitals/flags write on its own.
 */
const EMERGENCY_ROLES_ALLOWED_VITALS_FLAGS_WRITE = new Set([
  'charge_nurse',
  'triage_nurse',
  'physician',
  'admin',
]);

/**
 * Exported standalone so it's directly unit-testable without constructing
 * the full EmergencyOsController (many injected service dependencies, and
 * no existing test in this codebase does that -- see
 * authorization.wrong-role.systematic.spec.ts's own doc comment on why
 * RBAC checks buried inside heavy controllers tend to go unexercised).
 * Throws when a PATCH body writes vitals/flags but the caller's
 * roleProfileId isn't one of the roles actually granted that action.
 */
export function assertCanWriteVitalsOrFlags(
  roleProfileId: string | null | undefined,
  body: { vitals?: unknown; flags?: unknown },
): void {
  if (!body.vitals && !body.flags) return;
  if (!roleProfileId || !EMERGENCY_ROLES_ALLOWED_VITALS_FLAGS_WRITE.has(roleProfileId)) {
    throw new ForbiddenException('This role cannot write vitals or manage patient safety flags.');
  }
}

/**
 * Physician-tier only (see src/config/emergencyRolePermissions.ts's
 * `physician` role definition, plus `admin` as the same superuser override
 * every other role-scoped write check in this controller already grants).
 * Deliberately excludes every other WRITE_PHI-capable role -- charge_nurse,
 * triage_nurse, ems_user, dispatcher, ems_coordinator, registration_clerk --
 * a SIMULATED "Request Emergency Transport" action initiated straight from a
 * patient chart is a physician clinical-decision action, not a general
 * PHI-write action every clinical role should have.
 */
const EMERGENCY_ROLES_ALLOWED_TRANSPORT_REQUEST = new Set(['physician', 'admin']);

/** Exported standalone for the same unit-testability reason as assertCanWriteVitalsOrFlags above. */
export function assertCanRequestEmergencyTransport(roleProfileId: string | null | undefined): void {
  if (!roleProfileId || !EMERGENCY_ROLES_ALLOWED_TRANSPORT_REQUEST.has(roleProfileId)) {
    throw new ForbiddenException(
      'Only physician-tier roles can request emergency transport from a patient chart.',
    );
  }
}

/**
 * Resolving a provisional identity is a demographics-edit action, not a
 * generic PHI write -- so this mirrors the frontend's own patientDemographicsEdit
 * permission grant (src/config/emergencyPermissionRegistry.ts's
 * ROLE_PERMISSION_GRANTS), not assertCanWriteVitalsOrFlags's narrower
 * charge_nurse/triage_nurse/physician/admin set (which excludes
 * registration_clerk -- the role that most often has family/ID information
 * to confirm a walk-in's identity in the first place, and the only role
 * this action's precondition, PatientFlag.IdentityPending, would otherwise
 * be unreachable to besides admin).
 */
const EMERGENCY_ROLES_ALLOWED_IDENTITY_RECONCILE = new Set([
  'admin',
  'charge_nurse',
  'triage_nurse',
  'physician',
  'registration_clerk',
]);

/** Exported standalone for the same unit-testability reason as assertCanWriteVitalsOrFlags above. */
export function assertCanReconcilePatientIdentity(roleProfileId: string | null | undefined): void {
  if (!roleProfileId || !EMERGENCY_ROLES_ALLOWED_IDENTITY_RECONCILE.has(roleProfileId)) {
    throw new ForbiddenException("This role cannot reconcile a patient's provisional identity.");
  }
}

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
  getWhiteboard(@TenantContext() tenantContext?: TenantContextValue) {
    return this.whiteboardService.getWhiteboard(tenantContext?.organizationId);
  }

  @RequirePermission(Permission.VIEW_PUBLIC_DISPLAY)
  @Get('public-waiting-snapshot')
  getPublicWaitingSnapshot(@TenantContext() tenantContext?: TenantContextValue) {
    return this.whiteboardService.getPublicWaitingSnapshot(tenantContext?.organizationId);
  }

  // HEAL-347.91: getSnapshot() previously took no organizationId at all, so this
  // endpoint returned every org's aggregated patient/capacity/EMS counts to any
  // authenticated caller with READ_PHI, regardless of tenant -- found while
  // fixing the same underlying gap in the /emergency/realtime SSE stream, which
  // broadcasts this identical snapshot shape.
  @RequirePermission(Permission.READ_PHI)
  @Get('central-node/snapshot')
  getCentralNodeSnapshot(@TenantContext() tenantContext?: TenantContextValue) {
    return this.centralNodeService.getSnapshot(tenantContext?.organizationId);
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

  // HEAL follow-up (BOLA audit): getPatients() called getPatientEnvelope()
  // with no organizationId at all -- any authenticated caller holding
  // READ_PHI got back every hospital tenant's live patient roster (names,
  // vitals, chief complaints, flags) in one call. No @TenantContext() was
  // even declared on this handler, unlike every other patient-list route in
  // this same file.
  @RequirePermission(Permission.READ_PHI)
  @Get('patients')
  getPatients(@TenantContext() tenantContext?: TenantContextValue) {
    return this.patientService.getPatientEnvelope(tenantContext?.organizationId);
  }

  // HEAL follow-up (BOLA audit): no @TenantContext() at all -- createPatient()
  // (patient service)'s own organizationId fallback (`?? normalized.organizationId`)
  // then took whatever CLIENT-SUPPLIED organizationId was in the request body
  // (SmartIntakeCreateInput is a plain type, not a validated DTO, so nothing
  // stripped it), letting any WRITE_PHI caller create a patient directly
  // inside a different hospital's roster.
  @RequirePermission(Permission.WRITE_PHI)
  @Post('patients')
  createPatient(
    @Body() dto: SmartIntakeCreateInput,
    @TenantContext() tenantContext?: TenantContextValue,
  ) {
    return this.smartIntakeService.createFromIntake(dto, tenantContext?.organizationId);
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
    @TenantContext() tenantContext?: TenantContextValue,
    @Req() request?: Request,
  ) {
    // P0 fix: this endpoint bundled state-transition, vitals, and flags
    // writes behind one coarse WRITE_PHI check, but the frontend's own
    // permission registry (src/config/emergencyRolePermissions.ts) treats
    // writeVitals/manageFlags as separate, more restrictively-granted
    // actions than a plain state transition -- only charge_nurse,
    // triage_nurse, physician, and admin have both. Every other WRITE_PHI
    // role that maps to UserRole.NURSE (registration_clerk, ems_user,
    // dispatcher, ems_coordinator) could still write vitals/manage safety
    // flags (e.g. clear a SepsisAlert/HighRisk flag) via direct API call
    // despite the UI never exposing that control to them. State transitions
    // alone are unaffected -- multiple roles legitimately move patients
    // through the queue (e.g. EMS converting an arrival).
    const roleProfileId =
      (request as unknown as { user?: { profile?: { roleProfileId?: string | null } } })?.user
        ?.profile?.roleProfileId ?? null;
    assertCanWriteVitalsOrFlags(roleProfileId, body);
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
      return this.patientService.updatePatient(patientId, patch, tenantContext?.organizationId);
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
    @TenantContext() tenantContext?: TenantContextValue,
  ) {
    try {
      return this.patientService.assignStaffToPatient(
        patientId,
        body.staffId,
        body.actorStaffId,
        tenantContext?.organizationId,
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
    @TenantContext() tenantContext?: TenantContextValue,
  ) {
    try {
      return this.patientService.escalatePatient(
        patientId,
        body.actorStaffId,
        tenantContext?.organizationId,
      );
    } catch (error) {
      if (error instanceof Error && /not found/i.test(error.message)) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }

  /**
   * Confirms a provisional ("Unknown Patient"/"Temporary Patient"/"Identity
   * Pending") record's real identity once it becomes known -- see
   * EmergencyPatientService.reconcilePatientIdentity's own doc comment for
   * the full design rationale (this LIVE TypeORM path's equivalent of the
   * off-by-default Mongoose/MPI path's SmartIntakeService.reconcileUnknown()).
   * WRITE_PHI is necessary but not sufficient: assertCanReconcilePatientIdentity
   * further restricts this to the same roles the frontend's own
   * patientDemographicsEdit permission grants. The service itself enforces
   * the real precondition (PatientFlag.IdentityPending must already be set)
   * and throws real NotFoundException/ConflictException directly, so no
   * plain-Error-to-404 translation is needed here unlike patchPatient/
   * assignPatientStaff/escalatePatient above.
   *
   * Actor identity is always server-derived from the authenticated session,
   * never trusted from the request body -- matching requestEmergencyTransport
   * above (RequestEmergencyTransportDto's own doc comment states this
   * explicitly). This action rewrites a patient's core identity/MRN, so a
   * client-suppliable actor id would let a compromised or careless frontend
   * misattribute who confirmed a real identity in the audit trail.
   */
  @RequirePermission(Permission.WRITE_PHI)
  @Patch('patients/:patientId/reconcile-identity')
  reconcilePatientIdentity(
    @Param('patientId') patientId: string,
    @Body() body: ReconcilePatientIdentityDto,
    @TenantContext() tenantContext?: TenantContextValue,
    @Req() request?: Request,
  ) {
    const authenticatedUser = (
      request as unknown as {
        user?: {
          id?: string;
          email?: string;
          profile?: { roleProfileId?: string | null; fullName?: string | null };
        };
      }
    )?.user;
    assertCanReconcilePatientIdentity(authenticatedUser?.profile?.roleProfileId ?? null);
    if (!authenticatedUser?.id) {
      // Unreachable in practice -- AuthGuard('jwt') already requires a valid
      // authenticated session -- but reconcilePatientIdentity's actor.staffId
      // is intentionally required (not optional, unlike
      // requestPhysicianTransport's actor above) because this action rewrites
      // a patient's core identity, and "who confirmed this" must never be
      // recorded as absent in the audit trail.
      throw new ForbiddenException('A valid authenticated staff identity is required.');
    }
    return this.patientService.reconcilePatientIdentity(
      patientId,
      {
        firstName: body.firstName,
        lastName: body.lastName,
        dob: body.dob,
        sex: body.sex,
        mrn: body.mrn,
        autoGenerateMrn: body.autoGenerateMrn,
      },
      {
        staffId: authenticatedUser.id,
        name: authenticatedUser.profile?.fullName || authenticatedUser.email,
      },
      tenantContext?.organizationId,
    );
  }

  @RequirePermission(Permission.READ_PHI)
  @Get('journey')
  getJourney(@TenantContext() tenantContext?: TenantContextValue) {
    return this.journeyService.getJourney(tenantContext?.organizationId);
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
    return this.documentArtifactService.getEnvelope(patientId, tenantContext?.organizationId);
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
    return this.documentArtifactService.extract(
      patientId,
      { ...body, patientId },
      tenantContext?.organizationId,
    );
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
    return this.documentArtifactService.review(
      patientId,
      artifactId,
      {
        ...body,
        artifactId,
      },
      tenantContext?.organizationId,
    );
  }

  // HEAL follow-up (OCR intake tenant-scoping audit): this whole subsystem
  // (create/list/get/review/apply) had zero tenant context threaded through
  // at all -- see the detailed rationale on OcrIntakeService.getJob().
  @RequirePermission(Permission.WRITE_PHI)
  @Post('intake/ocr-jobs')
  createOcrJob(@Body() body: CreateOcrJobDto, @TenantContext() tenantContext?: TenantContextValue) {
    return this.ocrIntakeService.createJob({
      ...body,
      organizationId: tenantContext?.organizationId,
    });
  }

  @RequirePermission(Permission.READ_PHI)
  @Get('intake/ocr-jobs')
  listOcrJobs(
    @Query('patientId') patientId?: string,
    @Query('intakeSessionId') intakeSessionId?: string,
    @TenantContext() tenantContext?: TenantContextValue,
  ) {
    return {
      jobs: this.ocrIntakeService.listJobs({
        patientId,
        intakeSessionId,
        organizationId: tenantContext?.organizationId,
      }),
    };
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
    const job = this.ocrIntakeService.getJob(jobId, tenantContext?.organizationId);
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
    @TenantContext() tenantContext?: TenantContextValue,
  ) {
    return this.ocrIntakeService.reviewField(jobId, field, body, tenantContext?.organizationId);
  }

  @RequirePermission(Permission.WRITE_PHI)
  @Post('intake/ocr-jobs/:jobId/apply')
  applyOcrJobToIntake(
    @Param('jobId') jobId: string,
    @Body() body: ApplyOcrJobToIntakeDto,
    @TenantContext() tenantContext?: TenantContextValue,
  ) {
    return this.ocrIntakeService.applyToIntake(
      jobId,
      body?.actor || 'unknown',
      { autoAcceptHighConfidence: body?.autoAcceptHighConfidence },
      tenantContext?.organizationId,
    );
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
    let orchestration: ReturnType<PatientOrchestrationService['buildPatientOrchestration']>;
    try {
      orchestration = this.orchestrationService.buildPatientOrchestration(
        patientId,
        role,
        tenantContext?.organizationId,
      );
    } catch (error) {
      // buildPatientOrchestration throws a plain Error for an unknown id (same
      // shape as updatePatient's, translated the same way above) -- without
      // this, a demo/fixture patient id with no backend record surfaced as a
      // bare 500 instead of a clean 404.
      if (error instanceof Error && /not found/i.test(error.message)) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
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
  getEMS(@TenantContext() tenantContext?: TenantContextValue) {
    return this.emsIntakeService.getEMSIntake(tenantContext?.organizationId);
  }

  /**
   * Persists a REAL EMS handoff acceptance -- see EMSIntakeService.
   * completeHandoff's own doc comment. The accepting clinician's identity
   * (handoffAcceptedByStaffId/Name) is always derived server-side from the
   * authenticated session here, never trusted from the request body --
   * matching requestEmergencyTransport/reconcilePatientIdentity above.
   * `acceptor.staffId` is intentionally optional (not required/throwing),
   * matching requestEmergencyTransport's own softer pattern: this records an
   * operational handoff-acceptance event, not a rewrite of the patient's
   * core identity/MRN the way reconcilePatientIdentity is.
   */
  @RequirePermission(Permission.WRITE_PHI)
  @Post('ems/handoff')
  postEmsHandoff(
    @Body() body: PostEmsHandoffDto,
    @TenantContext() tenantContext?: TenantContextValue,
    @Req() request?: Request,
  ) {
    const authenticatedUser = (
      request as unknown as {
        user?: { id?: string; email?: string; profile?: { fullName?: string | null } };
      }
    )?.user;
    const acceptor = {
      staffId: authenticatedUser?.id,
      name: authenticatedUser?.profile?.fullName || authenticatedUser?.email,
    };
    return this.emsIntakeService.completeHandoff(body, acceptor, tenantContext?.organizationId);
  }

  /** Durable EMS arrival status transitions (arrived / handoff-started) -- see
   * EMSIntakeService.updateArrivalStatus's own doc comment for why this exists. */
  @RequirePermission(Permission.WRITE_PHI)
  @Patch('ems/arrivals/:arrivalId/status')
  patchEmsArrivalStatus(
    @Param('arrivalId') arrivalId: string,
    @Body() body: PatchEmsArrivalStatusDto,
    @TenantContext() tenantContext?: TenantContextValue,
  ) {
    return this.emsIntakeService.updateArrivalStatus(
      arrivalId,
      { ...body },
      tenantContext?.organizationId,
    );
  }

  /**
   * Physician-initiated SIMULATED "Request Emergency Transport" action from
   * an existing patient's chart (e.g. during a phone follow-up call). There
   * is NO real EMS/CAD/911 dispatch system connected anywhere in this
   * codebase or environment -- this creates a real, persisted, audited
   * CareDroid record only, surfaced through the same live EMS pipeline real
   * arrivals already use (see EMSIntakeService.requestPhysicianTransport's
   * own doc comment). WRITE_PHI is necessary but not sufficient here:
   * assertCanRequestEmergencyTransport further restricts this to
   * physician-tier roles specifically, mirroring assertCanWriteVitalsOrFlags
   * above for the same reason -- every WRITE_PHI clinical role should not
   * automatically get every physician-tier clinical-decision action.
   */
  @RequirePermission(Permission.WRITE_PHI)
  @Post('ems/transport-requests')
  requestEmergencyTransport(
    @Body() body: RequestEmergencyTransportDto,
    @TenantContext() tenantContext?: TenantContextValue,
    @Req() request?: Request,
  ) {
    const authenticatedUser = (
      request as unknown as {
        user?: {
          id?: string;
          email?: string;
          profile?: { roleProfileId?: string | null; fullName?: string | null };
        };
      }
    )?.user;
    assertCanRequestEmergencyTransport(authenticatedUser?.profile?.roleProfileId ?? null);
    const actor = {
      // Actor identity is always server-derived from the authenticated
      // session, never trusted from the request body -- see
      // RequestEmergencyTransportDto's own doc comment.
      staffId: authenticatedUser?.id,
      name: authenticatedUser?.profile?.fullName || authenticatedUser?.email,
    };
    try {
      return this.emsIntakeService.requestPhysicianTransport(
        body,
        actor,
        tenantContext?.organizationId,
      );
    } catch (error) {
      if (error instanceof Error && /not found/i.test(error.message)) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }

  @RequirePermission(Permission.READ_PHI)
  @Get('reception/snapshot')
  getReceptionSnapshot(@TenantContext() tenantContext?: TenantContextValue) {
    return this.receptionWorkspaceService.getSnapshot(tenantContext?.organizationId);
  }

  @RequirePermission(Permission.WRITE_PHI)
  @Post('reception/escalation')
  postReceptionEscalation(
    @Body() body: PostReceptionEscalationDto,
    @TenantContext() tenantContext?: TenantContextValue,
  ) {
    return this.receptionWorkspaceService.raiseEscalation(
      body || {},
      tenantContext?.organizationId,
    );
  }

  @RequirePermission(Permission.WRITE_PHI)
  @Post('reception/handoff')
  async postReceptionHandoff(
    @Body() body: PostReceptionHandoffDto,
    @TenantContext() tenantContext?: TenantContextValue,
  ) {
    let triageAssist = body.triageAssist as Awaited<
      ReturnType<PatientOrchestrationService['buildTriageAssist']>
    > | null;
    if (!triageAssist && body.patientId) {
      try {
        triageAssist = await this.orchestrationService.buildTriageAssist(
          body.patientId,
          body,
          tenantContext?.organizationId,
        );
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
    return this.receptionWorkspaceService.completeHandoff(
      {
        ...body,
        triageAssist: triageAssist || undefined,
        triageAssistGeneratedAt: triageAssist?.generatedAt,
      },
      tenantContext?.organizationId,
    );
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
    let triageAssist: Awaited<ReturnType<PatientOrchestrationService['buildTriageAssist']>>;
    try {
      triageAssist = await this.orchestrationService.buildTriageAssist(patientId, body);
    } catch (error) {
      // Same translation as getPatientOrchestration/updatePatient above --
      // buildTriageAssist throws a plain Error for an unknown id.
      if (error instanceof Error && /not found/i.test(error.message)) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
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
  getIntake(@TenantContext() tenantContext?: TenantContextValue) {
    return this.smartIntakeService.getSmartIntake(tenantContext?.organizationId);
  }

  // See BOLA-audit comment on createPatient() above -- same gap, same fix.
  @RequirePermission(Permission.WRITE_PHI)
  @Post('intake')
  createIntakePatient(
    @Body() dto: SmartIntakeCreateInput,
    @TenantContext() tenantContext?: TenantContextValue,
  ) {
    return this.smartIntakeService.createFromIntake(dto, tenantContext?.organizationId);
  }

  // See BOLA-audit comment on createPatient() above -- same gap, same fix.
  @RequirePermission(Permission.WRITE_PHI)
  @Post('intake/vertical-slice')
  createSmartIntakeVerticalSlice(
    @Body()
    dto: SmartIntakeCreateInput & { patient?: SmartIntakeCreateInput; staffId?: string },
    @TenantContext() tenantContext?: TenantContextValue,
  ) {
    const slice = this.smartIntakeService.createVerticalSlice(
      {
        ...(dto.patient || dto),
        confirmDuplicateOverride:
          dto.patient?.confirmDuplicateOverride ?? dto.confirmDuplicateOverride,
        staffId: dto.staffId,
      },
      tenantContext?.organizationId,
    );
    const whiteboard = this.whiteboardService.getWhiteboard(tenantContext?.organizationId).data;
    const queueMetrics = this.queueService.getQueues(tenantContext?.organizationId).data;
    const reassessment = this.reassessmentService.getReassessmentQueue(
      tenantContext?.organizationId,
    ).data;
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
  getQueues(@TenantContext() tenantContext?: TenantContextValue) {
    return this.queueService.getQueues(tenantContext?.organizationId);
  }

  @RequirePermission(Permission.READ_PHI)
  @Get('reassessment')
  getReassessment(@TenantContext() tenantContext?: TenantContextValue) {
    return this.reassessmentService.getReassessmentQueue(tenantContext?.organizationId);
  }

  /** Real out-of-band notification for the waiting-room-safety escalation transition --
   * see ReassessmentService.notifyWaitingRoomEscalation's own doc comment for why this
   * exists and which mechanism it actually extends. */
  @RequirePermission(Permission.WRITE_PHI)
  @Post('waiting-room-safety/escalation-notify')
  postWaitingRoomEscalationNotify(
    @Body() body: PostWaitingRoomEscalationNotifyDto,
    @TenantContext() tenantContext?: TenantContextValue,
  ) {
    return this.reassessmentService.notifyWaitingRoomEscalation(
      body,
      tenantContext?.organizationId,
    );
  }

  /** Real staff directory, including on-duty status -- see roadmap item G1. */
  @RequirePermission(Permission.VIEW_OPERATIONS)
  @Get('staff')
  getStaff(@TenantContext() tenantContext?: TenantContextValue) {
    return this.reassessmentService.listStaff(tenantContext?.organizationId);
  }

  /** Mark a staff member on/off duty (and optionally set their email) so
   * waiting-room-safety escalation can route to a real on-duty charge nurse
   * instead of only a static distribution list -- see roadmap item G1 and
   * ReassessmentService.updateStaffDutyStatus's own doc comment. */
  @RequirePermission(Permission.MANAGE_INCIDENTS)
  @Patch('staff/:staffId/duty-status')
  patchStaffDutyStatus(
    @Param('staffId') staffId: string,
    @Body() body: UpdateStaffDutyStatusDto,
    @TenantContext() tenantContext?: TenantContextValue,
  ) {
    return this.reassessmentService.updateStaffDutyStatus(
      staffId,
      body,
      tenantContext?.organizationId,
    );
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
  getPatientFlow(@TenantContext() tenantContext?: TenantContextValue) {
    return this.patientFlowService.getPatientFlow(undefined, tenantContext?.organizationId);
  }

  @RequirePermission(Permission.READ_PHI)
  @Get('patient-flow/:patientId')
  getPatientFlowForPatient(
    @Param('patientId') patientId: string,
    @TenantContext() tenantContext?: TenantContextValue,
  ) {
    return this.patientFlowService.getPatientFlow(patientId, tenantContext?.organizationId);
  }

  @RequirePermission(Permission.READ_PHI)
  @Get('capacity')
  getCapacity() {
    return this.capacityService.getCapacity();
  }

  @RequirePermission(Permission.READ_PHI)
  @Get('boarding')
  getBoarding(@TenantContext() tenantContext?: TenantContextValue) {
    return this.boardingService.getBoarding(tenantContext?.organizationId);
  }

  @RequirePermission(Permission.READ_PHI)
  @Get('referrals')
  getReferrals(@TenantContext() tenantContext?: TenantContextValue) {
    return this.referralService.getReferrals(tenantContext?.organizationId);
  }

  @RequirePermission(Permission.WRITE_PHI)
  @Post('referrals')
  createReferral(
    @Body() dto: CreateReferralDto,
    @TenantContext() tenantContext?: TenantContextValue,
  ) {
    return this.referralService.createReferral({ ...dto }, tenantContext?.organizationId);
  }

  /** ReferralPanel.tsx's updateEmergencyTransferWorkflow() has called this
   * exact path (via emergencyTransportApi.ts) since before this route
   * existed on the backend -- found 2026-08-06, the frontend was silently
   * 404ing and falling back to "live sync is pending" every time. Mounted
   * under /emergency/transfers (not /emergency/referrals) to match the real
   * caller's URL exactly, not the sibling GET/POST referrals routes' prefix.
   *
   * Actor identity is always server-derived from the authenticated session,
   * never trusted from the request body -- matching requestEmergencyTransport/
   * reconcilePatientIdentity above (UpdateReferralStatusDto's own doc
   * comment states this explicitly). Before this fix there was no actor
   * parameter at all, so every status change (Accept/Decline/Complete/etc.)
   * left the referral's audit trail attributing the change to whoever
   * originally CREATED it (`requestingStaffId`), even when a different
   * receiving-side staff member actually acted -- unlike
   * reconcilePatientIdentity, a missing authenticated identity here doesn't
   * throw: `actor.staffId` is simply omitted from the record rather than
   * blocking a status update, matching requestEmergencyTransport's own
   * "optional actor" precedent for a non-identity-rewriting action. */
  @RequirePermission(Permission.WRITE_PHI)
  @Patch('transfers/:id/status')
  updateTransferStatus(
    @Param('id') id: string,
    @Body() dto: UpdateReferralStatusDto,
    @TenantContext() tenantContext?: TenantContextValue,
    @Req() request?: Request,
  ) {
    const authenticatedUser = (
      request as unknown as {
        user?: {
          id?: string;
          email?: string;
          profile?: { fullName?: string | null } | null;
        };
      }
    )?.user;
    const actor = {
      staffId: authenticatedUser?.id,
      name: authenticatedUser?.profile?.fullName || authenticatedUser?.email,
    };
    return this.referralService.updateReferralStatus(
      id,
      dto.status,
      tenantContext?.organizationId,
      actor,
      dto.responseNote,
    );
  }

  @RequirePermission(Permission.READ_PHI)
  @Get('provincial-health')
  getProvincialHealth(@TenantContext() tenantContext?: TenantContextValue) {
    return this.provincialHealthService.getProvincialHealth(tenantContext?.organizationId);
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
    return this.copilotService.getCopilotContext(tenantContext?.organizationId);
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
    const edCopilotContext = this.buildEdCopilotOperationalContext(
      query,
      explicitPatientId,
      tenantContext?.organizationId,
    );
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
        tenantId: tenantContext?.organizationId ?? null,
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
    organizationId?: string,
  ): {
    patients: Array<Record<string, unknown>>;
    patientCount: number;
    flaggedReassessments: Array<Record<string, unknown>>;
    capacitySnapshot: Record<string, unknown>;
    selectedPatientId?: string;
    patientArtifactContext?: Record<string, unknown>;
  } {
    const patients = this.patientService.listPatients(organizationId);
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
    @TenantContext() tenantContext?: TenantContextValue,
  ) {
    return this.clinicalDecisionSupportService.listCalculatorResults({
      patientId,
      calculatorId: calculatorId as RecordClinicalCalculatorDto['calculatorId'] | undefined,
      organizationId: tenantContext?.organizationId,
    });
  }

  @RequirePermission(Permission.USE_AI_CHAT)
  @Get('copilot/interactions')
  listCopilotInteractions(
    @Query('patientId') patientId?: string,
    @TenantContext() tenantContext?: TenantContextValue,
  ) {
    return this.clinicalDecisionSupportService.listCopilotInteractions({
      patientId,
      organizationId: tenantContext?.organizationId,
    });
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
  getAnalytics(@TenantContext() tenantContext?: TenantContextValue) {
    return this.analyticsService.getAnalytics(tenantContext?.organizationId);
  }

  // HEAL-347.91: these 7 routes previously called EmergencyOsUpgradeHarnessService
  // with no organizationId at all -- see the service's own getHarness() doc
  // comment for the full account.
  @RequirePermission(Permission.READ_PHI)
  @Get('upgrade-harness')
  getUpgradeHarness(@TenantContext() tenantContext?: TenantContextValue) {
    return this.upgradeHarnessService.getHarness(tenantContext?.organizationId);
  }

  @RequirePermission(Permission.READ_PHI)
  @Get('upgrade-harness/capacity')
  getUpgradeHarnessCapacity(@TenantContext() tenantContext?: TenantContextValue) {
    return this.upgradeHarnessService.getCapacityAndForecasting(tenantContext?.organizationId);
  }

  @RequirePermission(Permission.READ_PHI)
  @Get('upgrade-harness/patient-flow')
  getUpgradeHarnessPatientFlow(@TenantContext() tenantContext?: TenantContextValue) {
    return this.upgradeHarnessService.getPatientFlow(undefined, tenantContext?.organizationId);
  }

  @RequirePermission(Permission.READ_PHI)
  @Get('upgrade-harness/patient-flow/:patientId')
  getUpgradeHarnessPatientFlowForPatient(
    @Param('patientId') patientId: string,
    @TenantContext() tenantContext?: TenantContextValue,
  ) {
    return this.upgradeHarnessService.getPatientFlow(patientId, tenantContext?.organizationId);
  }

  @RequirePermission(Permission.READ_PHI)
  @Get('upgrade-harness/clinical-intelligence')
  getUpgradeHarnessClinicalIntelligence(@TenantContext() tenantContext?: TenantContextValue) {
    return this.upgradeHarnessService.getClinicalDecisionSupport(
      undefined,
      tenantContext?.organizationId,
    );
  }

  @RequirePermission(Permission.READ_PHI)
  @Get('upgrade-harness/clinical-intelligence/:patientId')
  getUpgradeHarnessClinicalIntelligenceForPatient(
    @Param('patientId') patientId: string,
    @TenantContext() tenantContext?: TenantContextValue,
  ) {
    return this.upgradeHarnessService.getClinicalDecisionSupport(
      patientId,
      tenantContext?.organizationId,
    );
  }

  @RequirePermission(Permission.READ_PHI)
  @Get('upgrade-harness/audit-summary')
  getUpgradeHarnessAuditSummary(@TenantContext() tenantContext?: TenantContextValue) {
    return this.upgradeHarnessService.getAuditSummary(tenantContext?.organizationId);
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
