import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Optional,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { PlatformSystemsService } from './platform-systems.service';
import { PlatformGovernanceService } from '../platform-governance';
import {
  EmergencyPatientService,
  ReferralService,
  EMSIntakeService,
} from '../emergency-os/emergency-os.services';

@ApiTags('platform-systems')
@ApiBearerAuth()
@Controller()
@UseGuards(AuthGuard('jwt'), AuthorizationGuard)
export class PlatformSystemsController {
  constructor(
    private readonly platformSystemsService: PlatformSystemsService,
    private readonly emergencyPatientService: EmergencyPatientService,
    private readonly referralService: ReferralService,
    private readonly emsIntakeService: EMSIntakeService,
    @Optional() private readonly platformGovernanceService?: PlatformGovernanceService,
  ) {}

  @Get('patients')
  @Permissions(Permission.READ_PHI)
  @ApiOperation({ summary: 'Get CareDroid patients for the active tenant workspace' })
  getEmergencyPatients() {
    return this.emergencyPatientService.listPatients();
  }

  @Get('patients/:patientId')
  @Permissions(Permission.READ_PHI)
  @ApiOperation({ summary: 'Get one CareDroid patient by id' })
  getEmergencyPatient(@Param('patientId') patientId: string) {
    const patient = this.emergencyPatientService.getPatient(patientId);
    if (!patient) {
      throw new NotFoundException(`Emergency patient ${patientId} was not found`);
    }
    return patient;
  }

  @Post('patients')
  @Permissions(Permission.READ_PHI, Permission.WRITE_PHI)
  @ApiOperation({ summary: 'Create an CareDroid intake patient' })
  createEmergencyPatient(@Body() body: Record<string, any>) {
    if (!body?.chiefComplaint && !body?.complaint) {
      throw new BadRequestException('chiefComplaint or complaint is required');
    }
    return this.emergencyPatientService.createPatient({
      ...body,
      chiefComplaint: body.chiefComplaint || body.complaint,
    });
  }

  @Patch('patients/:patientId')
  @Permissions(Permission.READ_PHI, Permission.WRITE_PHI)
  @ApiOperation({ summary: 'Patch an CareDroid patient' })
  updateEmergencyPatient(@Param('patientId') patientId: string, @Body() body: Record<string, any>) {
    try {
      return this.emergencyPatientService.updatePatient(patientId, body);
    } catch {
      throw new NotFoundException(`Emergency patient ${patientId} was not found`);
    }
  }

  @Get('staff')
  @Permissions(Permission.READ_PHI)
  @ApiOperation({ summary: 'Get CareDroid staff roster' })
  getEmergencyStaff() {
    return this.emergencyPatientService.listStaff();
  }

  @Get('rooms')
  @Permissions(Permission.READ_PHI)
  @ApiOperation({ summary: 'Get CareDroid room grid' })
  getEmergencyRooms() {
    return this.emergencyPatientService.listRooms();
  }

  @Get('shift')
  @Permissions(Permission.READ_PHI)
  @ApiOperation({ summary: 'Get active CareDroid shift' })
  getEmergencyShift() {
    const staff = this.emergencyPatientService.listStaff();
    const onShift = staff.filter((member) => member.active);
    return {
      id: 'active-shift',
      name: 'Active ED Shift',
      status: onShift.length ? 'Active' : 'Unstaffed',
      chargeStaffId: onShift[0]?.id ?? null,
      staffIds: onShift.map((member) => member.id),
      handoffNotes: [],
    };
  }

  @Get('ems')
  @Permissions(Permission.READ_PHI)
  @ApiOperation({ summary: 'Get CareDroid EMS unit and arrival state' })
  getEmergencyEms() {
    return this.emsIntakeService.getEMSIntake();
  }

  @Get('referrals')
  @Permissions(Permission.READ_PHI)
  @ApiOperation({ summary: 'Get CareDroid referrals' })
  getEmergencyReferrals() {
    return this.referralService.getReferrals();
  }

  @Post('referrals')
  @Permissions(Permission.READ_PHI, Permission.WRITE_PHI)
  @ApiOperation({ summary: 'Create an CareDroid referral' })
  createEmergencyReferral(@Body() body: Record<string, any>) {
    if (!body?.patientId) {
      throw new BadRequestException('patientId is required');
    }
    if (!this.emergencyPatientService.getPatient(body.patientId)) {
      throw new NotFoundException(`Emergency patient ${body.patientId} was not found`);
    }
    return this.referralService.createReferral(body).data.referral;
  }

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
  @Permissions(Permission.VIEW_INTEGRATIONS)
  getFhirConnections() {
    return this.platformSystemsService.getFhirConnections();
  }

  @Post('integrations/fhir/connections')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.MANAGE_INTEGRATIONS)
  createFhirConnection(@Body() body: Record<string, unknown>) {
    return this.platformSystemsService.demo('fhir-connector', 'demo-patient', body);
  }

  @Post('integrations/fhir/:connectionId/test')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.MANAGE_INTEGRATIONS)
  testFhirConnection(
    @Param('connectionId') connectionId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.platformSystemsService.demo('fhir-connector', connectionId, body);
  }

  @Post('integrations/fhir/:connectionId/sync')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.MANAGE_INTEGRATIONS)
  syncFhirConnection(
    @Param('connectionId') connectionId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.platformSystemsService.demo('fhir-connector', connectionId, body);
  }

  @Get('integrations/hl7/interfaces')
  @Permissions(Permission.VIEW_INTEGRATIONS)
  getHl7Interfaces() {
    return this.platformSystemsService.getHl7Interfaces();
  }

  @Post('integrations/hl7/interfaces/:interfaceId/test-message')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.MANAGE_INTEGRATIONS)
  testHl7Message(@Param('interfaceId') interfaceId: string, @Body() body: Record<string, unknown>) {
    return this.platformSystemsService.demo('hl7-bridge', interfaceId, body);
  }

  @Get('integrations/hl7/messages/quarantine')
  @Permissions(Permission.VIEW_INTEGRATIONS)
  getHl7MessageQuarantine() {
    return this.platformSystemsService.demo('hl7-bridge', 'quarantine');
  }

  @Post('integrations/hl7/messages/:messageId/replay-preview')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.MANAGE_INTEGRATIONS)
  previewHl7MessageReplay(
    @Param('messageId') messageId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.platformSystemsService.demo('hl7-bridge', messageId, {
      ...body,
      replayMode: 'preview_only',
      writebackAllowed: false,
    });
  }

  @Get('source-provenance/:sourceId')
  @Permissions(Permission.VIEW_INTEGRATIONS)
  async getSourceProvenance(@Param('sourceId') sourceId: string) {
    if (this.platformGovernanceService) {
      return this.platformGovernanceService.getSourceProvenance(sourceId);
    }
    return this.platformSystemsService.getSourceProvenance(sourceId);
  }

  @Post('patients/import/ehr')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.IMPORT_PATIENT_DATA)
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

  @Get('patients/:patientId/source-data')
  @Permissions(Permission.READ_PHI)
  async getPatientSourceData(@Param('patientId') patientId: string) {
    if (this.platformGovernanceService) {
      return this.platformGovernanceService.getPatientSourceData(patientId);
    }
    return this.platformSystemsService.getSourceProvenance(patientId);
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
}
