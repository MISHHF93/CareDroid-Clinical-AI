import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { TenantContext } from '../tenant-context/tenant-context.decorator';
import type { TenantContext as TenantContextValue } from '../tenant-context/tenant-context.types';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
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
import type {
  RecordClinicalCalculatorDto,
  RecordCopilotInteractionDto,
} from './clinical-decision-support.types';
import type { EmergencyOsSettingsPatch, EmergencyPatient } from './emergency-os.types';
import type {
  ExtractDocumentArtifactsInput,
  PatientDocumentArtifactReviewInput,
} from '../../../../src/types/patientDocumentArtifact';
import { OcrIntakeService } from './ocr-intake.service';
import type { CreateOcrJobInput, OcrFieldReviewInput } from './ocr-intake.types';

@ApiTags('emergency')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), AuthorizationGuard)
@Controller('emergency')
export class EmergencyOsController {
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
  ) {}

  @Get('whiteboard')
  getWhiteboard() {
    return this.whiteboardService.getWhiteboard();
  }

  @Get('central-node/snapshot')
  getCentralNodeSnapshot() {
    return this.centralNodeService.getSnapshot();
  }

  @Get('operational-intelligence/snapshot')
  getOperationalIntelligenceSnapshot() {
    return this.operationalIntelligenceService.getSnapshotEnvelope();
  }

  @Get('operational-intelligence/model-health')
  getOperationalIntelligenceModelHealth() {
    return this.operationalIntelligenceService.getModelHealthEnvelope();
  }

  @Get('operational-intelligence/alerts')
  getOperationalIntelligenceAlerts() {
    return this.operationalIntelligenceService.getAlertsEnvelope();
  }

  @Post('operational-intelligence/evaluate')
  evaluateOperationalIntelligence(@Body() body: { events?: unknown[] }) {
    const events = Array.isArray(body?.events) ? body.events : [];
    return this.operationalIntelligenceService.evaluate(
      events as import('./emergency-os.types').OperationalInputEvent[],
    );
  }

  @Get('patients')
  getPatients() {
    return this.patientService.getPatientEnvelope();
  }

  @Post('patients')
  createPatient(@Body() dto: Partial<EmergencyPatient>) {
    return this.smartIntakeService.createFromIntake(dto);
  }

  @Get('journey')
  getJourney() {
    return this.journeyService.getJourney();
  }

  @Get('workflow-logs')
  getWorkflowLogs() {
    return this.workflowActionLogService.getEnvelope();
  }

  @Get('implementation-readiness')
  getImplementationReadiness() {
    return this.implementationReadinessService.getReadiness();
  }

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

  @Post('patients/:patientId/document-artifacts/extract')
  extractPatientDocumentArtifacts(
    @Param('patientId') patientId: string,
    @Body() body: ExtractDocumentArtifactsInput,
  ) {
    return this.documentArtifactService.extract(patientId, { ...body, patientId });
  }

  @Patch('patients/:patientId/document-artifacts/:artifactId/review')
  reviewPatientDocumentArtifact(
    @Param('patientId') patientId: string,
    @Param('artifactId') artifactId: string,
    @Body() body: PatientDocumentArtifactReviewInput,
  ) {
    return this.documentArtifactService.review(patientId, artifactId, {
      ...body,
      artifactId,
    });
  }

  @Post('intake/ocr-jobs')
  createOcrJob(@Body() body: CreateOcrJobInput) {
    return this.ocrIntakeService.createJob(body);
  }

  @Get('intake/ocr-jobs')
  listOcrJobs(
    @Query('patientId') patientId?: string,
    @Query('intakeSessionId') intakeSessionId?: string,
  ) {
    return { jobs: this.ocrIntakeService.listJobs({ patientId, intakeSessionId }) };
  }

  @Get('intake/ocr-health')
  getOcrIntakeHealth() {
    return this.ocrIntakeService.getHealth();
  }

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

  @Post('intake/ocr-jobs/:jobId/fields/:field/review')
  reviewOcrJobField(
    @Param('jobId') jobId: string,
    @Param('field') field: string,
    @Body() body: OcrFieldReviewInput,
  ) {
    return this.ocrIntakeService.reviewField(jobId, field, body);
  }

  @Post('intake/ocr-jobs/:jobId/apply')
  applyOcrJobToIntake(@Param('jobId') jobId: string, @Body() body: { actor?: string }) {
    return this.ocrIntakeService.applyToIntake(jobId, body?.actor || 'unknown');
  }

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

  @Get('ems')
  getEMS() {
    return this.emsIntakeService.getEMSIntake();
  }

  @Get('reception/snapshot')
  getReceptionSnapshot() {
    return this.receptionWorkspaceService.getSnapshot();
  }

  @Post('reception/handoff')
  async postReceptionHandoff(
    @Body()
    body: {
      patientId?: string;
      source?: string;
      actorName?: string;
      encounterId?: string | null;
      arrivalReason?: string;
      complaintCategory?: string;
      verificationSummary?: string;
      triageAssist?: unknown;
      triageAssistGeneratedAt?: string;
    },
  ) {
    let triageAssist = body.triageAssist as Awaited<
      ReturnType<PatientOrchestrationService['buildTriageAssist']>
    > | null;
    if (!triageAssist && body.patientId) {
      try {
        triageAssist = await this.orchestrationService.buildTriageAssist(body.patientId, body);
      } catch {
        triageAssist = null;
      }
    }
    return this.receptionWorkspaceService.completeHandoff({
      ...body,
      triageAssist: triageAssist || undefined,
      triageAssistGeneratedAt: triageAssist?.generatedAt,
    });
  }

  @Post('triage/assist')
  async postTriageAssist(
    @Body()
    body: {
      patientId?: string;
      arrivalReason?: string;
      complaintCategory?: string;
      encounterId?: string | null;
      verificationSummary?: string;
    },
  ) {
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

  @Get('intake')
  getIntake() {
    return this.smartIntakeService.getSmartIntake();
  }

  @Post('intake')
  createIntakePatient(@Body() dto: Partial<EmergencyPatient>) {
    return this.smartIntakeService.createFromIntake(dto);
  }

  @Post('intake/vertical-slice')
  createSmartIntakeVerticalSlice(
    @Body()
    dto: Partial<EmergencyPatient> & { patient?: Partial<EmergencyPatient>; staffId?: string },
  ) {
    const slice = this.smartIntakeService.createVerticalSlice({
      ...(dto.patient || dto),
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

  @Get('queues')
  getQueues() {
    return this.queueService.getQueues();
  }

  @Get('reassessment')
  getReassessment() {
    return this.reassessmentService.getReassessmentQueue();
  }

  @Get('operating-surfaces/:surfaceId')
  getOperatingSurface(
    @Param('surfaceId') surfaceId: OperatingSurfaceId,
    @TenantContext() tenantContext?: TenantContextValue,
  ) {
    return this.operatingSurfacesService.getSurface(surfaceId, tenantContext);
  }

  @Get('workflow-orchestration')
  getWorkflowOrchestration(@TenantContext() tenantContext?: TenantContextValue) {
    return this.workflowOrchestrationService.getWorkflowOrchestration(tenantContext);
  }

  @Post('workflow-orchestration/review')
  reviewWorkflowAutomation(
    @Body()
    body: import('../../../../src/types/administrativeAutomation').ReviewAdministrativeAutomationInput,
    @TenantContext() tenantContext?: TenantContextValue,
  ) {
    return this.workflowOrchestrationService.reviewTask(body, tenantContext);
  }

  @Get('patient-flow')
  getPatientFlow() {
    return this.patientFlowService.getPatientFlow();
  }

  @Get('patient-flow/:patientId')
  getPatientFlowForPatient(@Param('patientId') patientId: string) {
    return this.patientFlowService.getPatientFlow(patientId);
  }

  @Get('capacity')
  getCapacity() {
    return this.capacityService.getCapacity();
  }

  @Get('boarding')
  getBoarding() {
    return this.boardingService.getBoarding();
  }

  @Get('referrals')
  getReferrals() {
    return this.referralService.getReferrals();
  }

  @Post('referrals')
  createReferral(@Body() dto: Record<string, unknown>) {
    return this.referralService.createReferral(dto);
  }

  @Get('provincial-health')
  getProvincialHealth() {
    return this.provincialHealthService.getProvincialHealth();
  }

  @Get('integrations')
  getIntegrations() {
    return this.integrationHubService.getIntegrationHub();
  }

  @Get('copilot')
  async getCopilot(@Req() request?: Request, @TenantContext() tenantContext?: TenantContextValue) {
    await assertEntitlementLaunchFromRequest(
      this.entitlementService,
      { user: (request as any)?.user, tenantContext },
      'agent-clinical',
    );
    return this.copilotService.getCopilotContext();
  }

  @Post('copilot/query')
  async queryCopilot(
    @Body() dto: { query?: string; user_role?: string; context?: Record<string, unknown> },
    @TenantContext() tenantContext?: TenantContextValue,
    @Req() request?: Request,
  ) {
    await assertEntitlementLaunchFromRequest(
      this.entitlementService,
      { user: (request as any)?.user, tenantContext },
      'agent-clinical',
    );
    const response = this.copilotService.processQuery(dto || {});
    const patientId =
      typeof dto?.context?.patientId === 'string' ? dto.context.patientId : undefined;
    if (patientId) {
      await this.patientAuditService.logPatientAccess({
        request,
        tenantContext,
        patientId,
        resource: `emergency/copilot/query`,
      });
    }
    const data = response.data as {
      query?: string;
      response?: string;
      requires_review?: boolean;
    };
    this.clinicalDecisionSupportService.recordCopilotInteraction(
      {
        question: String(dto?.query || ''),
        patientId,
        userRole: dto?.user_role,
        patientContextSummary:
          typeof dto?.context?.summary === 'string' ? dto.context.summary : undefined,
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

  @Post('clinical-calculators/results')
  recordClinicalCalculatorResult(
    @Body() dto: RecordClinicalCalculatorDto,
    @TenantContext() tenantContext?: TenantContextValue,
  ) {
    return this.clinicalDecisionSupportService.recordCalculatorResult(dto, {
      tenantId: tenantContext?.organizationId,
      userId: tenantContext?.userId,
    });
  }

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

  @Get('copilot/interactions')
  listCopilotInteractions(@Query('patientId') patientId?: string) {
    return this.clinicalDecisionSupportService.listCopilotInteractions({ patientId });
  }

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

  @Get('analytics')
  getAnalytics() {
    return this.analyticsService.getAnalytics();
  }

  @Get('upgrade-harness')
  getUpgradeHarness() {
    return this.upgradeHarnessService.getHarness();
  }

  @Get('upgrade-harness/capacity')
  getUpgradeHarnessCapacity() {
    return this.upgradeHarnessService.getCapacityAndForecasting();
  }

  @Get('upgrade-harness/patient-flow')
  getUpgradeHarnessPatientFlow() {
    return this.upgradeHarnessService.getPatientFlow();
  }

  @Get('upgrade-harness/patient-flow/:patientId')
  getUpgradeHarnessPatientFlowForPatient(@Param('patientId') patientId: string) {
    return this.upgradeHarnessService.getPatientFlow(patientId);
  }

  @Get('upgrade-harness/clinical-intelligence')
  getUpgradeHarnessClinicalIntelligence() {
    return this.upgradeHarnessService.getClinicalDecisionSupport();
  }

  @Get('upgrade-harness/clinical-intelligence/:patientId')
  getUpgradeHarnessClinicalIntelligenceForPatient(@Param('patientId') patientId: string) {
    return this.upgradeHarnessService.getClinicalDecisionSupport(patientId);
  }

  @Get('upgrade-harness/audit-summary')
  getUpgradeHarnessAuditSummary() {
    return this.upgradeHarnessService.getAuditSummary();
  }

  @Get('settings')
  getSettings(@TenantContext() tenantContext?: TenantContextValue) {
    return this.settingsService.getSettings(tenantContext?.organizationId);
  }

  @Patch('settings')
  updateSettings(
    @Body() dto: EmergencyOsSettingsPatch,
    @TenantContext() tenantContext?: TenantContextValue,
  ) {
    return this.settingsService.updateSettings(dto, tenantContext?.organizationId);
  }

  @Post('simulation/update-live')
  updateLiveSimulation(@Body() dto: any): any {
    return this.realTimeSimulationService.updateLiveState(dto);
  }

  @Post('simulation/evaluate')
  evaluateSimulation(@Body() dto: any): any {
    return this.realTimeSimulationService.evaluateIntervention(dto);
  }

  @Post('simulation/compare')
  compareSimulation(@Body() dto: any): any {
    return this.realTimeSimulationService.compareInterventions(dto);
  }

  @Get('simulation/recommendations')
  getSimulationRecommendations(): any {
    return this.realTimeSimulationService.getRecommendations();
  }

  @Post('federated-learning/register')
  registerFederatedHospital(@Body() dto: any): any {
    return this.federatedLearningService.registerHospital(dto);
  }

  @Post('federated-learning/update')
  updateFederatedModel(@Body() dto: any): any {
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
  initializeDigitalTwin(@Body() dto: any): any {
    return this.hybridDigitalTwinService.initialize(dto);
  }

  @Post('digital-twin/simulate')
  simulateDigitalTwin(@Body() dto: any): any {
    return this.hybridDigitalTwinService.simulate(dto);
  }

  @Get('digital-twin/state')
  getDigitalTwinState(): any {
    return this.hybridDigitalTwinService.getState();
  }

  @Post('digital-twin/scenario')
  evaluateDigitalTwinScenario(@Body() dto: any): any {
    return this.hybridDigitalTwinService.evaluateScenario(dto);
  }
}
