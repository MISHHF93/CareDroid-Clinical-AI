import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Optional,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { PlatformSystemsService } from './platform-systems.service';
import {
  PlatformGovernanceService,
  CreateClinicalPolicyDto,
  UpdateClinicalPolicyDto,
  GovernanceDecisionDto,
  GovernanceConfigUpdateDto,
  EvaluateGateDto,
  UpdateRegulatoryClassificationDto,
  CreateRegulatoryEvidenceArtifactDto,
  EquityCohortDto,
  EquityReportDto,
  CreateValidationScenarioDto,
  CreateValidationRunDto,
  CreateReviewItemDto,
  ConsentActionDto,
  PrivacyRequestDto,
  AuditPlaceholderDto,
} from '../platform-governance';

/**
 * Governance, compliance, and operations surface -- split out from
 * PlatformSystemsController (Cycle 43 module-boundary pass) since these routes
 * share no dependency on the clinical-operations services (patients/staff/EMS/
 * referrals/integrations) the parent controller still owns. Route paths and
 * guards are unchanged; this is a pure organizational split, not a behavior
 * change.
 */
@ApiTags('platform-governance')
@ApiBearerAuth()
@Controller()
@UseGuards(AuthGuard('jwt'), AuthorizationGuard)
export class GovernanceController {
  constructor(
    private readonly platformSystemsService: PlatformSystemsService,
    @Optional() private readonly platformGovernanceService?: PlatformGovernanceService,
  ) {}

  @Get('governance/clinical/readiness')
  @Permissions(Permission.CONFIGURE_SYSTEM, Permission.VIEW_AUDIT_LOGS)
  async getClinicalReadiness() {
    if (this.platformGovernanceService) {
      return this.platformGovernanceService.getSummary();
    }
    return this.platformSystemsService.getProductionReadiness();
  }

  @Get('governance/clinical/policies')
  @Permissions(Permission.CONFIGURE_SYSTEM, Permission.VIEW_AUDIT_LOGS)
  async getClinicalPolicies(@Req() req: any) {
    if (this.platformGovernanceService) {
      // HEAL-347.58: previously unscoped -- returned every organization's
      // clinical-safety policies to any CONFIGURE_SYSTEM+VIEW_AUDIT_LOGS
      // holder (any hospital's own admin), and handed out other orgs'
      // policyIds for free to feed into the update/approve BOLA below.
      return this.platformGovernanceService.listPolicies(
        undefined,
        req.tenantContext?.organizationId,
      );
    }
    return this.platformSystemsService.demo('clinical-governance');
  }

  @Post('governance/clinical/policies')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.CONFIGURE_SYSTEM, Permission.VIEW_AUDIT_LOGS)
  async createClinicalPolicy(@Body() body: CreateClinicalPolicyDto, @Req() req: any) {
    if (this.platformGovernanceService) {
      // HEAL-347.58: previously trusted CreateClinicalPolicyDto's own
      // client-settable organizationId verbatim, same anti-pattern already
      // fixed for createReviewItem (HEAL-347.22, platform-governance.controller.ts).
      return this.platformGovernanceService.createPolicy({
        ...body,
        organizationId: req.tenantContext?.organizationId,
      });
    }
    return this.platformSystemsService.demo('clinical-governance', 'policy-draft', { ...body });
  }

  @Put('governance/clinical/policies/:policyId')
  @Permissions(Permission.CONFIGURE_SYSTEM, Permission.VIEW_AUDIT_LOGS)
  async updateClinicalPolicy(
    @Param('policyId') policyId: string,
    @Body() body: UpdateClinicalPolicyDto,
    @Req() req: any,
  ) {
    if (this.platformGovernanceService) {
      // HEAL-347.58: previously resolved the policy by policyId alone --
      // any CONFIGURE_SYSTEM+VIEW_AUDIT_LOGS holder could overwrite another
      // hospital's clinical-safety policy content/version/status.
      const result = await this.platformGovernanceService.updatePolicy(
        policyId,
        { ...body },
        req.tenantContext?.organizationId,
      );
      if (result) return result;
    }
    return this.platformSystemsService.demo('clinical-governance', policyId, { ...body });
  }

  @Post('governance/clinical/policies/:policyId/approve')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.CONFIGURE_SYSTEM, Permission.VIEW_AUDIT_LOGS)
  async approveClinicalPolicy(
    @Param('policyId') policyId: string,
    @Body() body: GovernanceDecisionDto,
    @Req() req: any,
  ) {
    if (this.platformGovernanceService) {
      // HEAL-347.58: same gap as updateClinicalPolicy above -- could flip
      // another org's policy to ACTIVE and stamp an approvedBy on it.
      const result = await this.platformGovernanceService.approvePolicy(
        policyId,
        { ...body },
        req.tenantContext?.organizationId,
      );
      if (result) return result;
    }
    return this.platformSystemsService.demo('clinical-governance', policyId, { ...body });
  }

  @Get('governance/clinical/release-gates')
  @Permissions(Permission.CONFIGURE_SYSTEM, Permission.VIEW_AUDIT_LOGS)
  async getClinicalReleaseGates() {
    if (this.platformGovernanceService) {
      return this.platformGovernanceService.listReleaseGates();
    }
    return this.platformSystemsService.demo('clinical-release-gates');
  }

  @Post('governance/clinical/release-gates/:gateId/decision')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.CONFIGURE_SYSTEM, Permission.VIEW_AUDIT_LOGS)
  async decideClinicalReleaseGate(
    @Param('gateId') gateId: string,
    @Body() body: GovernanceDecisionDto,
  ) {
    if (this.platformGovernanceService) {
      const result = await this.platformGovernanceService.decideReleaseGate(gateId, { ...body });
      if (result) return result;
    }
    return this.platformSystemsService.demo('clinical-release-gates', gateId, { ...body });
  }

  @Get('governance/clinical/safety-findings')
  @Permissions(Permission.VIEW_AUDIT_LOGS)
  async getGovernanceSafetyFindings() {
    if (this.platformGovernanceService) {
      return this.platformGovernanceService.listSafetyFindings();
    }
    return this.platformSystemsService.demo('clinical-safety-findings');
  }

  @Post('governance/clinical/safety-findings/:findingId/review')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.VIEW_AUDIT_LOGS)
  async reviewGovernanceSafetyFinding(
    @Param('findingId') findingId: string,
    @Body() body: GovernanceDecisionDto,
  ) {
    if (this.platformGovernanceService) {
      const result = await this.platformGovernanceService.reviewSafetyFinding(findingId, {
        ...body,
      });
      if (result) return result;
    }
    return this.platformSystemsService.demo('clinical-safety-findings', findingId, { ...body });
  }

  @Get('governance/ai/policies')
  @Permissions(Permission.CONFIGURE_SYSTEM, Permission.VIEW_AUDIT_LOGS)
  getAiPolicies() {
    return this.platformSystemsService.demo('ai-governance');
  }

  @Put('governance/ai/policies/:policyId')
  @Permissions(Permission.CONFIGURE_SYSTEM, Permission.VIEW_AUDIT_LOGS)
  updateAiPolicy(@Param('policyId') policyId: string, @Body() body: GovernanceConfigUpdateDto) {
    return this.platformSystemsService.demo('ai-governance', policyId, { ...body });
  }

  @Get('governance/ai-security/summary')
  @Permissions(Permission.CONFIGURE_SYSTEM, Permission.MANAGE_ENCRYPTION)
  getAiSecuritySummary() {
    return this.platformSystemsService.demo('ai-security');
  }

  @Get('governance/ai-security/rules')
  @Permissions(Permission.CONFIGURE_SYSTEM, Permission.MANAGE_ENCRYPTION)
  getPromptFirewallRules() {
    return this.platformSystemsService.demo('prompt-firewall');
  }

  @Put('governance/ai-security/rules/:ruleId')
  @Permissions(Permission.CONFIGURE_SYSTEM, Permission.MANAGE_ENCRYPTION)
  updatePromptFirewallRule(
    @Param('ruleId') ruleId: string,
    @Body() body: GovernanceConfigUpdateDto,
  ) {
    return this.platformSystemsService.demo('prompt-firewall', ruleId, { ...body });
  }

  @Post('governance/ai-security/evaluate')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.CONFIGURE_SYSTEM, Permission.MANAGE_ENCRYPTION)
  async evaluatePromptSecurity(@Body() body: EvaluateGateDto) {
    if (this.platformGovernanceService) {
      return this.platformGovernanceService.evaluateGate({
        runId: String(body.runId || 'security-evaluation'),
        capabilityId: String(body.capabilityId || 'ai-security'),
        patientId: body.patientId ? String(body.patientId) : undefined,
        phiAccessed: Boolean(body.phiAccessed),
        prompt: String(body.prompt || body.input || ''),
        action: 'ai-security/evaluate',
      });
    }
    return this.platformSystemsService.demo('prompt-firewall', 'evaluation', { ...body });
  }

  @Get('governance/ai-security/model-access')
  @Permissions(Permission.CONFIGURE_SYSTEM, Permission.MANAGE_ENCRYPTION)
  getModelAccessPolicies() {
    return this.platformSystemsService.demo('model-access-policy');
  }

  @Put('governance/ai-security/model-access/:policyId')
  @Permissions(Permission.CONFIGURE_SYSTEM, Permission.MANAGE_ENCRYPTION)
  updateModelAccessPolicy(
    @Param('policyId') policyId: string,
    @Body() body: GovernanceConfigUpdateDto,
  ) {
    return this.platformSystemsService.demo('model-access-policy', policyId, { ...body });
  }

  @Get('governance/ai-security/incidents')
  @Permissions(Permission.CONFIGURE_SYSTEM, Permission.MANAGE_ENCRYPTION)
  getAiSecurityIncidents() {
    return this.platformSystemsService.demo('ai-security');
  }

  @Post('governance/ai-security/incidents/:incidentId/review')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.CONFIGURE_SYSTEM, Permission.MANAGE_ENCRYPTION)
  reviewAiSecurityIncident(
    @Param('incidentId') incidentId: string,
    @Body() body: GovernanceDecisionDto,
  ) {
    return this.platformSystemsService.demo('ai-security', incidentId, { ...body });
  }

  @Get('governance/model-usage/summary')
  @Permissions(Permission.VIEW_ANALYTICS)
  getModelUsageSummary() {
    return this.platformSystemsService.demo('model-usage-dashboard');
  }

  @Get('governance/model-usage/events')
  @Permissions(Permission.VIEW_ANALYTICS)
  getModelUsageEvents() {
    return this.platformSystemsService.demo('model-usage-dashboard');
  }

  @Get('governance/costs/summary')
  @Permissions(Permission.MANAGE_SUBSCRIPTIONS, Permission.VIEW_ANALYTICS)
  getCostSummary() {
    return this.platformSystemsService.demo('cost-optimization-control-plane');
  }

  @Put('governance/costs/budgets/:budgetId')
  @Permissions(Permission.MANAGE_SUBSCRIPTIONS, Permission.VIEW_ANALYTICS)
  updateCostBudget(@Param('budgetId') budgetId: string, @Body() body: GovernanceConfigUpdateDto) {
    return this.platformSystemsService.demo('cost-optimization-control-plane', budgetId, {
      ...body,
    });
  }

  @Get('governance/clinical-safety/findings')
  @Permissions(Permission.VIEW_AUDIT_LOGS)
  getClinicalSafetyFindings() {
    return this.platformSystemsService.demo('clinical-safety-audit');
  }

  @Post('governance/clinical-safety/findings/:findingId/review')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.VIEW_AUDIT_LOGS)
  reviewClinicalSafetyFinding(
    @Param('findingId') findingId: string,
    @Body() body: GovernanceDecisionDto,
  ) {
    return this.platformSystemsService.demo('clinical-safety-audit', findingId, { ...body });
  }

  @Get('consent/:patientId')
  @Permissions(Permission.MANAGE_CONSENT)
  async getConsent(@Param('patientId') patientId: string, @Req() req: any) {
    if (this.platformGovernanceService) {
      return this.platformGovernanceService.getConsent(
        patientId,
        req.tenantContext?.organizationId,
      );
    }
    return this.platformSystemsService.demo('consent-manager', patientId);
  }

  @Post('consent/:patientId')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.MANAGE_CONSENT)
  async updateConsent(
    @Param('patientId') patientId: string,
    @Body() body: ConsentActionDto,
    @Req() req: any,
  ) {
    if (this.platformGovernanceService) {
      return this.platformGovernanceService.upsertConsent(
        patientId,
        String(body.scope || 'clinical_ai'),
        body,
        req.tenantContext?.organizationId,
      );
    }
    return this.platformSystemsService.demo('consent-manager', patientId, { ...body });
  }

  @Post('consent/:patientId/revoke')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.MANAGE_CONSENT)
  async revokeConsent(
    @Param('patientId') patientId: string,
    @Body() body: ConsentActionDto,
    @Req() req: any,
  ) {
    if (this.platformGovernanceService) {
      return this.platformGovernanceService.upsertConsent(
        patientId,
        String(body.scope || 'clinical_ai'),
        {
          ...body,
          status: 'revoked',
        },
        req.tenantContext?.organizationId,
      );
    }
    return this.platformSystemsService.demo('consent-manager', patientId, { ...body });
  }

  @Get('privacy/access-log')
  @Permissions(Permission.MANAGE_PRIVACY)
  async getPrivacyAccessLog(@Req() req: any) {
    if (this.platformGovernanceService) {
      return this.platformGovernanceService.getPrivacyAccessLog(
        undefined,
        req.tenantContext?.organizationId,
      );
    }
    return this.platformSystemsService.demo('privacy-center');
  }

  @Get('privacy/patient/:patientId/access-log')
  @Permissions(Permission.MANAGE_PRIVACY, Permission.READ_PHI)
  async getPatientPrivacyAccessLog(@Param('patientId') patientId: string, @Req() req: any) {
    if (this.platformGovernanceService) {
      return this.platformGovernanceService.getPrivacyAccessLog(
        patientId,
        req.tenantContext?.organizationId,
      );
    }
    return this.platformSystemsService.demo('privacy-center', patientId);
  }

  @Post('privacy/export')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.MANAGE_PRIVACY)
  async requestPrivacyExport(@Body() body: PrivacyRequestDto, @Req() req: any) {
    if (this.platformGovernanceService) {
      return this.platformGovernanceService.createPrivacyRequest(
        String(body.patientId || 'demo-patient'),
        'export',
        body,
        req.tenantContext?.organizationId,
      );
    }
    return this.platformSystemsService.demo('privacy-center', 'privacy-export', { ...body });
  }

  @Post('privacy/delete-request')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.MANAGE_PRIVACY)
  async requestPrivacyDelete(@Body() body: PrivacyRequestDto, @Req() req: any) {
    if (this.platformGovernanceService) {
      return this.platformGovernanceService.createPrivacyRequest(
        String(body.patientId || 'demo-patient'),
        'delete',
        body,
        req.tenantContext?.organizationId,
      );
    }
    return this.platformSystemsService.demo('privacy-center', 'privacy-delete-request', {
      ...body,
    });
  }

  @Get('privacy/requests')
  @Permissions(Permission.MANAGE_PRIVACY)
  async getPrivacyRequests(@Req() req: any) {
    if (this.platformGovernanceService) {
      return this.platformGovernanceService.listPrivacyRequests(
        undefined,
        req.tenantContext?.organizationId,
      );
    }
    return this.platformSystemsService.demo('privacy-center', 'privacy-requests');
  }

  @Post('privacy/requests/:requestId/review')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.MANAGE_PRIVACY, Permission.VIEW_AUDIT_LOGS)
  async reviewPrivacyRequest(
    @Param('requestId') requestId: string,
    @Body() body: GovernanceDecisionDto,
    @Req() req: any,
  ) {
    if (this.platformGovernanceService) {
      const result = await this.platformGovernanceService.reviewPrivacyRequest(
        requestId,
        { ...body },
        req.tenantContext?.organizationId,
      );
      if (result) return result;
    }
    return this.platformSystemsService.demo('privacy-center', requestId, { ...body });
  }

  @Get('governance/regulatory/capabilities')
  @Permissions(Permission.CONFIGURE_SYSTEM, Permission.VIEW_AUDIT_LOGS)
  getRegulatoryCapabilities() {
    return this.platformSystemsService.demo('regulatory-classification');
  }

  @Get('governance/regulatory/capabilities/:capabilityId')
  @Permissions(Permission.CONFIGURE_SYSTEM, Permission.VIEW_AUDIT_LOGS)
  getRegulatoryCapability(@Param('capabilityId') capabilityId: string) {
    return this.platformSystemsService.demo('regulatory-classification', capabilityId);
  }

  @Put('governance/regulatory/capabilities/:capabilityId/classification')
  @Permissions(Permission.CONFIGURE_SYSTEM, Permission.VIEW_AUDIT_LOGS)
  updateRegulatoryClassification(
    @Param('capabilityId') capabilityId: string,
    @Body() body: UpdateRegulatoryClassificationDto,
  ) {
    return this.platformSystemsService.demo('regulatory-classification', capabilityId, { ...body });
  }

  @Post('governance/regulatory/capabilities/:capabilityId/approve')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.CONFIGURE_SYSTEM, Permission.VIEW_AUDIT_LOGS)
  approveRegulatoryClassification(
    @Param('capabilityId') capabilityId: string,
    @Body() body: GovernanceDecisionDto,
  ) {
    return this.platformSystemsService.demo('regulatory-classification', capabilityId, { ...body });
  }

  @Get('governance/regulatory/evidence/:capabilityId')
  @Permissions(Permission.CONFIGURE_SYSTEM, Permission.VIEW_AUDIT_LOGS)
  getRegulatoryEvidence(@Param('capabilityId') capabilityId: string) {
    return this.platformSystemsService.demo('intended-use-registry', capabilityId);
  }

  @Post('governance/regulatory/evidence/:capabilityId/artifacts')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.CONFIGURE_SYSTEM, Permission.VIEW_AUDIT_LOGS)
  createRegulatoryEvidenceArtifact(
    @Param('capabilityId') capabilityId: string,
    @Body() body: CreateRegulatoryEvidenceArtifactDto,
  ) {
    return this.platformSystemsService.demo('intended-use-registry', capabilityId, { ...body });
  }

  @Get('governance/equity/summary')
  @Permissions(Permission.VIEW_ANALYTICS, Permission.VIEW_AUDIT_LOGS)
  getEquitySummary() {
    return this.platformSystemsService.demo('equity-monitoring');
  }

  @Get('governance/equity/metrics')
  @Permissions(Permission.VIEW_ANALYTICS, Permission.VIEW_AUDIT_LOGS)
  getEquityMetrics() {
    return this.platformSystemsService.demo('equity-monitoring');
  }

  @Post('governance/equity/cohorts')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.VIEW_ANALYTICS, Permission.VIEW_AUDIT_LOGS)
  createEquityCohort(@Body() body: EquityCohortDto) {
    return this.platformSystemsService.demo('equity-monitoring', 'cohort', { ...body });
  }

  @Get('governance/equity/cohorts')
  @Permissions(Permission.VIEW_ANALYTICS, Permission.VIEW_AUDIT_LOGS)
  getEquityCohorts() {
    return this.platformSystemsService.demo('equity-monitoring');
  }

  @Get('governance/equity/findings')
  @Permissions(Permission.VIEW_ANALYTICS, Permission.VIEW_AUDIT_LOGS)
  getBiasFindings() {
    return this.platformSystemsService.demo('bias-finding-review');
  }

  @Post('governance/equity/findings/:findingId/review')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.VIEW_ANALYTICS, Permission.VIEW_AUDIT_LOGS)
  reviewBiasFinding(@Param('findingId') findingId: string, @Body() body: GovernanceDecisionDto) {
    return this.platformSystemsService.demo('bias-finding-review', findingId, { ...body });
  }

  @Post('governance/equity/reports')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.VIEW_ANALYTICS, Permission.VIEW_AUDIT_LOGS)
  createEquityReport(@Body() body: EquityReportDto) {
    return this.platformSystemsService.demo('equity-monitoring', 'report', { ...body });
  }

  @Get('governance/validation/scenarios')
  @Permissions(Permission.CONFIGURE_SYSTEM, Permission.VIEW_AUDIT_LOGS)
  async getValidationScenarios() {
    if (this.platformGovernanceService) {
      return this.platformGovernanceService.listValidationScenarios();
    }
    return this.platformSystemsService.demo('validation-sandbox');
  }

  @Post('governance/validation/scenarios')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.CONFIGURE_SYSTEM, Permission.VIEW_AUDIT_LOGS)
  async createValidationScenario(@Body() body: CreateValidationScenarioDto) {
    if (this.platformGovernanceService) {
      return this.platformGovernanceService.createValidationScenario({ ...body });
    }
    return this.platformSystemsService.demo('validation-sandbox', 'scenario', { ...body });
  }

  @Get('governance/validation/synthetic-patients')
  @Permissions(Permission.CONFIGURE_SYSTEM, Permission.VIEW_AUDIT_LOGS)
  getSyntheticPatients() {
    return {
      patients: [
        this.platformGovernanceService?.syntheticFhirBundle() ??
          this.platformSystemsService.demo('synthetic-patient-lab'),
      ],
      synthetic: true,
    };
  }

  @Post('governance/validation/runs')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.CONFIGURE_SYSTEM, Permission.VIEW_AUDIT_LOGS)
  async createValidationRun(@Body() body: CreateValidationRunDto) {
    if (this.platformGovernanceService) {
      const runId = String(body.runId || `validation-${Date.now()}`);
      const gate = await this.platformGovernanceService.createReleaseGate({
        capabilityId: String(body.capabilityId || 'clinical-governance'),
        changeType: String(body.changeType || 'validation'),
        artifactVersion: body.artifactVersion || body.version,
        riskLevel: String(body.riskLevel || 'high'),
        validationRunId: runId,
      });
      return {
        runId,
        status: 'release_gate_opened',
        gate,
        synthetic: true,
      };
    }
    return this.platformSystemsService.demo('validation-sandbox', 'run', { ...body });
  }

  @Get('governance/validation/runs/:runId')
  @Permissions(Permission.CONFIGURE_SYSTEM, Permission.VIEW_AUDIT_LOGS)
  getValidationRun(@Param('runId') runId: string) {
    return this.platformSystemsService.demo('validation-sandbox', runId);
  }

  @Post('governance/validation/runs/:runId/approve')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.CONFIGURE_SYSTEM, Permission.VIEW_AUDIT_LOGS)
  approveValidationRun(@Param('runId') runId: string, @Body() body: GovernanceDecisionDto) {
    return this.platformSystemsService.demo('validation-sandbox', runId, { ...body });
  }

  @Get('governance/validation/release-gates/:capabilityId')
  @Permissions(Permission.CONFIGURE_SYSTEM, Permission.VIEW_AUDIT_LOGS)
  async getValidationReleaseGate(@Param('capabilityId') capabilityId: string) {
    if (this.platformGovernanceService) {
      return this.platformGovernanceService.listReleaseGates(capabilityId);
    }
    return this.platformSystemsService.demo('clinical-release-gates', capabilityId);
  }

  @Get('review/items')
  @Permissions(Permission.VIEW_AUDIT_LOGS)
  async getReviewItems(@Req() req: any) {
    if (this.platformGovernanceService) {
      return this.platformGovernanceService.listReviewItems(req.tenantContext?.organizationId);
    }
    return this.platformSystemsService.getReviewItems();
  }

  @Post('review/items')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.VIEW_AUDIT_LOGS)
  async createReviewItem(@Body() body: CreateReviewItemDto, @Req() req: any) {
    if (this.platformGovernanceService) {
      // HEAL-347.58: previously trusted CreateReviewItemDto's own
      // client-settable organizationId verbatim -- same anti-pattern
      // already fixed once for this exact route on the sibling
      // PlatformGovernanceController (HEAL-347.22).
      return this.platformGovernanceService.createReviewItem({
        ...body,
        organizationId: req.tenantContext?.organizationId,
      });
    }
    return this.platformSystemsService.demo('human-review-queue', 'review-item', { ...body });
  }

  @Get('review/items/:itemId')
  @Permissions(Permission.VIEW_AUDIT_LOGS)
  async getReviewItem(@Param('itemId') itemId: string, @Req() req: any) {
    if (this.platformGovernanceService) {
      const item = await this.platformGovernanceService.getReviewItem(
        itemId,
        req.tenantContext?.organizationId,
      );
      if (item) return item;
    }
    return this.platformSystemsService.demo('human-review-queue', itemId);
  }

  @Post('review/items/:itemId/assign')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.VIEW_AUDIT_LOGS)
  assignReviewItem(@Param('itemId') itemId: string, @Body() body: GovernanceDecisionDto) {
    return this.platformSystemsService.demo('human-review-queue', itemId, { ...body });
  }

  @Post('review/items/:itemId/decision')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.VIEW_AUDIT_LOGS)
  async decideReviewItem(
    @Param('itemId') itemId: string,
    @Body() body: GovernanceDecisionDto,
    @Req() req: any,
  ) {
    if (this.platformGovernanceService) {
      const result = await this.platformGovernanceService.decideReviewItem(
        itemId,
        { ...body },
        req.tenantContext?.organizationId,
      );
      if (result) return result;
    }
    return this.platformSystemsService.demo('human-review-queue', itemId, { ...body });
  }

  @Post('review/items/:itemId/comments')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.VIEW_AUDIT_LOGS)
  commentOnReviewItem(@Param('itemId') itemId: string, @Body() body: GovernanceDecisionDto) {
    return this.platformSystemsService.demo('human-review-queue', itemId, { ...body });
  }

  @Get('patients/:patientId/review-items')
  @Permissions(Permission.READ_PHI, Permission.VIEW_AUDIT_LOGS)
  async getPatientReviewItems(@Param('patientId') patientId: string, @Req() req: any) {
    if (this.platformGovernanceService) {
      return this.platformGovernanceService.listPatientReviewItems(
        patientId,
        req.tenantContext?.organizationId,
      );
    }
    return this.platformSystemsService.demo('human-review-queue', patientId);
  }

  @Get('audit/events')
  @Permissions(Permission.VIEW_AUDIT_LOGS)
  getAuditEvents() {
    return this.platformSystemsService.demo('audit-trail-spine');
  }

  @Get('audit/events/:eventId')
  @Permissions(Permission.VIEW_AUDIT_LOGS)
  getAuditEvent(@Param('eventId') eventId: string) {
    return this.platformSystemsService.demo('audit-trail-spine', eventId);
  }

  @Get('audit/runs/:runId')
  @Permissions(Permission.VIEW_AUDIT_LOGS)
  async getAuditRunTimeline(@Param('runId') runId: string, @Req() req: any) {
    if (this.platformGovernanceService) {
      await this.platformGovernanceService.recordObservabilityEvent({
        organizationId: req.tenantContext?.organizationId,
        correlationId: runId,
        capabilityId: 'ai-run-audit-timeline',
        eventType: 'audit.ai_run.timeline_viewed',
        status: 'viewed',
      });
    }
    return this.platformSystemsService.getAuditRunTimeline(runId);
  }

  @Get('audit/patients/:patientId/access')
  @Permissions(Permission.VIEW_AUDIT_LOGS, Permission.READ_PHI)
  async getPatientAuditAccess(@Param('patientId') patientId: string, @Req() req: any) {
    if (this.platformGovernanceService) {
      return this.platformGovernanceService.getPrivacyAccessLog(
        patientId,
        req.tenantContext?.organizationId,
      );
    }
    return this.platformSystemsService.demo('audit-trail-spine', patientId);
  }

  @Get('audit/integrity/status')
  @Permissions(Permission.VERIFY_AUDIT_INTEGRITY)
  async getAuditIntegrityStatus(@Req() req: any) {
    if (this.platformGovernanceService) {
      await this.platformGovernanceService.recordObservabilityEvent({
        organizationId: req.tenantContext?.organizationId,
        capabilityId: 'audit-trail-spine',
        eventType: 'audit.integrity.checked',
        status: 'checked',
      });
    }
    return this.platformSystemsService.getAuditIntegrityStatus();
  }

  @Post('audit/integrity/verify')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.VERIFY_AUDIT_INTEGRITY)
  verifyAuditIntegrityPlaceholder(@Body() body: AuditPlaceholderDto) {
    return this.platformSystemsService.demo('audit-trail-spine', 'integrity-verify', { ...body });
  }

  @Post('audit/export')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.EXPORT_AUDIT_LOGS)
  exportAuditPlaceholder(@Body() body: AuditPlaceholderDto) {
    return this.platformSystemsService.demo('audit-trail-spine', 'audit-export', { ...body });
  }

  @Get('operations/health')
  @Permissions(Permission.VIEW_ANALYTICS)
  async getOperationsHealth(@Req() req: any) {
    if (this.platformGovernanceService) {
      return this.platformGovernanceService.recentObservability(req.tenantContext?.organizationId);
    }
    return this.platformSystemsService.getOperationsHealth();
  }

  @Get('operations/service-health')
  @Permissions(Permission.VIEW_ANALYTICS)
  async getServiceHealth(@Req() req: any) {
    return this.getOperationsHealth(req);
  }

  @Get('operations/observability/summary')
  @Permissions(Permission.VIEW_ANALYTICS)
  async getObservabilitySummary(@Req() req: any) {
    if (this.platformGovernanceService) {
      return this.platformGovernanceService.recentObservability(req.tenantContext?.organizationId);
    }
    return this.platformSystemsService.getObservabilitySummary();
  }

  @Get('operations/observability/ai-runs')
  @Permissions(Permission.VIEW_ANALYTICS)
  getAiRunMetrics() {
    return this.platformSystemsService.demo('deployment-observability');
  }

  @Get('operations/observability/orchestrator')
  @Permissions(Permission.VIEW_ANALYTICS)
  getOrchestratorMetrics() {
    return this.platformSystemsService.demo('deployment-observability');
  }

  @Get('operations/observability/integrations')
  @Permissions(Permission.VIEW_ANALYTICS)
  getIntegrationHealth() {
    return this.platformSystemsService.demo('deployment-observability');
  }

  @Get('operations/deployments/current')
  @Permissions(Permission.VIEW_ANALYTICS)
  getCurrentDeployment() {
    return this.platformSystemsService.demo('deployment-observability');
  }

  @Get('operations/incidents')
  @Permissions(Permission.VIEW_ANALYTICS)
  getOperationsIncidents() {
    return this.platformSystemsService.demo('operations-incident-center');
  }

  @Post('operations/incidents/:incidentId/review')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.VIEW_ANALYTICS)
  reviewOperationsIncident(
    @Param('incidentId') incidentId: string,
    @Body() body: GovernanceDecisionDto,
  ) {
    return this.platformSystemsService.demo('operations-incident-center', incidentId, { ...body });
  }
}
