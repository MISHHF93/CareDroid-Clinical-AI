import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { PlatformSystemsService } from './platform-systems.service';

@ApiTags('platform-systems')
@ApiBearerAuth()
@Controller()
@UseGuards(AuthGuard('jwt'), AuthorizationGuard)
export class PlatformSystemsController {
  constructor(private readonly platformSystemsService: PlatformSystemsService) {}

  @Get('platform-systems/capabilities/:capabilityId')
  @Permissions(Permission.USE_AI_CHAT)
  @ApiOperation({ summary: 'Get a platform capability contract and demo safety state' })
  getCapability(@Param('capabilityId') capabilityId: string) {
    return this.platformSystemsService.getCapability(capabilityId);
  }

  @Get('platform-systems/packs/:pack')
  @Permissions(Permission.USE_AI_CHAT)
  @ApiOperation({ summary: 'Get platform pack capability contracts' })
  getPack(@Param('pack') pack: string) {
    return this.platformSystemsService.getPack(pack);
  }

  @Get('integrations/fhir/connections')
  @Permissions(Permission.CONFIGURE_SYSTEM)
  getFhirConnections() {
    return this.platformSystemsService.getFhirConnections();
  }

  @Post('integrations/fhir/connections')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.CONFIGURE_SYSTEM)
  createFhirConnection(@Body() body: Record<string, unknown>) {
    return this.platformSystemsService.demo('fhir-connector', 'demo-patient', body);
  }

  @Post('integrations/fhir/:connectionId/test')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.CONFIGURE_SYSTEM)
  testFhirConnection(
    @Param('connectionId') connectionId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.platformSystemsService.demo('fhir-connector', connectionId, body);
  }

  @Post('integrations/fhir/:connectionId/sync')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.CONFIGURE_SYSTEM)
  syncFhirConnection(
    @Param('connectionId') connectionId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.platformSystemsService.demo('fhir-connector', connectionId, body);
  }

  @Get('integrations/hl7/interfaces')
  @Permissions(Permission.CONFIGURE_SYSTEM)
  getHl7Interfaces() {
    return this.platformSystemsService.getHl7Interfaces();
  }

  @Post('integrations/hl7/interfaces/:interfaceId/test-message')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.CONFIGURE_SYSTEM)
  testHl7Message(@Param('interfaceId') interfaceId: string, @Body() body: Record<string, unknown>) {
    return this.platformSystemsService.demo('hl7-bridge', interfaceId, body);
  }

  @Post('patients/import/ehr')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.READ_PHI, Permission.WRITE_PHI)
  importEhrPatient(@Body() body: Record<string, unknown>) {
    return this.platformSystemsService.demo('ehr-patient-import', 'demo-patient', body);
  }

  @Post('patients/:patientId/import/labs')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.READ_PHI, Permission.WRITE_PHI)
  importLabs(@Param('patientId') patientId: string, @Body() body: Record<string, unknown>) {
    return this.platformSystemsService.demo('lab-result-import', patientId, body);
  }

  @Post('patients/:patientId/import/medications')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.READ_PHI, Permission.WRITE_PHI)
  importMedications(@Param('patientId') patientId: string, @Body() body: Record<string, unknown>) {
    return this.platformSystemsService.demo('medication-list-import', patientId, body);
  }

  @Post('patients/:patientId/import/observations')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.READ_PHI, Permission.WRITE_PHI)
  importObservations(@Param('patientId') patientId: string, @Body() body: Record<string, unknown>) {
    return this.platformSystemsService.demo('observation-vitals-import', patientId, body);
  }

  @Get('patients/:patientId/workspace')
  @Permissions(Permission.READ_PHI)
  getPatientWorkspace(@Param('patientId') patientId: string) {
    return this.platformSystemsService.getPatientWorkspace(patientId);
  }

  @Get('patients/:patientId/summary')
  @Permissions(Permission.READ_PHI)
  getPatientSummaryShell(@Param('patientId') patientId: string) {
    return this.platformSystemsService.demo('patient-summary-ai', patientId);
  }

  @Get('patients/:patientId/timeline')
  @Permissions(Permission.READ_PHI)
  getTimeline(@Param('patientId') patientId: string) {
    return this.platformSystemsService.getTimeline(patientId);
  }

  @Post('patients/:patientId/events')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.READ_PHI, Permission.WRITE_PHI)
  createPatientEvent(@Param('patientId') patientId: string, @Body() body: Record<string, unknown>) {
    return this.platformSystemsService.demo('clinical-event-ai', patientId, body);
  }

  @Get('patients/:patientId/risk-scores')
  @Permissions(Permission.READ_PHI)
  getRiskScores(@Param('patientId') patientId: string) {
    return this.platformSystemsService.getRiskScores(patientId);
  }

  @Post('patients/:patientId/risk-scores')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.READ_PHI, Permission.WRITE_PHI)
  addRiskScore(@Param('patientId') patientId: string, @Body() body: Record<string, unknown>) {
    return this.platformSystemsService.demo('risk-score-history', patientId, body);
  }

  @Get('patients/:patientId/care-plan')
  @Permissions(Permission.READ_PHI)
  getCarePlan(@Param('patientId') patientId: string) {
    return this.platformSystemsService.getCarePlan(patientId);
  }

  @Post('clinical-intelligence/calculator-recommender/suggest')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.READ_PHI, Permission.USE_AI_CHAT)
  suggestCalculator(@Body() body: Record<string, unknown>) {
    return this.platformSystemsService.demo('calculator-recommender-ai', 'demo-patient', body);
  }

  @Post('clinical-intelligence/workflow-builder/generate')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.READ_PHI, Permission.USE_AI_CHAT)
  generateWorkflow(@Body() body: Record<string, unknown>) {
    return this.platformSystemsService.demo('workflow-builder-ai', 'demo-patient', body);
  }

  @Post('clinical-intelligence/reasoning/analyze')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.READ_PHI, Permission.USE_AI_CHAT)
  analyzeReasoning(@Body() body: Record<string, unknown>) {
    return this.platformSystemsService.demo('clinical-reasoning-engine', 'demo-patient', body);
  }

  @Post('clinical-intelligence/why-engine/explain')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.READ_PHI, Permission.USE_AI_CHAT)
  explainWhy(@Body() body: Record<string, unknown>) {
    return this.platformSystemsService.demo('why-engine', 'demo-patient', body);
  }

  @Post('clinical-intelligence/audit-trail/summarize')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.VIEW_AUDIT_LOGS, Permission.USE_AI_CHAT)
  summarizeAuditTrail(@Body() body: Record<string, unknown>) {
    return this.platformSystemsService.demo('audit-trail-ai', 'demo-patient', body);
  }

  @Post('clinical-intelligence/clinical-event-ai/draft')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.READ_PHI, Permission.USE_AI_CHAT)
  draftClinicalEvent(@Body() body: Record<string, unknown>) {
    return this.platformSystemsService.demo('clinical-event-ai', 'demo-patient', body);
  }

  @Post('documentation/soap/draft')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.READ_PHI, Permission.USE_AI_CHAT)
  draftSoap(@Body() body: Record<string, unknown>) {
    return this.platformSystemsService.demo('soap-builder', 'demo-patient', body);
  }

  @Post('documentation/dictation/transcribe')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.READ_PHI, Permission.USE_AI_CHAT)
  transcribeDictation(@Body() body: Record<string, unknown>) {
    return this.platformSystemsService.demo('clinical-dictation', 'demo-patient', body);
  }

  @Post('documentation/discharge-summary/draft')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.READ_PHI, Permission.USE_AI_CHAT)
  draftDischargeSummary(@Body() body: Record<string, unknown>) {
    return this.platformSystemsService.demo('discharge-summary-ai', 'demo-patient', body);
  }

  @Post('documentation/referral/draft')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.READ_PHI, Permission.USE_AI_CHAT)
  draftReferral(@Body() body: Record<string, unknown>) {
    return this.platformSystemsService.demo('referral-ai', 'demo-patient', body);
  }

  @Post('documentation/prior-auth/draft')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.READ_PHI, Permission.USE_AI_CHAT)
  draftPriorAuth(@Body() body: Record<string, unknown>) {
    return this.platformSystemsService.demo('prior-auth-ai', 'demo-patient', body);
  }

  @Post('documentation/:documentId/approve')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.READ_PHI, Permission.WRITE_PHI)
  approveDocument(@Param('documentId') documentId: string, @Body() body: Record<string, unknown>) {
    return this.platformSystemsService.demo('soap-builder', documentId, body);
  }

  @Post('documentation/:documentId/export')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.READ_PHI, Permission.EXPORT_PHI)
  exportDocument(@Param('documentId') documentId: string, @Body() body: Record<string, unknown>) {
    return this.platformSystemsService.demo('soap-builder', documentId, body);
  }

  @Get('governance/ai/policies')
  @Permissions(Permission.CONFIGURE_SYSTEM, Permission.VIEW_AUDIT_LOGS)
  getAiPolicies() {
    return this.platformSystemsService.demo('ai-governance');
  }

  @Put('governance/ai/policies/:policyId')
  @Permissions(Permission.CONFIGURE_SYSTEM, Permission.VIEW_AUDIT_LOGS)
  updateAiPolicy(@Param('policyId') policyId: string, @Body() body: Record<string, unknown>) {
    return this.platformSystemsService.demo('ai-governance', policyId, body);
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
  updateCostBudget(@Param('budgetId') budgetId: string, @Body() body: Record<string, unknown>) {
    return this.platformSystemsService.demo('cost-optimization-control-plane', budgetId, body);
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
    @Body() body: Record<string, unknown>,
  ) {
    return this.platformSystemsService.demo('clinical-safety-audit', findingId, body);
  }

  @Get('consent/:patientId')
  @Permissions(Permission.MANAGE_CONSENT)
  getConsent(@Param('patientId') patientId: string) {
    return this.platformSystemsService.demo('consent-manager', patientId);
  }

  @Post('consent/:patientId')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.MANAGE_CONSENT)
  updateConsent(@Param('patientId') patientId: string, @Body() body: Record<string, unknown>) {
    return this.platformSystemsService.demo('consent-manager', patientId, body);
  }

  @Post('consent/:patientId/revoke')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.MANAGE_CONSENT)
  revokeConsent(@Param('patientId') patientId: string, @Body() body: Record<string, unknown>) {
    return this.platformSystemsService.demo('consent-manager', patientId, body);
  }

  @Get('privacy/access-log')
  @Permissions(Permission.MANAGE_PRIVACY)
  getPrivacyAccessLog() {
    return this.platformSystemsService.demo('privacy-center');
  }

  @Post('privacy/export')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.MANAGE_PRIVACY)
  requestPrivacyExport(@Body() body: Record<string, unknown>) {
    return this.platformSystemsService.demo('privacy-center', 'privacy-export', body);
  }

  @Post('privacy/delete-request')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.MANAGE_PRIVACY)
  requestPrivacyDelete(@Body() body: Record<string, unknown>) {
    return this.platformSystemsService.demo('privacy-center', 'privacy-delete-request', body);
  }
}
